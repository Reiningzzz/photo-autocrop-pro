/**
 * face_orienter.js - 基于專案原生 Pico.js + facefinder 與 auto-image-rotator 的人臉精準擺正引擎
 * 
 * 核心資產結合：
 * 1. 調用 libs/pico.js 與 libs/facefinder 權重 (微型二元決策瀑布流，零開銷純前端)
 * 2. 結合 auto-image-rotator-master/rotate.py 的四方向人臉掃描邏輯 (0°, 90°, 180°, 270°)
 * 3. 雙層決策流水線：
 *    - 優先級 1：若任一旋轉方向檢測出真實人臉，以人臉朝向為唯一真理立即擺正！
 *    - 優先級 2：若為純風景/靜物 (無人臉)，自動切換至 orientation_scorer.js (光學天際線與重力特徵)
 */

(function () {
  'use strict';

  class FaceOrienter {
    constructor() {
      this.cascadeClassifier = null;
      this.isReady = false;
      this._initPromise = this._loadCascade();
    }

    async _loadCascade() {
      try {
        if (!window.pico || !window.pico.unpack_cascade) {
          console.warn('pico.js 尚未加載');
          return false;
        }

        const resp = await fetch('libs/facefinder');
        if (!resp.ok) throw new Error('無法加載 libs/facefinder');
        const buffer = await resp.arrayBuffer();
        const bytes = new Int8Array(buffer);
        this.cascadeClassifier = window.pico.unpack_cascade(bytes);
        this.isReady = true;
        return true;
      } catch (e) {
        console.warn('Pico 人臉模型載入失敗，將降級為物理光學擺正:', e);
        return false;
      }
    }

    async ready() {
      return this._initPromise;
    }

    /**
     * 檢測 Canvas 上的正臉數量與最大置信度
     * @param {HTMLCanvasElement} canvas
     * @returns {{ count: number, maxScore: number, dets: Array }}
     */
    detectFacesOnCanvas(canvas) {
      if (!this.isReady || !this.cascadeClassifier) {
        return { count: 0, maxScore: 0, dets: [] };
      }

      // 降採樣以求極致速度 (最長邊 300px)
      const maxDim = 300;
      const w = canvas.width;
      const h = canvas.height;
      const scale = Math.min(maxDim / w, maxDim / h, 1);
      const sw = Math.round(w * scale);
      const sh = Math.round(h * scale);

      const tc = document.createElement('canvas');
      tc.width = sw; tc.height = sh;
      const ctx = tc.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(canvas, 0, 0, sw, sh);

      const rgba = ctx.getImageData(0, 0, sw, sh).data;
      // 轉為單通道灰度
      const gray = new Uint8Array(sw * sh);
      for (let i = 0; i < sw * sh; i++) {
        gray[i] = (rgba[i * 4] * 299 + rgba[i * 4 + 1] * 587 + rgba[i * 4 + 2] * 114) / 1000;
      }

      const imageParams = {
        pixels: gray,
        nrows: sh,
        ncols: sw,
        ldim: sw
      };

      const params = {
        shiftfactor: 0.1, // 步長
        minsize: 20,      // 最小臉部尺寸
        maxsize: 200,     // 最大臉部尺寸
        scalefactor: 1.15 // 尺度增量
      };

      // 運行 Pico 級聯分類器
      let dets = window.pico.run_cascade(imageParams, this.cascadeClassifier, params);
      // NMS 非極大值抑制
      dets = window.pico.cluster_detections(dets, 0.2);
      // 過濾低分假陽性 (q > 15.0 為高置信度人臉)
      const confident = dets.filter(d => d[3] > 15.0);

      const maxScore = confident.reduce((max, d) => Math.max(max, d[3]), 0);
      return {
        count: confident.length,
        maxScore,
        dets: confident
      };
    }

    /**
     * 核心擺正決策：結合 auto-image-rotator 的四方向人臉掃描
     * @param {HTMLCanvasElement} sourceCanvas
     * @returns {Promise<{ bestAngle: number, method: 'face'|'optical', reason: string, facesCount: number }>}
     */
    async findBestOrientation(sourceCanvas) {
      await this.ready();

      const angles = [0, 90, 180, 270];
      const faceResults = {};

      // 1. 優先級 1：四個方向檢測真實人臉
      for (const ang of angles) {
        let testCanvas = sourceCanvas;
        if (ang !== 0 && window.photoDetector) {
          testCanvas = window.photoDetector.rotateCanvas(sourceCanvas, ang);
        }
        const res = this.detectFacesOnCanvas(testCanvas);
        faceResults[ang] = res;
      }

      // 尋找人臉最多且置信度最高的旋轉角度
      let bestFaceAngle = -1;
      let maxFaces = 0;
      let highestScore = 0;

      for (const ang of angles) {
        const r = faceResults[ang];
        if (r.count > maxFaces || (r.count === maxFaces && r.count > 0 && r.maxScore > highestScore)) {
          maxFaces = r.count;
          highestScore = r.maxScore;
          bestFaceAngle = ang;
        }
      }

      // 若在某個方向檢測出高置信度人臉，直接以人臉判定為正！
      if (bestFaceAngle !== -1 && maxFaces > 0) {
        return {
          bestAngle: bestFaceAngle,
          method: 'face',
          facesCount: maxFaces,
          reason: `👤 檢測到 ${maxFaces} 張正臉 (旋轉 ${bestFaceAngle}°) -> 以人臉為準轉正`
        };
      }

      // 2. 優先級 2：無人臉照片，僅在光學特徵具備強烈顯著性（置信度高）時才微調，否則堅決維持原角度！
      if (window.orientationScorer) {
        const opt = window.orientationScorer.detectOrientation(sourceCanvas);
        const s0 = opt.scores?.[0] ?? 0;
        const bestScore = opt.scores?.[opt.bestAngle] ?? 0;
        const margin = bestScore - s0;

        // 若最高分方向與 0° 差距顯著大於 40 分，判定為強天際線特徵
        if (opt.bestAngle !== 0 && margin > 40) {
          return {
            bestAngle: opt.bestAngle,
            method: 'optical',
            facesCount: 0,
            reason: `🏞️ 未檢測到正臉，依強烈天際線特徵轉正 (最佳 ${opt.bestAngle}°, 顯著度 +${margin.toFixed(1)})`
          };
        }
      }

      // 雜訊或特徵不明顯時，堅決維持原角度 0°，絕不隨機亂轉
      return { bestAngle: 0, method: 'none', facesCount: 0, reason: '特徵置信度不足，安全保持原方向' };
    }
  }

  window.faceOrienter = new FaceOrienter();

})();

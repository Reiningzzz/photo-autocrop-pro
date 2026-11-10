/**
 * orientation_scorer.js - 智慧照片方向與擺正評分引擎 (增強版)
 * 
 * 移植並強化自專案原生 C# 核心 OrientationScorer.cs
 * 核心原理：
 * 1. 光度重力差 (30%)：正常照片上方（天空/天花板）亮度顯著高於下方（地面/陰影）
 * 2. 天空/地面色度 (20%)：上方偏冷藍 (topBlueExcess)，下方偏暖黃紅 (btmWarmExcess)
 * 3. 膚色垂直重心 (35%)：人像照片中膚色高度集中於頂部 15%~45% 區間
 * 4. 重力邊緣能量 (15%)：垂直柱狀/人體邊緣能量 vs 水平線能量
 */

(function () {
  'use strict';

  function isSkin(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return (
      r > 90 && g > 35 && b > 20 &&
      (max - min > 15) &&
      Math.abs(r - g) > 12 &&
      r > g && r > b
    );
  }

  function getBrightness(r, g, b) {
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
  }

  /**
   * 評估特定方向下的物理合理度得分
   */
  function evaluatePose(imgData, angle) {
    const rawW = imgData.width;
    const rawH = imgData.height;
    const data = imgData.data;

    const isSwap = (angle === 90 || angle === 270);
    const w = isSwap ? rawH : rawW;
    const h = isSwap ? rawW : rawH;

    // 座標映射：新姿態 (x, y) 映射回原始 raw (rx, ry)
    function mapCoord(x, y) {
      if (angle === 0) return { rx: x, ry: y };
      if (angle === 90) return { rx: y, ry: rawH - 1 - x };
      if (angle === 180) return { rx: rawW - 1 - x, ry: rawH - 1 - y };
      return { rx: rawW - 1 - y, ry: x }; // 270
    }

    let topBri = 0, btmBri = 0;
    let topPix = 0, btmPix = 0;
    let topBlueExcess = 0;
    let btmWarmExcess = 0;
    let skinSumY = 0;
    let skinSumX = 0;
    let skinCount = 0;
    let verticalEdgeEnergy = 0;
    let horizontalEdgeEnergy = 0;

    const stepX = Math.max(2, Math.floor(w / 50));
    const stepY = Math.max(2, Math.floor(h / 50));

    for (let y = 0; y < h; y += stepY) {
      for (let x = 0; x < w; x += stepX) {
        const { rx, ry } = mapCoord(x, y);
        const idx = (ry * rawW + rx) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const bri = getBrightness(r, g, b);

        // 頂部 35% vs 底部 35%
        if (y < h * 0.35) {
          topBri += bri;
          topBlueExcess += (b - (r + g) * 0.5);
          topPix++;
        } else if (y > h * 0.65) {
          btmBri += bri;
          btmWarmExcess += ((r + g) * 0.5 - b);
          btmPix++;
        }

        // 膚色位置
        if (isSkin(r, g, b)) {
          skinSumX += x;
          skinSumY += y;
          skinCount++;
        }

        // 邊緣能量
        if (x + stepX < w && y + stepY < h) {
          const cXCoord = mapCoord(x + stepX, y);
          const idxX = (cXCoord.ry * rawW + cXCoord.rx) * 4;
          const briX = getBrightness(data[idxX], data[idxX + 1], data[idxX + 2]);

          const cYCoord = mapCoord(x, y + stepY);
          const idxY = (cYCoord.ry * rawW + cYCoord.rx) * 4;
          const briY = getBrightness(data[idxY], data[idxY + 1], data[idxY + 2]);

          verticalEdgeEnergy += Math.abs(briX - bri);
          horizontalEdgeEnergy += Math.abs(briY - bri);
        }
      }
    }

    // 1. 光度重力得分
    const avgTopBri = topPix > 0 ? topBri / topPix : 0.5;
    const avgBtmBri = btmPix > 0 ? btmBri / btmPix : 0.5;
    const lightScore = (avgTopBri - avgBtmBri) * 35.0;

    // 2. 色彩得分
    const skyScore = (topPix > 0 ? topBlueExcess / topPix : 0) * 0.25;
    const groundScore = (btmPix > 0 ? btmWarmExcess / btmPix : 0) * 0.25;

    // 3. 膚色重心得分（大幅強化：人臉垂直重心若在上方給予極高加分！）
    let skinScore = 0;
    const totalSamples = (w * h) / (stepX * stepY);
    if (skinCount > totalSamples / 200) {
      const skinNormY = (skinSumY / skinCount) / h;
      const skinNormX = (skinSumX / skinCount) / w;

      if (skinNormY < 0.45) {
        skinScore += (0.5 - skinNormY) * 90.0; // 加大頭部在上方權重
      } else {
        skinScore -= (skinNormY - 0.5) * 80.0;
      }

      // 人像水平居中加分
      const centerDistX = Math.abs(skinNormX - 0.5);
      skinScore -= centerDistX * 25.0;
    }

    // 4. 垂直結構得分
    const edgeScore = (verticalEdgeEnergy - horizontalEdgeEnergy) * 0.15;

    return lightScore + skyScore + groundScore + skinScore + edgeScore;
  }

  /**
   * 智慧檢測照片的最佳擺正角度 (0, 90, 180, 270)
   */
  function detectOrientation(source) {
    const maxDim = 320;
    const sw = source.naturalWidth || source.width;
    const sh = source.naturalHeight || source.height;
    const scale = Math.min(maxDim / sw, maxDim / sh, 1);
    const tw = Math.max(32, Math.round(sw * scale));
    const th = Math.max(32, Math.round(sh * scale));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = tw;
    tempCanvas.height = th;
    const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, tw, th);
    const imgData = ctx.getImageData(0, 0, tw, th);

    const s0 = evaluatePose(imgData, 0);
    const s90 = evaluatePose(imgData, 90);
    const s180 = evaluatePose(imgData, 180);
    const s270 = evaluatePose(imgData, 270);

    let maxScore = s0;
    let bestAngle = 0;
    if (s90 > maxScore) { maxScore = s90; bestAngle = 90; }
    if (s180 > maxScore) { maxScore = s180; bestAngle = 180; }
    if (s270 > maxScore) { maxScore = s270; bestAngle = 270; }

    const reason = `0°: ${s0.toFixed(1)}, 90°: ${s90.toFixed(1)}, 180°: ${s180.toFixed(1)}, 270°: ${s270.toFixed(1)} → 最佳 ${bestAngle}°`;

    return {
      bestAngle,
      scores: { 0: s0, 90: s90, 180: s180, 270: s270 },
      reason
    };
  }

  window.orientationScorer = {
    detectOrientation,
    isSkin
  };

})();

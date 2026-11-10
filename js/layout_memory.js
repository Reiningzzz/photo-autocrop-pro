/**
 * layout_memory.js - 相簿翻拍版型記憶與先驗學習引擎 (解法 C)
 * 
 * 核心原理 (First Principles):
 * 1. 物理規律一致性：同一本實體老相簿中，各頁面的排版通常固定 (如上橫下直、2x2拍立得等)。
 * 2. 歸一化版型特徵 (Normalized Geometry)：提取相片四角相對百分比 (0.0 ~ 1.0)，不受解析度影響。
 * 3. 貝葉斯先驗修復 (Prior-Guided Healing)：
 *    - 反光碎框自動合併 (De-fragmentation): 將被高光切碎的區域依據版型自動癒合為完整相片。
 *    - 尊重大模型視覺結果：絕不無中生有憑空插入幽靈框。
 * 4. 越用越準 (Continuous Refinement): 用戶核准相片時自動強化記憶權重。
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'photoautocrop_active_album_layout';

  class LayoutMemory {
    constructor() {
      this.activeLayout = null; // { count: 2, regions: [...], name: '雙相片 (上橫下直)' }
      this.enabled = true;
      this.loadFromStorage();
    }

    /**
     * 從 LocalStorage 載入上次記錄的相簿版型 (自動清除不合理的多碎框異常版型)
     */
    loadFromStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          // 若版型數量超過 4 張或含有碎片框，判定為誤學習之髒數據，立即重設
          if (parsed && Array.isArray(parsed.regions) && parsed.regions.length >= 1 && parsed.regions.length <= 4) {
            this.activeLayout = parsed;
          } else {
            localStorage.removeItem(STORAGE_KEY);
            this.activeLayout = null;
          }
        }
      } catch (_) {
        this.activeLayout = null;
      }
    }

    /**
     * 持久化當前相簿版型
     */
    saveToStorage() {
      try {
        if (this.activeLayout && this.activeLayout.regions && this.activeLayout.regions.length <= 4) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.activeLayout));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (_) {}
    }

    /**
     * 是否已有已記憶的版型
     */
    hasLayout() {
      return this.enabled && !!this.activeLayout && Array.isArray(this.activeLayout.regions) && this.activeLayout.regions.length > 0;
    }

    hasMemory() {
      return this.hasLayout();
    }

    getPatternName() {
      const summary = this.getLayoutSummary();
      if (summary) return summary.label;
      if (typeof window !== 'undefined' && window.i18n) {
        return window.i18n.t('layout_unmemorized', {}, 'Unmemorized');
      }
      return '未記憶';
    }

    /**
     * 取得當前記憶的版型描述
     */
    getLayoutSummary() {
      if (!this.hasLayout()) return null;
      const count = this.activeLayout.regions.length;
      let label = '';
      if (typeof window !== 'undefined' && window.i18n) {
        if (count === 1) {
          label = window.i18n.t('layout_pattern_single', {}, 'Single Photo Focus');
        } else if (count === 2) {
          label = window.i18n.t('layout_pattern_dual', {}, 'Dual Photo Layout');
        } else if (count === 4) {
          label = window.i18n.t('layout_pattern_quad', {}, '4-Grid Polaroid');
        } else {
          label = window.i18n.t('layout_pattern_multi', { count }, `${count}-Photo Composite Layout`);
        }
      } else {
        label = count === 1 ? '單張特寫' : count === 2 ? '雙張相簿 (上橫下直)' : count === 4 ? '四格拍立得 (2x2)' : `${count} 張複合版型`;
      }
      return {
        count,
        label,
        updatedAt: this.activeLayout.updatedAt
      };
    }

    /**
     * 從當前已核准/標定的相片中學習並記憶版型
     * @param {object} photo - { width, height, regions }
     */
    learnFromPhoto(photo) {
      if (!photo || !photo.regions || photo.regions.length === 0) return false;
      // 若區域數量大於 4，判定為誤判碎框，拒絕記憶
      if (photo.regions.length > 4) return false;

      const w = photo.width || 1200;
      const h = photo.height || 1600;

      // 依空間由上至下、由左至右排序
      const sortedRegs = [...photo.regions].sort((a, b) => {
        const yA = (a.corners && a.corners[0]) ? a.corners[0].y : 0;
        const yB = (b.corners && b.corners[0]) ? b.corners[0].y : 0;
        if (Math.abs(yA - yB) > h * 0.12) return yA - yB;
        const xA = (a.corners && a.corners[0]) ? a.corners[0].x : 0;
        const xB = (b.corners && b.corners[0]) ? b.corners[0].x : 0;
        return xA - xB;
      });

      const normalizedRegions = sortedRegs.map((r, idx) => {
        const normCorners = (r.corners || []).map(pt => ({
          x: Math.max(0, Math.min(1, pt.x / w)),
          y: Math.max(0, Math.min(1, pt.y / h))
        }));

        // 計算歸一化 AABB 包圍盒
        const xs = normCorners.map(p => p.x);
        const ys = normCorners.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return {
          subIndex: idx + 1,
          corners: normCorners,
          bbox: { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY },
          rotation: r.rotation || 0,
          aspectRatio: (maxX - minX) / Math.max(maxY - minY, 0.001)
        };
      });

      this.activeLayout = {
        count: normalizedRegions.length,
        regions: normalizedRegions,
        updatedAt: Date.now()
      };

      this.saveToStorage();
      console.log(`[LayoutMemory] 成功學習相簿版型: 共 ${this.activeLayout.count} 張區域`);
      return true;
    }

    /**
     * 清空已記憶版型
     */
    reset() {
      this.activeLayout = null;
      this.saveToStorage();
    }

    /**
     * 核心演算法：以已記憶版型為先驗，僅在反光切碎時輔助聚合，絕不無中生有塞入幽靈框
     * @param {Array} rawDetectedRegions - AI 辨識產出的候選區域
     * @param {number} origW - 當前原圖寬度
     * @param {number} origH - 當前原圖高度
     * @returns {Array} 修復並校準後的 regions
     */
    refineDetectedRegions(rawDetectedRegions, origW, origH) {
      if (!this.hasLayout() || !origW || !origH || !Array.isArray(rawDetectedRegions)) {
        return rawDetectedRegions;
      }

      const template = this.activeLayout;
      const tplRegions = template.regions; // 先驗模板中的區域列表
      const refinedResults = [];

      // 將 raw 區域座標轉換為歸一化比例
      const detectedNorm = rawDetectedRegions.map(r => {
        const normCorners = (r.corners || []).map(p => ({
          x: p.x / origW,
          y: p.y / origH
        }));
        const xs = normCorners.map(p => p.x);
        const ys = normCorners.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return {
          raw: r,
          normCorners,
          bbox: { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY },
          matched: false
        };
      });

      // ── 遍歷模板中的每個預期相片區域 ──
      tplRegions.forEach((tpl, tplIdx) => {
        // 尋找與此模板重疊的候選框 (IoU 或中心距離相近)
        const overlappingCandidates = [];

        detectedNorm.forEach(cand => {
          if (cand.matched) return;
          const interX = Math.max(0, Math.min(tpl.bbox.maxX, cand.bbox.maxX) - Math.max(tpl.bbox.minX, cand.bbox.minX));
          const interY = Math.max(0, Math.min(tpl.bbox.maxY, cand.bbox.maxY) - Math.max(tpl.bbox.minY, cand.bbox.minY));
          const interArea = interX * interY;
          const candArea = cand.bbox.w * cand.bbox.h;

          // 若候選框的 45% 以上落在模板區域內
          if (candArea > 0 && interArea / candArea > 0.45) {
            overlappingCandidates.push(cand);
          }
        });

        if (overlappingCandidates.length === 1) {
          // 狀況 1: 完美單一匹配 ➔ 保留候選框並融合模板先驗朝向微調
          const best = overlappingCandidates[0];
          best.matched = true;
          if (tpl.rotation && !best.raw.rotation) {
            best.raw.rotation = tpl.rotation;
          }
          refinedResults.push(best.raw);
        } else if (overlappingCandidates.length > 1) {
          // 狀況 2: 反光被切碎成多個小框 ➔ 自動聚合為單一大相片框！
          console.log(`[LayoutMemory] 偵測到區域 #${tplIdx + 1} 遭反光切碎 (${overlappingCandidates.length} 塊)，自動依據版型聚合癒合！`);
          overlappingCandidates.forEach(c => { c.matched = true; });

          // 融合所有碎塊的外圍凸包角點
          const allXs = overlappingCandidates.flatMap(c => c.normCorners.map(p => p.x));
          const allYs = overlappingCandidates.flatMap(c => c.normCorners.map(p => p.y));
          const minX = Math.min(...allXs);
          const maxX = Math.max(...allXs);
          const minY = Math.min(...allYs);
          const maxY = Math.max(...allYs);

          refinedResults.push({
            id: `region_${Date.now()}_refined_${tplIdx + 1}`,
            subIndex: tplIdx + 1,
            corners: [
              { x: Math.round(minX * origW), y: Math.round(minY * origH) },
              { x: Math.round(maxX * origW), y: Math.round(minY * origH) },
              { x: Math.round(maxX * origW), y: Math.round(maxY * origH) },
              { x: Math.round(minX * origW), y: Math.round(maxY * origH) }
            ],
            rotation: tpl.rotation || 0,
            status: 'pending'
          });
        }
        // 狀況 3：若模板區域無任何候選框匹配，嚴格尊重 AI 視覺結果，絕不盲目強塞幽靈框！
      });

      // 檢查是否還有與模板無重疊的其餘相片 (例如大模型偵測出的其餘相片)
      detectedNorm.forEach(cand => {
        if (!cand.matched) {
          refinedResults.push(cand.raw);
        }
      });

      return refinedResults.length > 0 ? refinedResults : rawDetectedRegions;
    }

    /**
     * 直接將目前已記憶之版型套用至指定相片尺寸或相片物件
     * @param {number|object} photoOrW - 相片物件或寬度
     * @param {number} [optH] - 高度 (若第一個參數為寬度)
     * @returns {Array|boolean}
     */
    applyLayoutDirectly(photoOrW, optH) {
      if (!this.hasLayout()) return false;
      let w = 1200, h = 1600;
      let targetPhoto = null;

      if (typeof photoOrW === 'object' && photoOrW !== null) {
        targetPhoto = photoOrW;
        w = targetPhoto.width || (targetPhoto.imageObj && targetPhoto.imageObj.naturalWidth) || 1200;
        h = targetPhoto.height || (targetPhoto.imageObj && targetPhoto.imageObj.naturalHeight) || 1600;
      } else {
        w = photoOrW;
        h = optH;
      }

      if (!w || !h) return targetPhoto ? false : [];

      const regions = this.activeLayout.regions.map((tpl, idx) => ({
        id: `region_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${idx + 1}`,
        subIndex: idx + 1,
        corners: tpl.corners.map(p => ({
          x: Math.round(p.x * w),
          y: Math.round(p.y * h)
        })),
        rotation: tpl.rotation || 0,
        status: 'approved'
      }));

      if (targetPhoto) {
        targetPhoto.regions = regions;
        return true;
      }
      return regions;
    }
  }

  window.LayoutMemory = LayoutMemory;
  window.layoutMemory = new LayoutMemory();
})();
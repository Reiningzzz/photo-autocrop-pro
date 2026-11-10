/**
 * smart_snap.js - 相簿底紙色度辨識與角點智慧吸附模組
 * 
 * 移植自專案原生 C# 核心 SmartAlbumEngine.cs
 * 原理：
 * 1. 精準辨別相簿米黃/米白雪花底紙、純白 MEMO 紙、打孔黑洞與黑色裝訂
 * 2. 在人工拖曳角點時，以半徑 25px 範圍搜尋「底紙 -> 相片」的邊界梯度跳躍點，
 *    提供磁吸對齊（Smart Snap），大幅減少人工像素微調負擔。
 */

(function () {
  'use strict';

  // 判斷是否為相簿底紙或裝訂雜質（來自 SmartAlbumEngine.cs）
  function isAlbumBackground(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    // 米黃/米白雪花底紙
    const isRice = (r > 175 && g > 160 && b > 135 && diff < 50);
    // 純白 MEMO 紙
    const isWhitePaper = (r > 210 && g > 205 && b > 200 && diff < 25);
    // 打孔黑洞與黑色裝訂
    const isHoleOrBlackBorder = (r < 55 && g < 55 && b < 55);
    // MEMO 灰色橫線與灰色箭頭印花
    const isMemoGray = (diff < 15 && r > 115 && r < 195);

    return isRice || isWhitePaper || isHoleOrBlackBorder || isMemoGray;
  }

  let _sharedCanvas = null;
  let _sharedCtx = null;

  function getSharedCanvas(w, h) {
    if (!_sharedCanvas) {
      _sharedCanvas = document.createElement('canvas');
      _sharedCtx = _sharedCanvas.getContext('2d', { willReadFrequently: true });
    }
    if (_sharedCanvas.width < w || _sharedCanvas.height < h) {
      _sharedCanvas.width = Math.max(w, 64);
      _sharedCanvas.height = Math.max(h, 64);
    }
    return { canvas: _sharedCanvas, ctx: _sharedCtx };
  }

  /**
   * 智慧角點吸附：在原圖 (x, y) 附近尋找最強邊緣梯度點
   * @param {HTMLImageElement|HTMLCanvasElement} image 
   * @param {number} x - 游標所在原圖 X
   * @param {number} y - 游標所在原圖 Y
   * @param {number} radius - 搜尋半徑 (預設 24px)
   * @returns {{ x: number, y: number, snapped: boolean }}
   */
  function snapCorner(image, x, y, radius = 24) {
    const iw = image.naturalWidth || image.width;
    const ih = image.naturalHeight || image.height;

    const x1 = Math.max(0, Math.floor(x - radius));
    const y1 = Math.max(0, Math.floor(y - radius));
    const x2 = Math.min(iw - 1, Math.ceil(x + radius));
    const y2 = Math.min(ih - 1, Math.ceil(y + radius));
    const sw = x2 - x1 + 1;
    const sh = y2 - y1 + 1;

    if (sw <= 2 || sh <= 2) return { x, y, snapped: false };

    // 局部畫布取得像素 (使用快取避免高頻 GC 卡頓)
    const { canvas: c, ctx } = getSharedCanvas(sw, sh);
    ctx.drawImage(image, x1, y1, sw, sh, 0, 0, sw, sh);
    const imgData = ctx.getImageData(0, 0, sw, sh);
    const d = imgData.data;

    let bestScore = -1;
    let bestX = x;
    let bestY = y;

    // 尋找局部梯度最強，且鄰近像素有底紙特徵的交界點
    for (let py = 1; py < sh - 1; py++) {
      for (let px = 1; px < sw - 1; px++) {
        const idx = (py * sw + px) * 4;
        const r = d[idx], g = d[idx + 1], b = d[idx + 2];
        const isBg = isAlbumBackground(r, g, b);

        // 周圍 4 鄰域梯度
        const idxR = (py * sw + px + 1) * 4;
        const idxD = ((py + 1) * sw + px) * 4;
        const gradX = Math.abs(d[idxR] - r) + Math.abs(d[idxR + 1] - g) + Math.abs(d[idxR + 2] - b);
        const gradY = Math.abs(d[idxD] - r) + Math.abs(d[idxD + 1] - g) + Math.abs(d[idxD + 2] - b);
        const grad = gradX + gradY;

        // 距離懲罰（越靠近游標權重越高）
        const realX = x1 + px;
        const realY = y1 + py;
        const dist = Math.hypot(realX - x, realY - y);
        const distWeight = Math.max(0.2, 1 - (dist / radius));

        // 若周圍有底紙過渡到相片，給予額外權重
        const bgBonus = isBg ? 1.2 : 1.0;
        const score = grad * distWeight * bgBonus;

        if (score > bestScore) {
          bestScore = score;
          bestX = realX;
          bestY = realY;
        }
      }
    }

    // 只有當邊緣梯度足夠明顯時才吸附
    if (bestScore > 75) {
      return { x: bestX, y: bestY, snapped: true };
    }
    return { x, y, snapped: false };
  }

  window.smartSnap = {
    isAlbumBackground,
    snapCorner
  };

})();

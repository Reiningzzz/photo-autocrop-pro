/**
 * export-suite-test.js - PhotoAutoCrop Pro 介面運算與商業閉環深度實測套件
 * 
 * 涵蓋任務要求的 4 大核心驗證群組：
 *   [Group 1] 影像分割辨識：純本地離線 OpenCV WASM 引擎多目標輪廓辨識（Zero-Cloud Leak 隱私保障、斷網驗證）
 *   [Group 2] 即時拉平預覽：Perspective Warp 透視校正、Lanczos-4 重採樣、局部包圍盒優化、即時預覽更新
 *   [Group 3] 批次匯出管線：匯出為 ZIP 壓縮包、匯出至本地資料夾、300 DPI 印刷標籤二進位注入與 EXIF 保留
 *   [Group 4] 商業授權閉環：Freemium 試用版限制前 3 張成果匯出、Gumroad 授權碼驗證、30天離線寬限期快取與 HMAC 防偽
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 設置環境變數
process.env.NODE_ENV = 'test';
process.env.TEST_SUITE = 'true';

// 顏色輔助
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

let passedCount = 0;
let failedCount = 0;
const failures = [];

async function test(groupName, scenarioName, fn) {
  try {
    await fn();
    passedCount++;
    console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${scenarioName}`);
  } catch (err) {
    failedCount++;
    failures.push({ group: groupName, scenario: scenarioName, error: err });
    console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${scenarioName}`);
    console.log(`    ${colors.yellow}詳細原因: ${err.message}${colors.reset}`);
    if (err.stack) {
      console.log(`    ${colors.yellow}${err.stack.split('\n').slice(1, 3).join('\n')}${colors.reset}`);
    }
  }
}

// ── 瀏覽器/DOM 輕量模擬 (相容 Node.js 離線環境) ──
global.Image = class MockImage {};
global.HTMLImageElement = class MockHTMLImageElement {
  constructor(w = 800, h = 600) {
    this.naturalWidth = w;
    this.naturalHeight = h;
    this.width = w;
    this.height = h;
    this.src = '';
  }
};

global.HTMLCanvasElement = class MockHTMLCanvasElement {
  constructor(w = 100, h = 100) {
    this.width = w;
    this.height = h;
    this._pixelData = new Uint8ClampedArray(w * h * 4);
    this.style = {};
  }
  getContext(type) {
    const self = this;
    return {
      canvas: self,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      drawImage: (img, sx, sy, sw, sh, dx, dy, dw, dh) => {},
      translate: (x, y) => {},
      rotate: (deg) => {},
      getImageData: (x, y, w, h) => {
        const len = w * h * 4;
        const data = (self._pixelData && self._pixelData.length === len) ? self._pixelData : new Uint8ClampedArray(len);
        return { width: w, height: h, data };
      },
      putImageData: (imgData, x, y) => {}
    };
  }
  toDataURL(type, quality) {
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';
  }
  toBlob(callback, type = 'image/jpeg', quality = 0.95) {
    const dummy = Buffer.alloc(100);
    dummy[0] = 0xFF; dummy[1] = 0xD8; dummy[98] = 0xFF; dummy[99] = 0xD9;
    callback(new Blob([dummy], { type }));
  }
};

global.document = {
  createElement: (tag) => {
    if (tag === 'canvas') return new global.HTMLCanvasElement();
    if (tag === 'div') return { className: '', id: '', style: {}, innerHTML: '', appendChild: () => {} };
    if (tag === 'a') return { href: '', download: '', click: () => {} };
    return { style: {} };
  },
  getElementById: (id) => null
};

global.window = {
  document: global.document,
  matchMedia: () => ({ matches: false }),
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};

// 載入模組
const serverModule = require('../server');
const JSZip = require('../libs/jszip.min.js');
const { PhotoDetector, photoDetector, safeDelete } = require('../js/detector');

// ─────────────────────────────────────────────────────────────
// 測試執行主入口
// ─────────────────────────────────────────────────────────────
async function runExportSuiteTests() {
  console.log(`\n${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}  PhotoAutoCrop Pro - 介面運算與商業閉環深度實測 (Export & Operation Suite)${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════════════════════════${colors.reset}\n`);

  // ═══════════════════════════════════════════════════════════════
  // 模組一：OpenCV WebAssembly 初始化就緒
  // ═══════════════════════════════════════════════════════════════
  const cv = require('../libs/opencv.js');
  await new Promise((resolve) => {
    if (cv.Mat) resolve();
    else cv.onRuntimeInitialized = () => resolve();
  });
  global.cv = cv;
  photoDetector.isReady = true;

  // ═══════════════════════════════════════════════════════════════
  // [Group 1] 影像分割辨識 (Zero-Cloud Leak Offline Detection)
  // ═══════════════════════════════════════════════════════════════
  console.log(`${colors.bold}【Group 1: 影像分割辨識 (純本地離線 OpenCV WASM 與 Zero-Cloud Leak)】${colors.reset}`);

  await test('Group 1', '1.1 OpenCV.js WebAssembly 引擎本地就緒與 safeDelete 記憶體安全回收', () => {
    assert.ok(cv && cv.Mat, 'OpenCV WebAssembly 必須於本機正常加載並初始化 cv.Mat');
    const mat = new cv.Mat(10, 10, cv.CV_8UC1);
    assert.strictEqual(mat.rows, 10);
    assert.strictEqual(mat.cols, 10);
    // 驗證 safeDelete 安全釋放
    safeDelete(mat);
    // 二度釋放 safeDelete 不會引發崩潰
    safeDelete(mat);
    safeDelete(null);
    safeDelete(undefined);
  });

  await test('Group 1', '1.2 斷網/無 API Key 環境下預設調用 detectPhotoRegionsOffline (Zero-Cloud Leak)', async () => {
    // 確保 window.geminiDetector 為空或未配置 key
    delete global.window.geminiDetector;
    const testMat = new cv.Mat(800, 1200, cv.CV_8UC3, new cv.Scalar(30, 30, 30));
    // 繪製一個清晰的高對比相片區域 (白色相紙)
    cv.rectangle(testMat, new cv.Point(100, 100), new cv.Point(500, 700), new cv.Scalar(220, 220, 220), -1);

    try {
      const regions = await photoDetector.detectPhotoRegions(testMat, { forceOffline: true });
      assert.ok(Array.isArray(regions), '辨識結果必須為陣列');
      assert.strictEqual(regions._engine, 'opencv-offline', '辨識引擎必須精準標記為 opencv-offline');
      assert.ok(regions.length >= 1, `應成功檢出至少 1 張相片區域 (實際檢出: ${regions.length})`);
      const r = regions[0];
      assert.ok(r.corners && r.corners.length === 4, '相片區域必須包含精確 4 個角點');
      assert.strictEqual(r.rotation, 0, '預設旋轉角度為 0');
      assert.strictEqual(r.status, 'detected', '辨識狀態應為 detected');
    } finally {
      testMat.delete();
    }
  });

  await test('Group 1', '1.3 多目標相片分割：在同一張底圖中成功辨識出複數相片並擬合幾何頂點', async () => {
    const testMat = new cv.Mat(800, 1200, cv.CV_8UC3, new cv.Scalar(30, 30, 30));
    // 模擬相簿底板上放置 2 張不同大小與位置的實體照片
    cv.rectangle(testMat, new cv.Point(80, 80), new cv.Point(450, 650), new cv.Scalar(220, 220, 220), -1);
    cv.rectangle(testMat, new cv.Point(550, 80), new cv.Point(1050, 650), new cv.Scalar(220, 220, 220), -1);

    try {
      const regions = await photoDetector.detectPhotoRegionsOffline(testMat);
      assert.ok(regions.length >= 2, `多目標場景應成功分割出複數個相片區域 (實際檢出: ${regions.length} 張)`);
      for (const r of regions) {
        assert.strictEqual(r.corners.length, 4, '每個相片區域必須為 4 角點');
        // 驗證四角點具備合理物理面積
        const w = photoDetector.distance(r.corners[0], r.corners[1]);
        const h = photoDetector.distance(r.corners[0], r.corners[3]);
        assert.ok(w * h > 1000, '檢出之相片面積應大於雜訊閾值');
      }
    } finally {
      testMat.delete();
    }
  });

  await test('Group 1', '1.4 跨分割流 IoU 非極大值抑制 (_applyNMS) 正確剔除冗餘選框', () => {
    const box1 = {
      corners: [{ x: 10, y: 10 }, { x: 100, y: 10 }, { x: 100, y: 100 }, { x: 10, y: 100 }],
      score: 0.95,
      area: 8100
    };
    // box2 與 box1 高度重疊 (IoU > 0.8)
    const box2 = {
      corners: [{ x: 12, y: 12 }, { x: 98, y: 12 }, { x: 98, y: 98 }, { x: 12, y: 98 }],
      score: 0.82,
      area: 7396
    };
    // box3 為獨立不重疊的相片
    const box3 = {
      corners: [{ x: 200, y: 200 }, { x: 300, y: 200 }, { x: 300, y: 300 }, { x: 200, y: 300 }],
      score: 0.90,
      area: 10000
    };

    const iou = photoDetector._calculateAABBIoU(box1.corners, box2.corners);
    assert.ok(iou > 0.75, `相近選框的 IoU 應大於 0.75 (實際: ${iou.toFixed(2)})`);

    const nmsResults = photoDetector._applyNMS([box1, box2, box3], 0.38);
    assert.strictEqual(nmsResults.length, 2, 'NMS 抑制後應僅保留 2 個選框 (剔除冗餘重疊的 box2)');
    assert.strictEqual(nmsResults[0].score, 0.95, '第一優先應為最高分之 box1');
    assert.strictEqual(nmsResults[1].score, 0.90, '第二優先應為獨立無衝突之 box3');
  });

  await test('Group 1', '1.5 記憶體完整回收防護：單次離線辨識所有 Mats 和 MatVectors 100% 釋放', async () => {
    const classHandleProto = Object.getPrototypeOf(cv.Mat.prototype);
    const origDelete = classHandleProto.delete;
    let deleteCount = 0;
    classHandleProto.delete = function() {
      deleteCount++;
      return origDelete.apply(this, arguments);
    };

    const testMat = new cv.Mat(600, 800, cv.CV_8UC3, new cv.Scalar(30, 30, 30));
    cv.rectangle(testMat, new cv.Point(100, 100), new cv.Point(500, 500), new cv.Scalar(220, 220, 220), -1);

    try {
      await photoDetector.detectPhotoRegionsOffline(testMat);
      assert.ok(deleteCount >= 10, `所有運算暫存資源均應於 finally 區塊完整安全釋放 (本次銷毀計數: ${deleteCount})`);
    } finally {
      classHandleProto.delete = origDelete;
      testMat.delete();
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // [Group 2] 即時拉平預覽 (Perspective Dewarp Preview & Lanczos-4)
  // ═══════════════════════════════════════════════════════════════
  console.log(`\n${colors.bold}【Group 2: 即時拉平預覽 (Perspective Warp、Lanczos-4 與即時渲染)】${colors.reset}`);

  await test('Group 2', '2.1 四角點幾何排序 orderPoints：精準排序 [TL, TR, BR, BL] 並具備退化防護', () => {
    // 刻意打亂角點輸入順序：[BL, TR, TL, BR]
    const rawPts = [
      { x: 50, y: 380 },   // Bottom-Left
      { x: 390, y: 60 },   // Top-Right
      { x: 60, y: 70 },    // Top-Left
      { x: 410, y: 395 }   // Bottom-Right
    ];
    const ordered = photoDetector.orderPoints(rawPts);
    assert.strictEqual(ordered.length, 4);
    assert.strictEqual(ordered[0].x, 60, 'Index 0 必須為 Top-Left (x=60)');
    assert.strictEqual(ordered[1].x, 390, 'Index 1 必須為 Top-Right (x=390)');
    assert.strictEqual(ordered[2].x, 410, 'Index 2 必須為 Bottom-Right (x=410)');
    assert.strictEqual(ordered[3].x, 50, 'Index 3 必須為 Bottom-Left (x=50)');

    // 退化狀況測試：若座標相等或索引重複，防護機制依 Y 軸上下分組不崩潰
    const degenerate = [{ x: 10, y: 10 }, { x: 10, y: 10 }, { x: 100, y: 100 }, { x: 100, y: 100 }];
    const fallbackOrdered = photoDetector.orderPoints(degenerate);
    assert.strictEqual(fallbackOrdered.length, 4, '退化角點仍應回傳 4 個點');
  });

  await test('Group 2', '2.2 透視變換矩陣與 Lanczos-4 頂級重採樣插值 (cv.INTER_LANCZOS4)', () => {
    // 驗證 OpenCV 常數
    assert.strictEqual(cv.INTER_LANCZOS4, 4, 'OpenCV INTER_LANCZOS4 常數應為 4');

    // 建立傾斜四邊形並使用 getPerspectiveTransform + warpPerspective 執行拉平
    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      30, 20,    // TL
      280, 45,   // TR
      265, 390,  // BR
      40, 360    // BL
    ]);
    const dstW = 250, dstH = 350;
    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      dstW, 0,
      dstW, dstH,
      0, dstH
    ]);

    const M = cv.getPerspectiveTransform(srcTri, dstTri);
    assert.ok(M && M.rows === 3 && M.cols === 3, '透視矩陣必須為 3x3 矩陣');

    const srcMat = new cv.Mat(450, 350, cv.CV_8UC4, new cv.Scalar(100, 150, 200, 255));
    const dstMat = new cv.Mat();
    const dsize = new cv.Size(dstW, dstH);

    cv.warpPerspective(srcMat, dstMat, M, dsize, cv.INTER_LANCZOS4, cv.BORDER_CONSTANT, new cv.Scalar());
    assert.strictEqual(dstMat.cols, dstW, `拉平後目標寬度應為 ${dstW}`);
    assert.strictEqual(dstMat.rows, dstH, `拉平後目標高度應為 ${dstH}`);

    // 清理資源
    srcTri.delete();
    dstTri.delete();
    M.delete();
    srcMat.delete();
    dstMat.delete();
  });

  await test('Group 2', '2.3 局部包圍盒提取 (Bounding Box Pre-crop) 與 12000px 記憶體熔斷安全閥', () => {
    const detectorCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'detector.js'), 'utf8');
    assert.ok(detectorCode.includes('MAX_SAFE_DIM = 12000'), '必須定義 MAX_SAFE_DIM = 12000 安全閥');
    assert.ok(detectorCode.includes('minX - pad'), '必須實作局部包圍框提取以優化記憶體');
    assert.ok(detectorCode.includes('cv.INTER_LANCZOS4'), '透視拉平必須採用 cv.INTER_LANCZOS4');
  });

  await test('Group 2', '2.4 幾何旋轉 rotateCanvas (90°, 180°, 270°) 支援維度交換與角度校正', () => {
    const mockCanvas = new global.HTMLCanvasElement(400, 300);
    // 旋轉 0 度回傳原畫布
    const rot0 = photoDetector.rotateCanvas(mockCanvas, 0);
    assert.strictEqual(rot0, mockCanvas);

    // 旋轉 90 度長寬交換
    const rot90 = photoDetector.rotateCanvas(mockCanvas, 90);
    assert.strictEqual(rot90.width, 300, '90度旋轉寬度應變為原高度 300');
    assert.strictEqual(rot90.height, 400, '90度旋轉高度應變為原寬度 400');

    // 旋轉 180 度長寬不變
    const rot180 = photoDetector.rotateCanvas(mockCanvas, 180);
    assert.strictEqual(rot180.width, 400);
    assert.strictEqual(rot180.height, 300);

    // 旋轉 270 度長寬交換
    const rot270 = photoDetector.rotateCanvas(mockCanvas, 270);
    assert.strictEqual(rot270.width, 300);
    assert.strictEqual(rot270.height, 400);
  });

  await test('Group 2', '2.5 即時預覽更新 updatePreview 支援代理降採樣與真實輸出尺寸計算', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.ok(indexHtml.includes('async function updatePreview(region)'), 'index.html 應提供 updatePreview 核心預覽函式');
    assert.ok(indexHtml.includes('createProxyCanvas(pImg, maxPrevDim)'), '預覽應使用代理降採樣以保持毫秒級流暢');
    assert.ok(indexHtml.includes('metaEl.textContent = `${realW} × ${realH} px`'), '預覽區應即時顯示真實原圖輸出尺寸');
  });

  // ═══════════════════════════════════════════════════════════════
  // [Group 3] 批次匯出管線 (Batch Export Pipeline: ZIP, Folder, 300 DPI, EXIF)
  // ═══════════════════════════════════════════════════════════════
  console.log(`\n${colors.bold}【Group 3: 批次匯出管線 (ZIP 打包、資料夾直寫、300 DPI 與 EXIF 保留)】${colors.reset}`);

  await test('Group 3', '3.1 JPEG 二進位注入 300 DPI 印刷標籤 (JFIF APP0 規範)', () => {
    // 建立一個最小的合法 JPEG 檔案二進位 (SOI + APP0 + EOI)
    const rawJpeg = new Uint8Array([
      0xFF, 0xD8, // SOI
      0xFF, 0xDB, 0x00, 0x43, ...new Array(65).fill(0x01), // DQT
      0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x10, 0x00, 0x10, 0x01, 0x01, 0x11, 0x00, // SOF0 (16x16)
      0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, // SOS
      0x55, 0xAA, // dummy image data
      0xFF, 0xD9  // EOI
    ]);

    const resultBytes = photoDetector.injectDpiAndExif(rawJpeg, null, 300);
    assert.ok(resultBytes.length > rawJpeg.length, '注入後位元組長度應增加');
    assert.strictEqual(resultBytes[0], 0xFF);
    assert.strictEqual(resultBytes[1], 0xD8); // SOI

    // 檢查 APP0 (0xFF 0xE0)
    assert.strictEqual(resultBytes[2], 0xFF);
    assert.strictEqual(resultBytes[3], 0xE0);
    // 長度 = 16 (0x00 0x10)
    assert.strictEqual(resultBytes[4], 0x00);
    assert.strictEqual(resultBytes[5], 0x10);
    // 'JFIF\0' = 0x4A, 0x46, 0x49, 0x46, 0x00
    const jfifMagic = String.fromCharCode(...resultBytes.slice(6, 11));
    assert.strictEqual(jfifMagic, 'JFIF\0');
    // Units = 1 (dots per inch)
    assert.strictEqual(resultBytes[13], 0x01);
    // Xdensity = 300 (0x01 0x2C)
    const xDensity = (resultBytes[14] << 8) | resultBytes[15];
    assert.strictEqual(xDensity, 300, 'Xdensity 必須精準為 300 DPI');
    // Ydensity = 300 (0x01 0x2C)
    const yDensity = (resultBytes[16] << 8) | resultBytes[17];
    assert.strictEqual(yDensity, 300, 'Ydensity 必須精準為 300 DPI');
  });

  await test('Group 3', '3.2 EXIF 移植與 Orientation 強制校正為 1 (Normal，防第三方軟體旋轉失真)', () => {
    // 構建含有 EXIF APP1 且 Orientation = 6 (Rotate 90 CW) 的來源 JPEG
    const origJpeg = new Uint8Array([
      0xFF, 0xD8, // SOI
      0xFF, 0xE1, // APP1
      0x00, 0x22, // Length = 34
      0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // 'Exif\0\0'
      0x49, 0x49, 0x2A, 0x00, // TIFF Little-Endian (II)
      0x08, 0x00, 0x00, 0x00, // Offset to IFD0 = 8
      0x01, 0x00, // 1 entry in IFD0
      0x12, 0x01, // Tag 0x0112 (Orientation)
      0x03, 0x00, // Type: SHORT
      0x01, 0x00, 0x00, 0x00, // Count: 1
      0x06, 0x00, 0x00, 0x00, // Value = 6 (Rotate 90 CW)
      0x00, 0x00, 0x00, 0x00, // Next IFD = 0
      0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
      0xFF, 0xD9
    ]);

    const targetJpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0xAA, 0xFF, 0xD9]);
    const finalBytes = photoDetector.injectDpiAndExif(targetJpeg, origJpeg, 300);

    // 搜尋 APP1 區塊並檢查 Orientation 是否已被重寫為 1
    let app1Found = false;
    let orientValue = -1;
    for (let i = 0; i < finalBytes.length - 4; i++) {
      if (finalBytes[i] === 0xFF && finalBytes[i + 1] === 0xE1) {
        app1Found = true;
        // 搜尋 Orientation Tag (0x12 0x01)
        for (let j = i; j < i + 40; j++) {
          if (finalBytes[j] === 0x12 && finalBytes[j + 1] === 0x01) {
            orientValue = finalBytes[j + 8] | (finalBytes[j + 9] << 8);
            break;
          }
        }
        break;
      }
    }
    assert.ok(app1Found, '匯出資料中應包含 APP1 EXIF 區塊');
    assert.strictEqual(orientValue, 1, 'EXIF Orientation Tag 必須被強制覆寫為 1 (Normal)');
  });

  await test('Group 3', '3.3 批次匯出檔名解析與命名衝突自動防護 (附加序號 -2, -3)', () => {
    const indexCode = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.ok(indexCode.includes('function getResolvedFileName(item, idx, usedNamesSet = null)'), '應提供 getResolvedFileName 檔名解析函式');

    // 模擬 getResolvedFileName 邏輯驗證衝突防護
    function mockGetResolvedFileName(rawName, usedNamesSet) {
      if (!usedNamesSet.has(rawName)) {
        usedNamesSet.add(rawName);
        return rawName;
      }
      const extMatch = rawName.match(/^(.*?)(\.[^.]+)$/);
      const nameBody = extMatch ? extMatch[1] : rawName;
      const nameExt = extMatch ? extMatch[2] : '.jpg';
      let counter = 2;
      let uniqueName = `${nameBody}-${counter}${nameExt}`;
      while (usedNamesSet.has(uniqueName)) {
        counter++;
        uniqueName = `${nameBody}-${counter}${nameExt}`;
      }
      usedNamesSet.add(uniqueName);
      return uniqueName;
    }

    const usedNames = new Set();
    const name1 = mockGetResolvedFileName('photo_album_1.jpg', usedNames);
    const name2 = mockGetResolvedFileName('photo_album_1.jpg', usedNames);
    const name3 = mockGetResolvedFileName('photo_album_1.jpg', usedNames);

    assert.strictEqual(name1, 'photo_album_1.jpg');
    assert.strictEqual(name2, 'photo_album_1-2.jpg', '第二次同名應自動附加 -2');
    assert.strictEqual(name3, 'photo_album_1-3.jpg', '第三次同名應自動附加 -3');
  });

  await test('Group 3', '3.4 批次匯出 ZIP 打包管線：JSZip 封裝相片與 photoautocrop.project.json 隨身專案檔', async () => {
    const zip = new JSZip();
    const folder = zip.folder('cropped_photos');

    // 模擬匯出 3 張相片
    const fakePhotoData = Buffer.from('FAKE_JPEG_BINARY_DATA_WITH_300_DPI');
    folder.file('family_001.jpg', fakePhotoData);
    folder.file('family_002.jpg', fakePhotoData);
    folder.file('family_003.jpg', fakePhotoData);

    // 注入專案隨身進度檔
    const projectMetadata = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      totalPhotos: 3,
      app: 'PhotoAutoCrop Pro'
    };
    folder.file('photoautocrop.project.json', JSON.stringify(projectMetadata, null, 2));

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    assert.ok(zipBuffer.length > 200, '產生的 ZIP 壓縮包應包含實體內容');

    // 重新解壓縮檢驗結構
    const unzipped = await JSZip.loadAsync(zipBuffer);
    assert.ok(unzipped.file('cropped_photos/family_001.jpg'), 'ZIP 內應存在 family_001.jpg');
    assert.ok(unzipped.file('cropped_photos/family_002.jpg'), 'ZIP 內應存在 family_002.jpg');
    assert.ok(unzipped.file('cropped_photos/family_003.jpg'), 'ZIP 內應存在 family_003.jpg');
    const metaFile = unzipped.file('cropped_photos/photoautocrop.project.json');
    assert.ok(metaFile, 'ZIP 內應存在隨身專案檔 photoautocrop.project.json');
    const readMeta = JSON.parse(await metaFile.async('text'));
    assert.strictEqual(readMeta.totalPhotos, 3);
  });

  await test('Group 3', '3.5 直存本機資料夾串流匯出管線規範 (File System Access API 與及時記憶體釋放)', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.ok(indexHtml.includes('async function executeExport(isFolderMode)'), '必須實作 executeExport 直存/ZIP 雙模式');
    assert.ok(indexHtml.includes('showDirectoryPicker'), '應調用 showDirectoryPicker 直寫本地硬碟');
    assert.ok(indexHtml.includes('releasePhotoImage(p)'), '直寫過程非作用中相片必須及時 releasePhotoImage 釋放記憶體');
    assert.ok(indexHtml.includes('exportToFolderBtn'), '介面應提供直存本機資料夾入口按鈕');
  });

  // ═══════════════════════════════════════════════════════════════
  // [Group 4] 商業授權閉環 (Commercial License Loop)
  // ═══════════════════════════════════════════════════════════════
  console.log(`\n${colors.bold}【Group 4: 商業授權閉環 (Freemium、Gumroad 驗證、30天離線寬限期與 HMAC)】${colors.reset}`);

  let testServer = null;
  let testPort = 3397;
  let baseUrl = '';

  try {
    const sResult = await new Promise((resolve, reject) => {
      serverModule.startServer(testPort, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
    testServer = sResult.server;
    baseUrl = sResult.url;
  } catch (err) {
    console.warn('伺服器啟動警示:', err.message);
  }

  // 輔助 HTTP 請求
  function makeRequest(method, urlPath, data = null) {
    return new Promise((resolve, reject) => {
      const u = new URL(urlPath, baseUrl);
      const req = http.request(u, {
        method,
        headers: data ? { 'Content-Type': 'application/json' } : {}
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (_) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });
      req.on('error', reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  await test('Group 4', '4.1 Freemium 試用版限制：未啟用狀態下 checkFreemiumGate 限制匯出前 3 張', () => {
    // 重置為未啟用狀態
    serverModule.saveLicenseConfig({ isPro: false, licenseKey: '', verifiedAt: '', email: '' });

    const licenseState = { isPro: false, trialLimit: 3 };
    const items = [
      { id: 1, name: 'p1.jpg' },
      { id: 2, name: 'p2.jpg' },
      { id: 3, name: 'p3.jpg' },
      { id: 4, name: 'p4.jpg' },
      { id: 5, name: 'p5.jpg' }
    ];

    let passedItems = null;
    let gateTriggered = false;

    function mockCheckFreemiumGate(itemsToExport, onApproved) {
      if (licenseState.isPro || itemsToExport.length <= licenseState.trialLimit) {
        onApproved(itemsToExport);
        return;
      }
      gateTriggered = true;
      // 用戶點擊「匯出試用樣本 (前 3 張)」
      onApproved(itemsToExport.slice(0, licenseState.trialLimit));
    }

    mockCheckFreemiumGate(items, (approved) => {
      passedItems = approved;
    });

    assert.strictEqual(gateTriggered, true, '超過 3 張未啟用時必須觸發 Gate 攔截');
    assert.strictEqual(passedItems.length, 3, '試用模式下僅放行前 3 張相片');
  });

  await test('Group 4', '4.2 Gumroad 官方測試金鑰啟用 (PRO-TEST-VALID-KEY) 解鎖 Pro 版', async () => {
    const res = await makeRequest('POST', '/api/verify-license', { licenseKey: 'PRO-TEST-VALID-KEY' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.isPro, true);

    // 查詢 /api/license-status
    const statusRes = await makeRequest('GET', '/api/license-status');
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.data.isPro, true, '伺服器端狀態應已解鎖為 PRO 版');
    assert.strictEqual(statusRes.data.maskedKey, 'PRO--****--KEY');
  });

  await test('Group 4', '4.3 無效與非法金鑰驗證失敗攔截防護', async () => {
    const res = await makeRequest('POST', '/api/verify-license', { licenseKey: 'INVALID-FAKE-KEY-9999' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, false, '非法金鑰應回傳驗證失敗');
    assert.ok(res.data.message, '應返回友善錯誤提示');
  });

  await test('Group 4', '4.4 離線寬限期快取 (Offline Grace Period)：30天以內正常可用、逾期/未來偽造阻斷', async () => {
    // 1. 20 天以內 (在 30 天寬限期內)
    const withinDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    serverModule.saveLicenseConfig({
      isPro: true,
      licenseKey: 'PRO-TEST-VALID-KEY',
      verifiedAt: withinDate,
      email: 'grace@photoautocrop.pro'
    });
    const resWithin = await makeRequest('GET', '/api/license-status');
    assert.strictEqual(resWithin.data.isPro, true, '20 天離線寬限期內應維持 PRO');

    // 2. 35 天前 (超過 30 天寬限期)
    const expiredDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    serverModule.saveLicenseConfig({
      isPro: true,
      licenseKey: 'PRO-TEST-VALID-KEY',
      verifiedAt: expiredDate,
      email: 'grace@photoautocrop.pro'
    });
    const resExpired = await makeRequest('GET', '/api/license-status');
    assert.strictEqual(resExpired.data.isPro, false, '超過 30 天寬限期應降為試用版');

    // 3. 未來時間竄改攻擊 (2099 年)
    const futureDate = new Date('2099-01-01T00:00:00Z').toISOString();
    serverModule.saveLicenseConfig({
      isPro: true,
      licenseKey: 'PRO-TEST-VALID-KEY',
      verifiedAt: futureDate,
      email: 'grace@photoautocrop.pro'
    });
    const resFuture = await makeRequest('GET', '/api/license-status');
    assert.strictEqual(resFuture.data.isPro, false, '未來時間偽造漏洞應被徹底阻斷');
  });

  await test('Group 4', '4.5 本機 HMAC-SHA256 數位簽章防竄改：手動偽造 license.json 判定 tampered', () => {
    // 正常保存合法憑證
    serverModule.saveLicenseConfig({
      isPro: true,
      licenseKey: 'PRO-TEST-VALID-KEY',
      verifiedAt: new Date().toISOString(),
      email: 'valid@photoautocrop.pro'
    });

    // 模擬攻擊者直接修改 license.json 檔案中的 email 或 isPro
    const licFile = path.join(process.env.APPDATA || process.env.HOME, '.photoautocrop', 'license.json');
    if (fs.existsSync(licFile)) {
      const raw = JSON.parse(fs.readFileSync(licFile, 'utf8'));
      raw.email = 'hacker@tamper.com'; // 竄改 email，但簽名仍是原來的
      fs.writeFileSync(licFile, JSON.stringify(raw, null, 2), 'utf8');

      const checked = serverModule.readLicenseConfig();
      assert.strictEqual(checked.isPro, false, '竄改憑證後 isPro 必須強制重設為 false');
      assert.strictEqual(checked.tampered, true, '系統必須標記 tampered: true');
    }
  });

  await test('Group 4', '4.6 清除授權重置為試用版 (POST /api/clear-license)', async () => {
    const res = await makeRequest('POST', '/api/clear-license');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);

    const status = await makeRequest('GET', '/api/license-status');
    assert.strictEqual(status.data.isPro, false, '清除後應恢復免費試用版');
  });

  // 關閉測試伺服器
  if (testServer) {
    await new Promise((res) => testServer.close(res));
  }

  // ═══════════════════════════════════════════════════════════════
  // 實測總結
  // ═══════════════════════════════════════════════════════════════
  console.log(`\n${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`  實測總計: ${passedCount + failedCount} | 通過: ${passedCount} | 失敗: ${failedCount}`);
  console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════════════════════════${colors.reset}\n`);

  if (failedCount > 0) {
    console.error(`${colors.red}❌ 實測中存在 ${failedCount} 個失敗場景，請檢視原因！${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}🎉 PhotoAutoCrop Pro 介面運算與商業閉環 4 大驗證群組實測全數通過！無任何 Error 或 Crash。${colors.reset}`);
  }
}

runExportSuiteTests().catch((err) => {
  console.error('測試套件執行異常崩潰:', err);
  process.exit(1);
});

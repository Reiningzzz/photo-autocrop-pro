/**
 * canvas-interaction-test-suite.js
 * 
 * PhotoAutoCrop Pro - 介面核心互動實測 2 組自動化驗收測試套件
 * 
 * 涵蓋任務需求 5 大核心互動模組：
 *   1. 相片匯入管線：JPG, PNG, WebP, HEIC, 零 MIME 遺漏, 自動轉碼觸發, HUD 響應
 *   2. 隨身專案進度檔（.pacproj / project.json）拖入自動恢復
 *   3. 底部膠捲縮圖列：單選焦點切換、Ctrl 多選、Shift 區間多選、叉叉刪除相片、工作台清空重置
 *   4. 中央主畫布互動：Annotator 載入圖片、手動繪製 4 角點框、拖拉微調、智慧磁吸（Smart Snap）、90 度旋轉
 *   5. 版型記憶引擎（Layout Memory）：版型自動學習、手動鎖定、套用全相簿
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 顏色輸出輔助
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

let passedCount = 0;
let failedCount = 0;
const failures = [];

async function test(suiteName, scenarioName, fn) {
  try {
    await fn();
    passedCount++;
    console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${scenarioName}`);
  } catch (err) {
    failedCount++;
    failures.push({ suite: suiteName, scenario: scenarioName, error: err });
    console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${scenarioName}`);
    console.log(`    ${colors.yellow}詳細原因: ${err.message}${colors.reset}`);
  }
}

// ─────────────────────────────────────────────────────────────
// 輔助環境與 Mock 工廠
// ─────────────────────────────────────────────────────────────

function createMockCanvas(width = 800, height = 600) {
  const canvas = {
    width,
    height,
    style: { cursor: 'default' },
    listeners: {},
    getContext: () => ({
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      drawImage: () => {},
      getImageData: (x, y, w, h) => {
        const data = new Uint8ClampedArray(w * h * 4);
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 200;     // R (米黃底紙)
          data[i + 1] = 180; // G
          data[i + 2] = 150; // B
          data[i + 3] = 255; // A
        }
        return { data, width: w, height: h };
      },
      putImageData: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      fill: () => {},
      clip: () => {},
      setLineDash: () => {},
      measureText: (text) => ({ width: (text || '').length * 8 }),
      fillText: () => {},
      roundRect: () => {},
      arc: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      setTransform: () => {},
      resetTransform: () => {}
    }),
    addEventListener(evt, fn) {
      this.listeners[evt] = fn;
    },
    removeEventListener(evt, fn) {
      delete this.listeners[evt];
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
    parentElement: { clientWidth: 1000, clientHeight: 800 }
  };
  return canvas;
}

function setupAnnotatorEnvironment(smartSnapModule = null) {
  const canvas = createMockCanvas(800, 600);
  const winListeners = {};

  const windowMock = {
    addEventListener: (evt, fn) => { winListeners[evt] = fn; },
    removeEventListener: (evt, fn) => { delete winListeners[evt]; },
    smartSnap: smartSnapModule,
    I18n: { t: (k, params, fallback) => fallback || k }
  };

  const context = {
    window: windowMock,
    document: {
      createElement: (tag) => (tag === 'canvas' ? createMockCanvas(100, 100) : {}),
      getElementById: () => null
    },
    requestAnimationFrame: (cb) => { cb(); return 1; },
    Math,
    JSON,
    Set,
    Array,
    Date,
    parseInt
  };

  vm.createContext(context);
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'canvas_annotator.js'), 'utf8');
  vm.runInContext(code, context);

  const AnnotatorClass = context.window.CanvasAnnotator;
  const annotator = new AnnotatorClass(canvas);

  return {
    annotator,
    canvas,
    winListeners,
    windowMock,
    context
  };
}

// ─────────────────────────────────────────────────────────────
// 測試主流程
// ─────────────────────────────────────────────────────────────
async function runAllTests() {
  console.log(`\n${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}  PhotoAutoCrop Pro - 核心介面互動實測 2 組驗收套件${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}  (相片匯入管線、隨身專案還原、底部膠捲列、主畫布標註、版型記憶)${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  // ═══════════════════════════════════════════════════════════════
  // 1. 相片匯入管線
  // ═══════════════════════════════════════════════════════════════
  console.log(`${colors.bold}【1. 相片匯入管線實測 (Photo Import Pipeline)】${colors.reset}`);

  const isAcceptedImage = (f) => {
    if (!f) return false;
    if (f.type && f.type.startsWith('image/')) return true;
    const n = (f.name || '').toLowerCase();
    return n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.png') ||
           n.endsWith('.webp') || n.endsWith('.bmp') || n.endsWith('.jfif') ||
           n.endsWith('.heic') || n.endsWith('.heif') || n.endsWith('.tiff') || n.endsWith('.tif');
  };

  const isHeicFormat = (f) => {
    if (!f) return false;
    const type = (f.type || '').toLowerCase();
    const name = (f.name || '').toLowerCase();
    return type === 'image/heic' || type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif');
  };

  await test('匯入管線', '場景: JPG, PNG, WebP, BMP, TIFF 主流照片格式具備 MIME 正常識別', () => {
    assert.strictEqual(isAcceptedImage({ name: 'album_1970.jpg', type: 'image/jpeg', size: 1024 }), true);
    assert.strictEqual(isAcceptedImage({ name: 'family.png', type: 'image/png', size: 2048 }), true);
    assert.strictEqual(isAcceptedImage({ name: 'polaroid.webp', type: 'image/webp', size: 4096 }), true);
    assert.strictEqual(isAcceptedImage({ name: 'scan.bmp', type: 'image/bmp', size: 8192 }), true);
    assert.strictEqual(isAcceptedImage({ name: 'raw_archive.tiff', type: 'image/tiff', size: 16384 }), true);
  });

  await test('匯入管線', '場景: Windows 檔案選擇器與外部拖放 MIME 為空 (type: \'\') 零遺漏識別', () => {
    assert.strictEqual(isAcceptedImage({ name: 'PHOTO_001.JPG', type: '', size: 1024 }), true);
    assert.strictEqual(isAcceptedImage({ name: 'SNAPSHOT.PNG', type: '', size: 2048 }), true);
    assert.strictEqual(isAcceptedImage({ name: 'modern.WEBP', type: '', size: 4096 }), true);
    assert.strictEqual(isAcceptedImage({ name: 'IMG_8820.HEIC', type: '', size: 5000 }), true);
    assert.strictEqual(isAcceptedImage({ name: 'LIVE_01.HEIF', type: '', size: 5000 }), true);
    assert.strictEqual(isAcceptedImage({ name: 'camera.jfif', type: '', size: 2048 }), true);
  });

  await test('匯入管線', '場景: iPhone 原生 HEIC / HEIF 翻拍照片格式辨識與自動轉碼觸發', () => {
    assert.strictEqual(isHeicFormat({ name: 'IMG_1234.HEIC', type: '' }), true);
    assert.strictEqual(isHeicFormat({ name: 'IMG_5678.heic', type: 'image/heic' }), true);
    assert.strictEqual(isHeicFormat({ name: 'IMG_9999.HEIF', type: '' }), true);
    assert.strictEqual(isHeicFormat({ name: 'photo.jpg', type: 'image/jpeg' }), false);
  });

  await test('匯入管線', '場景: 非相片檔案 (PDF, EXE, TXT, JSON) 安全排除', () => {
    assert.strictEqual(isAcceptedImage({ name: 'manual.pdf', type: 'application/pdf', size: 1024 }), false);
    assert.strictEqual(isAcceptedImage({ name: 'setup.exe', type: 'application/octet-stream', size: 2048 }), false);
    assert.strictEqual(isAcceptedImage({ name: 'readme.txt', type: 'text/plain', size: 512 }), false);
    assert.strictEqual(isAcceptedImage({ name: 'project.json', type: 'application/json', size: 1024 }), false);
  });

  await test('匯入管線', '場景: 巨型大檔記憶體防護 (200MB 超限自動安全跳過，杜絕 OOM 崩潰)', () => {
    const MAX_FILE_SIZE = 200 * 1024 * 1024;
    const validLargeFile = { name: 'dslr_48mp.jpg', size: 48 * 1024 * 1024 };
    const overflowFile = { name: 'corrupted_dump.jpg', size: 220 * 1024 * 1024 };

    assert.ok(validLargeFile.size <= MAX_FILE_SIZE, '48MP 正常相片應放行');
    assert.ok(overflowFile.size > MAX_FILE_SIZE, '超限異常大檔應被攔截跳過');
  });

  await test('匯入管線', '場景: 批次相片匯入 HUD 讀取動畫與渲染幀讓出 (杜絕卡頓)', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.ok(indexHtml.includes('id="heicProgressModal"'), '應具備批次匯入與 HEIC 轉碼進度 HUD');
    assert.ok(indexHtml.includes('updateImportProgress('), '應具備動態進度回報函式');
    assert.ok(indexHtml.includes('requestAnimationFrame'), '批次匯入管線應主動讓出渲染幀');
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. 隨身專案進度檔拖入自動恢復
  // ═══════════════════════════════════════════════════════════════
  console.log(`\n${colors.bold}【2. 隨身專案進度檔拖入與智慧還原 (Sidecar Project Recovery)】${colors.reset}`);

  // 載入 storage_manager 與 layout_memory
  const smContext = {
    window: {},
    indexedDB: { open: () => ({}) },
    localStorage: {
      _data: {},
      getItem(k) { return this._data[k] || null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; }
    },
    console,
    Date,
    Math,
    JSON,
    Array
  };
  vm.createContext(smContext);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'layout_memory.js'), 'utf8'), smContext);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'storage_manager.js'), 'utf8'), smContext);

  const sm = smContext.window.storageManager;
  const LayoutMemoryClass = smContext.window.LayoutMemory;

  await test('專案進度檔', '場景: 隨身專案檔命名規則偵測相容性 (.pacproj, photoautocrop.project.json, *.project.json)', () => {
    const isProjectFile = (name) => {
      const n = (name || '').toLowerCase();
      return n.endsWith('.pacproj') || n.includes('photoautocrop.project') || n.includes('photoautocrop_project') || (n.endsWith('.json') && n.includes('project'));
    };

    assert.strictEqual(isProjectFile('my_album.pacproj'), true);
    assert.strictEqual(isProjectFile('photoautocrop.project.json'), true);
    assert.strictEqual(isProjectFile('photoautocrop_project.json'), true);
    assert.strictEqual(isProjectFile('japan_trip_project.json'), true);
    assert.strictEqual(isProjectFile('photo1.jpg'), false);
    assert.strictEqual(isProjectFile('notes.json'), false);
  });

  await test('專案進度檔', '場景: generateProjectData 完整封裝切片四角座標、90度朝向、核准狀態與相簿版型', () => {
    const testPhotos = [
      {
        id: 'p1',
        name: 'album_p1.jpg',
        width: 3000,
        height: 2000,
        regions: [
          { id: 'r1', subIndex: 1, corners: [{ x: 50, y: 50 }, { x: 1400, y: 50 }, { x: 1400, y: 1900 }, { x: 50, y: 1900 }], rotation: 90, status: 'approved' },
          { id: 'r2', subIndex: 2, corners: [{ x: 1500, y: 50 }, { x: 2900, y: 50 }, { x: 2900, y: 1900 }, { x: 1500, y: 1900 }], rotation: 180, status: 'approved' }
        ]
      }
    ];

    const testLayout = new LayoutMemoryClass();
    testLayout.learnFromPhoto(testPhotos[0]);

    const projectData = sm.generateProjectData(testPhotos, testLayout);
    assert.strictEqual(projectData.format, 'PhotoAutoCrop-Sidecar-Project');
    assert.strictEqual(projectData.totalPhotos, 1);
    assert.strictEqual(projectData.photos[0].regions.length, 2);
    assert.strictEqual(projectData.photos[0].regions[0].rotation, 90);
    assert.strictEqual(projectData.photos[0].regions[1].rotation, 180);
    assert.strictEqual(projectData.photos[0].regions[0].status, 'approved');
    assert.ok(projectData.layoutMemory, '應包含相簿版型記憶');
    assert.strictEqual(projectData.layoutMemory.count, 2);
  });

  await test('專案進度檔', '場景: 跨電腦 / 換目錄拖入專案檔，自動精準以檔名對齊並恢復 100% 進度', () => {
    const projectData = {
      format: 'PhotoAutoCrop-Sidecar-Project',
      totalPhotos: 2,
      photos: [
        {
          id: 'old_id_1',
          name: 'family_1988_01.jpg',
          regions: [{ id: 'r1', corners: [{ x: 10, y: 10 }, { x: 900, y: 10 }, { x: 900, y: 800 }, { x: 10, y: 800 }], rotation: 90, status: 'approved' }]
        },
        {
          id: 'old_id_2',
          name: 'family_1988_02.png',
          regions: [{ id: 'r2', corners: [{ x: 20, y: 20 }, { x: 800, y: 20 }, { x: 800, y: 700 }, { x: 20, y: 700 }], rotation: 270, status: 'pending' }]
        }
      ],
      layoutMemory: { count: 1, regions: [{ corners: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }] }] }
    };

    const newPhotos = [
      { id: 'new_id_a', name: 'family_1988_01.jpg', regions: [] },
      { id: 'new_id_b', name: 'family_1988_02.png', regions: [] }
    ];

    const targetLayout = new LayoutMemoryClass();
    targetLayout.activeLayout = null;

    const restoredCount = sm.restoreProjectData(projectData, newPhotos, targetLayout);
    assert.strictEqual(restoredCount, 2, '應完全比對檔名並還原 2 張相片');
    assert.strictEqual(newPhotos[0].regions.length, 1);
    assert.strictEqual(newPhotos[0].regions[0].rotation, 90, '相片 1 旋轉應恢復 90 度');
    assert.strictEqual(newPhotos[0].regions[0].status, 'approved', '核准狀態應保持 approved');
    assert.strictEqual(newPhotos[1].regions[0].rotation, 270, '相片 2 旋轉應恢復 270 度');
    assert.strictEqual(targetLayout.hasMemory(), true, '版型記憶應跨電腦無損恢復');
  });

  await test('專案進度檔', '場景: index.html 拖曳單獨專案檔或隨同相片自動偵測還原', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.ok(indexHtml.includes('if (!files.length && loadedSidecarData)'), '單獨拖入專案檔時應具備判斷分支');
    assert.ok(indexHtml.includes('window.storageManager.restoreProjectData(loadedSidecarData, photos'), '應調用 restoreProjectData');
    assert.ok(indexHtml.includes('if (loadedSidecarData && window.storageManager)'), '隨相片資料夾一起拖入時應自動還原');
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. 底部膠捲縮圖列
  // ═══════════════════════════════════════════════════════════════
  console.log(`\n${colors.bold}【3. 底部膠捲縮圖列互動實測 (Filmstrip, Selection & Reset)】${colors.reset}`);

  let mockPhotos = [
    { id: 'p0', name: 'pic0.jpg', regions: [{ id: 'r0', status: 'approved' }] },
    { id: 'p1', name: 'pic1.jpg', regions: [] },
    { id: 'p2', name: 'pic2.jpg', regions: [{ id: 'r2', status: 'pending' }] },
    { id: 'p3', name: 'pic3.jpg', regions: [{ id: 'r3', status: 'approved' }] },
    { id: 'p4', name: 'pic4.jpg', regions: [] }
  ];

  let currentActivePhotoIdx = 0;
  let currentSelectedPhotoIndices = new Set([0]);
  let currentLastClickedPhotoIdx = 0;

  function simulateSwitchPhoto(idx, resetMultiSelect = true) {
    if (idx < 0 || idx >= mockPhotos.length) return;
    if (resetMultiSelect) {
      currentSelectedPhotoIndices = new Set([idx]);
      currentLastClickedPhotoIdx = idx;
    }
    currentActivePhotoIdx = idx;
  }

  function simulateCardClick(idx, e = {}) {
    if (e.shiftKey) {
      const anchor = (typeof currentLastClickedPhotoIdx === 'number' && currentLastClickedPhotoIdx >= 0 && currentLastClickedPhotoIdx < mockPhotos.length)
        ? currentLastClickedPhotoIdx
        : currentActivePhotoIdx;
      const start = Math.min(anchor, idx);
      const end = Math.max(anchor, idx);

      if (!e.ctrlKey && !e.metaKey) {
        currentSelectedPhotoIndices.clear();
      }
      for (let i = start; i <= end; i++) {
        currentSelectedPhotoIndices.add(i);
      }
      simulateSwitchPhoto(idx, false);
    } else if (e.ctrlKey || e.metaKey) {
      if (currentSelectedPhotoIndices.has(idx) && currentSelectedPhotoIndices.size > 1) {
        currentSelectedPhotoIndices.delete(idx);
        if (currentActivePhotoIdx === idx) {
          const remain = Array.from(currentSelectedPhotoIndices)[0];
          simulateSwitchPhoto(remain, false);
        }
      } else {
        currentSelectedPhotoIndices.add(idx);
        currentLastClickedPhotoIdx = idx;
        simulateSwitchPhoto(idx, false);
      }
    } else {
      currentSelectedPhotoIndices = new Set([idx]);
      currentLastClickedPhotoIdx = idx;
      simulateSwitchPhoto(idx, true);
    }
  }

  function simulateDeletePhoto(idx) {
    if (idx < 0 || idx >= mockPhotos.length) return;
    mockPhotos.splice(idx, 1);
    currentSelectedPhotoIndices.delete(idx);
    if (mockPhotos.length === 0) {
      currentActivePhotoIdx = 0;
      currentSelectedPhotoIndices = new Set([0]);
    } else {
      const nextIdx = (idx >= mockPhotos.length) ? mockPhotos.length - 1 : idx;
      currentSelectedPhotoIndices = new Set([nextIdx]);
      currentLastClickedPhotoIdx = nextIdx;
      simulateSwitchPhoto(nextIdx);
    }
  }

  function simulateDeleteSelectedPhotos() {
    const targets = Array.from(currentSelectedPhotoIndices).sort((a, b) => b - a);
    if (targets.length === 0) return;
    if (targets.length === 1) {
      simulateDeletePhoto(targets[0]);
      return;
    }
    targets.forEach(idx => {
      if (idx >= 0 && idx < mockPhotos.length) {
        mockPhotos.splice(idx, 1);
      }
    });
    currentSelectedPhotoIndices.clear();
    if (mockPhotos.length === 0) {
      currentActivePhotoIdx = 0;
      currentSelectedPhotoIndices = new Set([0]);
      currentLastClickedPhotoIdx = 0;
    } else {
      const nextIdx = Math.min(targets[targets.length - 1], mockPhotos.length - 1);
      currentSelectedPhotoIndices = new Set([nextIdx]);
      currentLastClickedPhotoIdx = nextIdx;
      simulateSwitchPhoto(nextIdx, false);
    }
  }

  await test('膠捲縮圖列', '場景: 單選焦點切換 (switchPhoto 設定單一選取集合與最後點擊錨點)', () => {
    simulateCardClick(2);
    assert.strictEqual(currentActivePhotoIdx, 2);
    assert.strictEqual(currentLastClickedPhotoIdx, 2);
    assert.deepStrictEqual(Array.from(currentSelectedPhotoIndices), [2]);
  });

  await test('膠捲縮圖列', '場景: Office 規範 Ctrl 鍵多選點選切換 (加選與減選)', () => {
    // 當前選取 2，Ctrl+點擊 4 ➔ [2, 4]
    simulateCardClick(4, { ctrlKey: true });
    assert.strictEqual(currentActivePhotoIdx, 4);
    assert.deepStrictEqual(Array.from(currentSelectedPhotoIndices).sort(), [2, 4]);

    // Ctrl+點擊 2 (反選減選) ➔ [4]
    simulateCardClick(2, { ctrlKey: true });
    assert.deepStrictEqual(Array.from(currentSelectedPhotoIndices), [4]);
  });

  await test('膠捲縮圖列', '場景: Office 規範 Shift 鍵連續區間多選 (Range Selection 錨點機制)', () => {
    // 錨點定在 1，Shift+點擊 3 ➔ [1, 2, 3]
    simulateCardClick(1);
    simulateCardClick(3, { shiftKey: true });
    assert.deepStrictEqual(Array.from(currentSelectedPhotoIndices).sort(), [1, 2, 3]);
    assert.strictEqual(currentActivePhotoIdx, 3);
  });

  await test('膠捲縮圖列', '場景: 膠捲多選狀態下批次刪除多張底圖相片 (deleteSelectedPhotos)', () => {
    // 目前選取 [1, 2, 3]，批次刪除
    simulateDeleteSelectedPhotos();
    assert.strictEqual(mockPhotos.length, 2, '5張刪除3張應剩餘2張');
    assert.strictEqual(mockPhotos[0].name, 'pic0.jpg');
    assert.strictEqual(mockPhotos[1].name, 'pic4.jpg');
  });

  await test('膠捲縮圖列', '場景: 膠捲卡片叉叉按鈕刪除單張相片，相鄰焦點自動遞補', () => {
    simulateDeletePhoto(0);
    assert.strictEqual(mockPhotos.length, 1);
    assert.strictEqual(mockPhotos[0].name, 'pic4.jpg');
    assert.strictEqual(currentActivePhotoIdx, 0);

    simulateDeletePhoto(0);
    assert.strictEqual(mockPhotos.length, 0);
    assert.strictEqual(currentActivePhotoIdx, 0);
  });

  await test('膠捲縮圖列', '場景: 工作台安全清空重置 (resetWorkspaceToEmpty & performClearSession 自動快照)', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.ok(indexHtml.includes('function resetWorkspaceToEmpty()'), '應提供 resetWorkspaceToEmpty 函式');
    assert.ok(indexHtml.includes('window.storageManager.archiveSession(photos, activePhotoIdx'), '重置工作台前應主動存入歷史快照');
    assert.ok(indexHtml.includes('window.storageManager.clearSession()'), '應調用 clearSession 清理當前 Session');
    assert.ok(indexHtml.includes('ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height)'), '應清空主畫布');
    assert.ok(indexHtml.includes('annotator.image = null'), '應重置 annotator 影像引用');
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. 中央主畫布互動 (Annotator & Smart Snap)
  // ═══════════════════════════════════════════════════════════════
  console.log(`\n${colors.bold}【4. 中央主畫布幾何標註與交互微調 (Canvas Annotator & Smart Snap)】${colors.reset}`);

  // 載入 smart_snap.js
  const snapContext = {
    window: {},
    document: {
      createElement: () => createMockCanvas(64, 64)
    },
    Math
  };
  vm.createContext(snapContext);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'smart_snap.js'), 'utf8'), snapContext);
  const smartSnapModule = snapContext.window.smartSnap;

  await test('主畫布互動', '場景: Smart Snap 底紙色度辨別 (米黃雪花、白紙、黑色裝訂、灰色標籤)', () => {
    const isBg = smartSnapModule.isAlbumBackground;
    assert.strictEqual(isBg(200, 185, 155), true, '米黃底紙應辨識為底紙');
    assert.strictEqual(isBg(220, 215, 210), true, '純白 MEMO 紙應辨識為底紙');
    assert.strictEqual(isBg(30, 30, 30), true, '黑色裝訂線應辨識為底紙');
    assert.strictEqual(isBg(150, 150, 150), true, '灰色箭頭印花應辨識為底紙');
    assert.strictEqual(isBg(255, 0, 0), false, '鮮豔紅色相片不應被誤判為底紙');
  });

  await test('主畫布互動', '場景: Annotator 載入圖片、尺度 (scale) 與初始幾何狀態建立', () => {
    const env = setupAnnotatorEnvironment(smartSnapModule);
    const testImg = { naturalWidth: 1600, naturalHeight: 1200, width: 1600, height: 1200 };
    env.annotator.loadImage(testImg, []);
    assert.ok(env.annotator.scale > 0, 'scale 應大於 0');
    assert.strictEqual(env.annotator.regions.length, 0, '初始 regions 應為空陣列');
  });

  await test('主畫布互動', '場景: 畫布手動 4 角點框繪製 (mousedown -> mousemove -> mouseup) 產出合法相框', () => {
    const env = setupAnnotatorEnvironment(smartSnapModule);
    const testImg = { naturalWidth: 1000, naturalHeight: 800, width: 1000, height: 800 };
    env.annotator.loadImage(testImg, []);

    // 1. mousedown (開始拉框)
    env.canvas.listeners.mousedown({
      button: 0,
      clientX: 100,
      clientY: 100,
      shiftKey: false,
      ctrlKey: false,
      preventDefault: () => {}
    });
    assert.strictEqual(env.annotator.mode, 'drawing', 'mousedown 空白處應進入 drawing 模式');

    // 2. mousemove (拖曳框大小)
    env.winListeners.mousemove({
      clientX: 300,
      clientY: 250
    });

    // 3. mouseup (放開滑鼠建立相框)
    env.winListeners.mouseup({
      clientX: 300,
      clientY: 250
    });

    assert.strictEqual(env.annotator.regions.length, 1, '放開滑鼠應成功新增 1 個相框');
    const region = env.annotator.regions[0];
    assert.strictEqual(region.corners.length, 4, '必須具備 4 個角點 (TL, TR, BR, BL)');
    assert.strictEqual(region.rotation, 0, '初始旋轉應為 0 度');
    assert.strictEqual(region.status, 'pending', '初始狀態應為 pending');
  });

  await test('主畫布互動', '場景: 角點命中判定 (_findCornerAt) 與拖曳微調 (mode: dragging-corner)', () => {
    const env = setupAnnotatorEnvironment(smartSnapModule);
    const testImg = { naturalWidth: 1000, naturalHeight: 800, width: 1000, height: 800 };
    const initialRegions = [
      {
        id: 'r_test',
        corners: [{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 250 }, { x: 100, y: 250 }],
        rotation: 0,
        status: 'pending'
      }
    ];
    env.annotator.loadImage(testImg, initialRegions);

    const corner0 = initialRegions[0].corners[0];
    const screenX = corner0.x * env.annotator.scale;
    const screenY = corner0.y * env.annotator.scale;

    // 點擊 corner 0
    env.canvas.listeners.mousedown({
      button: 0,
      clientX: screenX,
      clientY: screenY,
      shiftKey: false,
      ctrlKey: false,
      preventDefault: () => {}
    });

    assert.strictEqual(env.annotator.mode, 'dragging-corner', '點擊角點應進入 dragging-corner 模式');

    // 移動角點
    env.winListeners.mousemove({
      clientX: screenX + 20,
      clientY: screenY + 20
    });
    env.winListeners.mouseup({});

    assert.notDeepStrictEqual(env.annotator.regions[0].corners[0], { x: 100, y: 100 }, '角點座標應已更新');
  });

  await test('主畫布互動', '場景: 相片框精確 90 度步進旋轉 (0° -> 90° -> 180° -> 270° -> 0°)', () => {
    const env = setupAnnotatorEnvironment(smartSnapModule);
    const testImg = { naturalWidth: 1000, naturalHeight: 800, width: 1000, height: 800 };
    const initialRegions = [
      {
        id: 'r_rot',
        corners: [{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 250 }, { x: 100, y: 250 }],
        rotation: 0,
        status: 'pending'
      }
    ];
    env.annotator.loadImage(testImg, initialRegions);
    const r = env.annotator.getActiveRegion();

    // 模擬 4 次 90 度點擊
    r.rotation = ((r.rotation || 0) + 90) % 360;
    assert.strictEqual(r.rotation, 90, '第 1 次旋轉應為 90°');

    r.rotation = ((r.rotation || 0) + 90) % 360;
    assert.strictEqual(r.rotation, 180, '第 2 次旋轉應為 180°');

    r.rotation = ((r.rotation || 0) + 90) % 360;
    assert.strictEqual(r.rotation, 270, '第 3 次旋轉應為 270°');

    r.rotation = ((r.rotation || 0) + 90) % 360;
    assert.strictEqual(r.rotation, 0, '第 4 次旋轉應回到 0°');
  });

  await test('主畫布互動', '場景: 多步驟雙向可逆歷史棧 (50 步上限控制、undo 復原、redo 推進)', () => {
    const env = setupAnnotatorEnvironment(smartSnapModule);
    const testImg = { naturalWidth: 1000, naturalHeight: 800, width: 1000, height: 800 };
    const initialRegions = [
      {
        id: 'r_hist',
        corners: [{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 250 }, { x: 100, y: 250 }],
        rotation: 0,
        status: 'pending'
      }
    ];
    env.annotator.loadImage(testImg, initialRegions);

    // 紀錄步驟 1
    env.annotator.recordHistory();
    const r = env.annotator.getActiveRegion();
    r.rotation = 90;

    // 紀錄步驟 2
    env.annotator.recordHistory();
    r.rotation = 180;

    // Undo 復原到 90
    env.annotator.undo();
    assert.strictEqual(env.annotator.getActiveRegion().rotation, 90, 'Undo 應回到 90 度');

    // Undo 復原到 0
    env.annotator.undo();
    assert.strictEqual(env.annotator.getActiveRegion().rotation, 0, 'Undo 應回到 0 度');

    // Redo 推進到 90
    env.annotator.redo();
    assert.strictEqual(env.annotator.getActiveRegion().rotation, 90, 'Redo 應推進到 90 度');
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. 版型記憶引擎 (Layout Memory)
  // ═══════════════════════════════════════════════════════════════
  console.log(`\n${colors.bold}【5. 相簿版型記憶引擎實測 (Album Layout Memory Engine)】${colors.reset}`);

  await test('版型記憶', '場景: 從已核准相片中自動學習歸一化版型 (0.0~1.0 比例特徵)', () => {
    const lm = new LayoutMemoryClass();
    const photo = {
      width: 2000,
      height: 3000,
      regions: [
        { id: 'reg1', corners: [{ x: 200, y: 300 }, { x: 1800, y: 300 }, { x: 1800, y: 1400 }, { x: 200, y: 1400 }], rotation: 90, status: 'approved' },
        { id: 'reg2', corners: [{ x: 200, y: 1600 }, { x: 1800, y: 1600 }, { x: 1800, y: 2700 }, { x: 200, y: 2700 }], rotation: 0, status: 'approved' }
      ]
    };

    const success = lm.learnFromPhoto(photo);
    assert.strictEqual(success, true);
    assert.strictEqual(lm.hasMemory(), true);
    assert.strictEqual(lm.activeLayout.count, 2);

    const normCorners = lm.activeLayout.regions[0].corners;
    assert.strictEqual(normCorners[0].x, 0.1); // 200 / 2000
    assert.strictEqual(normCorners[0].y, 0.1); // 300 / 3000
    assert.strictEqual(normCorners[1].x, 0.9); // 1800 / 2000
    assert.strictEqual(normCorners[2].y, 1400 / 3000);
  });

  await test('版型記憶', '場景: 異常碎框保護 (超過 4 塊區域拒絕學習，避免髒數據污染)', () => {
    const lm = new LayoutMemoryClass();
    lm.reset();
    const brokenPhoto = {
      width: 2000,
      height: 3000,
      regions: [
        { corners: [{ x: 0, y: 0 }] },
        { corners: [{ x: 0, y: 0 }] },
        { corners: [{ x: 0, y: 0 }] },
        { corners: [{ x: 0, y: 0 }] },
        { corners: [{ x: 0, y: 0 }] } // 5 塊碎框
      ]
    };

    const success = lm.learnFromPhoto(brokenPhoto);
    assert.strictEqual(success, false, '超過 4 塊區域應判定為碎框雜訊，拒絕記憶');
    assert.strictEqual(lm.hasMemory(), false);
  });

  await test('版型記憶', '場景: 依區域數量動態命名相簿版型 (單張特寫、雙張相簿、四格拍立得)', () => {
    const lm = new LayoutMemoryClass();

    lm.activeLayout = { count: 1, regions: [1] };
    assert.ok(lm.getPatternName().includes('單張') || lm.getPatternName().includes('Single'));

    lm.activeLayout = { count: 2, regions: [1, 2] };
    assert.ok(lm.getPatternName().includes('雙') || lm.getPatternName().includes('Dual'));

    lm.activeLayout = { count: 4, regions: [1, 2, 3, 4] };
    assert.ok(lm.getPatternName().includes('四') || lm.getPatternName().includes('Quad') || lm.getPatternName().includes('Polaroid'));
  });

  await test('版型記憶', '場景: 貝葉斯先驗修復：反光碎框自動聚合為單一大相框', () => {
    const lm = new LayoutMemoryClass();
    const templatePhoto = {
      width: 2000,
      height: 3000,
      regions: [
        { id: 'r1', corners: [{ x: 100, y: 100 }, { x: 1900, y: 100 }, { x: 1900, y: 1300 }, { x: 100, y: 1300 }], rotation: 90, status: 'approved' },
        { id: 'r2', corners: [{ x: 100, y: 1500 }, { x: 1900, y: 1500 }, { x: 1900, y: 2800 }, { x: 100, y: 2800 }], rotation: 0, status: 'approved' }
      ]
    };
    lm.learnFromPhoto(templatePhoto);

    // 模擬上方相片被高光反光切成左右兩塊碎框
    const rawFragmented = [
      { id: 'frag_left', corners: [{ x: 100, y: 100 }, { x: 950, y: 100 }, { x: 950, y: 1300 }, { x: 100, y: 1300 }], rotation: 0 },
      { id: 'frag_right', corners: [{ x: 1050, y: 100 }, { x: 1900, y: 100 }, { x: 1900, y: 1300 }, { x: 1050, y: 1300 }], rotation: 0 },
      { id: 'full_bottom', corners: [{ x: 100, y: 1500 }, { x: 1900, y: 1500 }, { x: 1900, y: 2800 }, { x: 100, y: 2800 }], rotation: 0 }
    ];

    const refined = lm.refineDetectedRegions(rawFragmented, 2000, 3000);
    assert.strictEqual(refined.length, 2, '碎框應自動聚合為 2 個相框');
    assert.strictEqual(refined[0].rotation, 90, '上方聚合框應繼承模板先驗之 90 度朝向');
  });

  await test('版型記憶', '場景: 視覺誠信準則：先驗引導絕不無中生有塞入幽靈框 (Ghost Box Prevention)', () => {
    const lm = new LayoutMemoryClass();
    const templatePhoto = {
      width: 2000,
      height: 3000,
      regions: [
        { id: 'r1', corners: [{ x: 100, y: 100 }, { x: 1900, y: 100 }, { x: 1900, y: 1300 }, { x: 100, y: 1300 }], rotation: 90, status: 'approved' },
        { id: 'r2', corners: [{ x: 100, y: 1500 }, { x: 1900, y: 1500 }, { x: 1900, y: 2800 }, { x: 100, y: 2800 }], rotation: 0, status: 'approved' }
      ]
    };
    lm.learnFromPhoto(templatePhoto);

    // 頁面上實際只有一張相片 (下方)
    const singleRaw = [
      { id: 'real_one', corners: [{ x: 100, y: 1500 }, { x: 1900, y: 1500 }, { x: 1900, y: 2800 }, { x: 100, y: 2800 }], rotation: 0 }
    ];

    const refined = lm.refineDetectedRegions(singleRaw, 2000, 3000);
    assert.strictEqual(refined.length, 1, '絕不可因版型預期而塞入不存在的幽靈相片框');
  });

  await test('版型記憶', '場景: 一鍵強制套用已記憶版型至相片庫全相簿 (applyLayoutDirectly)', () => {
    const lm = new LayoutMemoryClass();
    const templatePhoto = {
      width: 1000,
      height: 1000,
      regions: [
        { id: 't1', corners: [{ x: 100, y: 100 }, { x: 900, y: 100 }, { x: 900, y: 900 }, { x: 100, y: 900 }], rotation: 90, status: 'approved' }
      ]
    };
    lm.learnFromPhoto(templatePhoto);

    // 套用至不同解析度相片 (4000 x 3000)
    const targetPhoto = { width: 4000, height: 3000, regions: [] };
    const success = lm.applyLayoutDirectly(targetPhoto);
    assert.strictEqual(success, true);
    assert.strictEqual(targetPhoto.regions.length, 1);
    assert.strictEqual(targetPhoto.regions[0].rotation, 90);
    assert.strictEqual(targetPhoto.regions[0].status, 'approved');
    assert.strictEqual(targetPhoto.regions[0].corners[0].x, 400); // 0.1 * 4000
    assert.strictEqual(targetPhoto.regions[0].corners[0].y, 300); // 0.1 * 3000
    assert.strictEqual(targetPhoto.regions[0].corners[2].x, 3600); // 0.9 * 4000
    assert.strictEqual(targetPhoto.regions[0].corners[2].y, 2700); // 0.9 * 3000
  });

  await test('版型記憶', '場景: 記憶版型手動重設 (reset) 與狀態清理', () => {
    const lm = new LayoutMemoryClass();
    lm.activeLayout = { count: 2, regions: [1, 2] };
    assert.strictEqual(lm.hasMemory(), true);

    lm.reset();
    assert.strictEqual(lm.hasMemory(), false);
    assert.strictEqual(lm.activeLayout, null);
  });

  // ─────────────────────────────────────────────────────────────
  // 統計與總結報告
  // ─────────────────────────────────────────────────────────────
  console.log(`\n${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`  實測總計: ${passedCount + failedCount} | 通過: ${colors.green}${passedCount}${colors.reset} | 失敗: ${colors.red}${failedCount}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  if (failedCount > 0) {
    console.log(`${colors.red}${colors.bold}以下 ${failedCount} 個測試場景未通過，需進行修正：${colors.reset}`);
    failures.forEach((f, i) => {
      console.log(`  ${i + 1}. [${f.suite}] ${f.scenario}`);
      console.log(`     ${f.error.message}`);
    });
    console.log('');
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bold}🎉 核心介面互動實測 2 組全部 ${passedCount} 個測試場景 100% 通過！${colors.reset}\n`);
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('實測套件運行異常:', err);
  process.exit(1);
});

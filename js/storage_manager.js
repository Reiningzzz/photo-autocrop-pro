/**
 * storage_manager.js - 斷點續做與本機持久化儲存管理器
 * 
 * 基於 IndexedDB，100% 離線本地儲存：
 * 1. 自動靜默備份：上傳照片、拉框、微調角點、旋轉擺正即時存檔
 * 2. 斷點續做：下次打開自動提示「恢復上次第 X/Y 張進度」
 * 3. 標註資料集匯出：匯出完整 Ground Truth JSON，供後期 AI 模型比對與學習訓練
 */

(function () {
  'use strict';

  const DB_NAME = 'PhotoAutoCropDB';
  const DB_VERSION = 2;
  const STORE_PHOTOS = 'photos';
  const STORE_SESSION = 'session_meta';
  const STORE_HISTORY = 'history_sessions';
  const MAX_HISTORY_COUNT = 5;

  let dbPromise = null;

  function getDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
          db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SESSION)) {
          db.createObjectStore(STORE_SESSION, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          db.createObjectStore(STORE_HISTORY, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  /**
   * 儲存整批照片與進度
   */
  async function saveSession(photos, activeIndex = 0) {
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_PHOTOS, STORE_SESSION], 'readwrite');
      const photoStore = tx.objectStore(STORE_PHOTOS);
      const sessionStore = tx.objectStore(STORE_SESSION);

      photoStore.clear();
      photos.forEach(p => {
        photoStore.put({
          id: p.id,
          name: p.name,
          fileBlob: p.fileBlob || null,
          thumbnailDataUrl: p.thumbnailDataUrl || null,
          width: p.width,
          height: p.height,
          regions: p.regions || []
        });
      });

      sessionStore.put({
        key: 'current_session',
        totalCount: photos.length,
        activeIndex,
        updatedAt: Date.now()
      });

      return new Promise((res, rej) => {
        tx.oncomplete = () => res(true);
        tx.onerror = () => rej(tx.error);
      });
    } catch (e) {
      console.warn('自動存檔失敗:', e);
      return false;
    }
  }

  /**
   * 載入上次未完成的 Session
   */
  async function loadSession() {
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_PHOTOS, STORE_SESSION], 'readonly');
      const photoStore = tx.objectStore(STORE_PHOTOS);
      const sessionStore = tx.objectStore(STORE_SESSION);

      const meta = await new Promise(res => {
        const req = sessionStore.get('current_session');
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(null);
      });

      if (!meta || !meta.totalCount) {
        return { hasSession: false, photos: [], activeIndex: 0 };
      }

      const photos = await new Promise(res => {
        const req = photoStore.getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => res([]);
      });

      return {
        hasSession: photos.length > 0,
        photos,
        activeIndex: meta.activeIndex || 0,
        updatedAt: meta.updatedAt
      };
    } catch (e) {
      return { hasSession: false, photos: [], activeIndex: 0 };
    }
  }

  let snapshotSeqCounter = 0;

  /**
   * 將指定工作階段打包封存至「歷史存檔庫 (最多保留5組)」
   * @param {Array} photos 
   * @param {number} activeIndex 
   * @param {string} label 備份原因標籤 (如 '清空前防呆備份' 或 '使用者手動備份')
   */
  async function archiveSession(photos, activeIndex = 0, label = null) {
    if (!photos || photos.length === 0) return false;
    const defaultLabel = (typeof window !== 'undefined' && window.i18n) ? window.i18n.t('snapshot_label_auto') : 'Auto Snapshot';
    const finalLabel = label || defaultLabel;
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_HISTORY], 'readwrite');
      const histStore = tx.objectStore(STORE_HISTORY);

      const allHist = await new Promise(res => {
        const req = histStore.getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => res([]);
      });

      // 依建立時間與序號嚴格排序 (舊到新)
      allHist.sort((a, b) => {
        if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
        return (a.seq || 0) - (b.seq || 0);
      });

      // 若達到 5 組上限，刪除最舊的
      while (allHist.length >= MAX_HISTORY_COUNT) {
        const oldest = allHist.shift();
        histStore.delete(oldest.id);
      }

      const totalRegions = photos.reduce((sum, p) => sum + (p.regions ? p.regions.length : 0), 0);
      const now = Date.now();
      const seq = ++snapshotSeqCounter;
      const locale = (typeof window !== 'undefined' && window.i18n) ? window.i18n.currentLocale : 'en-US';
      const newSnapshot = {
        id: `snap_${now}_${seq}_${Math.random().toString(36).substr(2, 4)}`,
        seq,
        label: finalLabel,
        createdAt: now,
        dateFormatted: new Date(now).toLocaleString(locale, { hour12: false }),
        totalPhotos: photos.length,
        totalRegions,
        firstThumb: photos[0] ? (photos[0].thumbnailDataUrl || '') : '',
        activeIndex,
        photos: photos.map(p => ({
          id: p.id,
          name: p.name,
          fileBlob: p.fileBlob || null,
          thumbnailDataUrl: p.thumbnailDataUrl || null,
          width: p.width,
          height: p.height,
          regions: JSON.parse(JSON.stringify(p.regions || []))
        }))
      };

      histStore.put(newSnapshot);
      return new Promise(res => { tx.oncomplete = () => res(newSnapshot); });
    } catch (e) {
      console.warn('歷史快照封存失敗:', e);
      return false;
    }
  }

  /**
   * 取得最近的歷史快照清單 (新到舊，最多 5 組)
   */
  async function getHistorySessions() {
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_HISTORY], 'readonly');
      const histStore = tx.objectStore(STORE_HISTORY);
      const all = await new Promise(res => {
        const req = histStore.getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => res([]);
      });
      return all.sort((a, b) => {
        if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
        return (b.seq || 0) - (a.seq || 0);
      });
    } catch (e) {
      return [];
    }
  }

  /**
   * 刪除指定的單一歷史快照
   */
  async function deleteHistorySession(snapshotId) {
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_HISTORY], 'readwrite');
      tx.objectStore(STORE_HISTORY).delete(snapshotId);
      return new Promise(res => { tx.oncomplete = () => res(true); });
    } catch (e) {
      console.warn('刪除快照失敗:', e);
      return false;
    }
  }

  /**
   * 清空所有本地存檔 (支援自動防呆封存，絕不丟失)
   */
  async function clearSession(photosToArchive = null, activeIndex = 0, label = null) {
    try {
      const defaultClearLabel = (typeof window !== 'undefined' && window.i18n) ? window.i18n.t('snapshot_label_pre_clear') : 'Pre-Clear Backup';
      const finalLabel = label || defaultClearLabel;
      // 終極防呆：若當前有照片，先無損封存進歷史庫
      if (photosToArchive && photosToArchive.length > 0) {
        await archiveSession(photosToArchive, activeIndex, finalLabel);
      }

      const db = await getDB();
      const tx = db.transaction([STORE_PHOTOS, STORE_SESSION], 'readwrite');
      tx.objectStore(STORE_PHOTOS).clear();
      tx.objectStore(STORE_SESSION).clear();
      return new Promise(res => { tx.oncomplete = () => res(true); });
    } catch (e) {
      return false;
    }
  }

  /**
   * 匯出標註數據集 (Ground Truth JSON)
   */
  async function exportDataset(photos) {
    const dataset = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      generator: 'PhotoAutoCrop-HumanAI',
      totalSourcePhotos: photos.length,
      items: photos.map(p => ({
        sourceName: p.name,
        imageWidth: p.width,
        imageHeight: p.height,
        regions: (p.regions || []).map(r => ({
          subIndex: r.subIndex,
          outputName: r.outputName,
          corners: r.corners,
          rotation: r.rotation,
          status: r.status,
          customAspectRatio: r.customAspectRatio || null
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `photo_annotations_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /**
   * ══════════════════════════════════════════════════════════════
   * 隨身專案引擎 (Sidecar Project Engine)
   * ══════════════════════════════════════════════════════════════
   * 產生輕量純文字專案進度物件 (含所有相片切片、四角座標、旋轉朝向、核准狀態、版型記憶)
   */
  function generateProjectData(photos, layoutMemory) {
    return {
      format: 'PhotoAutoCrop-Sidecar-Project',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      layoutMemory: (layoutMemory && layoutMemory.activeLayout) ? layoutMemory.activeLayout : null,
      totalPhotos: (photos || []).length,
      photos: (photos || []).map(p => ({
        id: p.id,
        name: p.name,
        width: p.width,
        height: p.height,
        regions: JSON.parse(JSON.stringify(p.regions || []))
      }))
    };
  }

  /**
   * 匯出隨身專案檔 (.project.json 或 .pacproj)
   */
  function exportSidecarProject(photos, layoutMemory, filename = 'photoautocrop.project.json') {
    const data = generateProjectData(photos, layoutMemory);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /**
   * 智慧還原專案進度 (以檔名精準比對現有相片)
   */
  function restoreProjectData(projectData, targetPhotos, layoutMemory) {
    if (!projectData || !Array.isArray(targetPhotos)) return 0;
    const sourcePhotos = projectData.photos || projectData.items || [];
    let restoredCount = 0;

    targetPhotos.forEach(p => {
      // 依檔名或 ID 比對
      const match = sourcePhotos.find(savedP => (savedP.name && savedP.name === p.name) || (savedP.sourceName && savedP.sourceName === p.name) || (savedP.id && savedP.id === p.id));
      if (match && Array.isArray(match.regions) && match.regions.length > 0) {
        p.regions = JSON.parse(JSON.stringify(match.regions));
        restoredCount++;
      }
    });

    // 恢復相簿版型記憶
    if (projectData.layoutMemory && layoutMemory) {
      layoutMemory.activeLayout = projectData.layoutMemory;
      layoutMemory.saveToStorage();
    }

    return restoredCount;
  }

  window.storageManager = {
    saveSession,
    loadSession,
    clearSession,
    archiveSession,
    getHistorySessions,
    deleteHistorySession,
    exportDataset,
    generateProjectData,
    exportSidecarProject,
    restoreProjectData
  };

})();

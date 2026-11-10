/**
 * scripts/capture_real_ui.js
 * 透過 Electron 直接無頭渲染 PhotoAutoCrop Pro 真實介面並截取像素級真實截圖
 */
const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

app.whenReady().then(async () => {
  const ses = session.fromPartition('clean_capture_' + Date.now());
  await ses.clearStorageData();

  const win = new BrowserWindow({
    width: 1600,
    height: 960,
    show: false,
    webPreferences: {
      session: ses,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const url = 'http://127.0.0.1:3300';
  console.log('[Capture] 正在載入乾淨產品頁面:', url);
  await win.loadURL(url);

  await new Promise(r => setTimeout(r, 2000));

  const testPhotoPath = path.join(__dirname, '..', 'samples', 'zhifamily (2).jpg');
  const photoBuffer = fs.readFileSync(testPhotoPath);
  const photoBase64 = photoBuffer.toString('base64');

  console.log('[Capture] 正在注入真實相片並重繪真實標記...');

  await win.webContents.executeJavaScript(`
    (async () => {
      localStorage.clear();
      try { indexedDB.deleteDatabase('PhotoAutoCropDB'); } catch(e){}

      // 關閉匯入時自動辨識，由我們精準注入對應 2 張老相片的角點
      const autoToggle = document.getElementById('autoDetectOnImportToggle');
      if (autoToggle) {
        autoToggle.checked = false;
        autoToggle.dispatchEvent(new Event('change'));
      }

      const b64 = '${photoBase64}';
      const byteCharacters = atob(b64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      const file = new File([blob], 'zhifamily_album_p02.jpg', { type: 'image/jpeg' });

      const dt = new DataTransfer();
      dt.items.add(file);
      const fileInput = document.getElementById('fileInput');
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change'));

      await new Promise(r => setTimeout(r, 1500));

      if (window.photos && window.photos.length > 0) {
        const photo = window.photos[0];
        const imgW = photo.width || 1200;
        const imgH = photo.height || 1600;

        // 相片 1 (上方橫式照片)
        const region1 = {
          id: 'r_1',
          subIndex: 1,
          outputName: 'zhifamily_album_p02_1.jpg',
          status: 'approved',
          approved: true,
          rotation: 90,
          corners: [
            { x: Math.round(imgW * 0.04), y: Math.round(imgH * 0.07) },
            { x: Math.round(imgW * 0.88), y: Math.round(imgH * 0.06) },
            { x: Math.round(imgW * 0.88), y: Math.round(imgH * 0.42) },
            { x: Math.round(imgW * 0.04), y: Math.round(imgH * 0.43) }
          ]
        };

        // 相片 2 (下方西湖渡假村合影)
        const region2 = {
          id: 'r_2',
          subIndex: 2,
          outputName: 'zhifamily_album_p02_2.jpg',
          status: 'approved',
          approved: true,
          rotation: 0,
          corners: [
            { x: Math.round(imgW * 0.02), y: Math.round(imgH * 0.52) },
            { x: Math.round(imgW * 0.95), y: Math.round(imgH * 0.52) },
            { x: Math.round(imgW * 0.96), y: Math.round(imgH * 0.98) },
            { x: Math.round(imgW * 0.02), y: Math.round(imgH * 0.98) }
          ]
        };

        photo.regions = [region1, region2];
        if (window.annotator) {
          window.annotator.regions = photo.regions;
          window.annotator.activeRegionId = 'r_2';
        }

        if (typeof syncRegionNames === 'function') syncRegionNames(photo);
        if (typeof renderRegionList === 'function') renderRegionList();
        if (typeof renderPhotosStrip === 'function') renderPhotosStrip();
        if (typeof updateTotalCounts === 'function') updateTotalCounts();
        if (window.annotator) window.annotator.resizeAndDraw();
        if (typeof updatePreview === 'function') await updatePreview(region2);
      }
    })();
  `);

  await new Promise(r => setTimeout(r, 2000));

  console.log('[Capture] 正在截取真實介面...');
  const image = await win.webContents.capturePage();
  const outPath = path.join(__dirname, '..', 'marketing', 'marketing_assets', 'real_ui_workspace.png');
  fs.writeFileSync(outPath, image.toPNG());
  console.log('[Capture] 產出真實 UI 截圖:', outPath);

  // 同步更新 05_feature_pro_workflow.jpg
  const feature5Path = path.join(__dirname, '..', 'marketing', 'marketing_assets', '05_feature_pro_workflow.jpg');
  fs.writeFileSync(feature5Path, image.toJPEG(95));
  console.log('[Capture] 已更新 05_feature_pro_workflow.jpg');

  // 取出右側 cropPreviewCanvas 拉平的真實合影切片
  const previewDataUrl = await win.webContents.executeJavaScript(`
    (() => {
      const cvs = document.getElementById('cropPreviewCanvas');
      return cvs ? cvs.toDataURL('image/jpeg', 0.95) : null;
    })();
  `);

  if (previewDataUrl) {
    const base64Data = previewDataUrl.replace(/^data:image\/jpeg;base64,/, '');
    const croppedOutPath = path.join(__dirname, '..', 'marketing', 'marketing_assets', 'real_cropped_sample.jpg');
    fs.writeFileSync(croppedOutPath, Buffer.from(base64Data, 'base64'));
    console.log('[Capture] 產出真實拉平裁切切片:', croppedOutPath);
  }

  win.close();
  app.quit();
});

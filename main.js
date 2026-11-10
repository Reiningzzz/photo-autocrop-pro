const { app, BrowserWindow, shell, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const debugLogPath = path.join(os.homedir(), 'photoautocrop_debug.log');
function log(msg) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(debugLogPath, '[' + timestamp + '] ' + msg + '\n');
  } catch {}
}
log('啟動參數: ' + process.argv.join(' '));

process.on('uncaughtException', (err) => {
  log('uncaughtException: ' + (err.stack || err));
});
process.on('unhandledRejection', (reason) => {
  log('unhandledRejection: ' + reason);
});

// 標記當前為 Electron 環境，避免 server.js 自行調用 startServer，並鎖定生產商業防護
process.env.IS_ELECTRON = 'true';
if (app.isPackaged || !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const { startServer } = require('./server');

let mainWindow = null;
const SERVER_PORT = 3300;
let activeServerPort = SERVER_PORT;
let isServerReady = false;

/**
 * 設置跨平台系統選單：
 * - macOS: 必須包含標準 Edit 選單以支援 Cmd+C/Cmd+V 剪貼簿與 Cmd+Q 退出
 * - Windows/Linux: 移除頂部選單欄，保持介面簡潔專業
 */
function setupApplicationMenu() {
  if (process.platform === 'darwin') {
    const template = [
      {
        label: app.name || 'PhotoAutoCrop Pro',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { role: 'close' }
        ]
      }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  } else {
    Menu.setApplicationMenu(null);
  }
}

function createWindow(port) {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, 'build', 'icon.ico')
    : path.join(__dirname, 'build', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1024,
    minHeight: 680,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#161618',
    title: 'PhotoAutoCrop Pro — Batch Photo Cropper & Perspective Dewarp Workstation',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  // 載入本地伺服器
  const appUrl = 'http://localhost:' + port;
  mainWindow.loadURL(appUrl);

  // 攔截所有新視窗彈出與外連，一律使用使用者的預設瀏覽器打開
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(appUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 接收 IPC 外部鏈接開啟請求
ipcMain.on('open-external', (event, url) => {
  if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
    shell.openExternal(url);
  }
});

// 動態更新視窗標題 (支援多語言即時切換)
ipcMain.on('set-title', (event, title) => {
  if (mainWindow && typeof title === 'string') {
    mainWindow.setTitle(title);
  }
});

// 提供應用程式版本號給前端
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// 彈出系統原生資料夾選取器 (專業直出管線)
ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null;
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Destination Folder for Direct Photo Export',
    properties: ['openDirectory', 'createDirectory']
  });
  if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
    return null;
  }
  return res.filePaths[0];
});

// 在系統檔案總管 / Finder 中開啟指定資料夾
ipcMain.handle('open-path', async (event, folderPath) => {
  if (folderPath && typeof folderPath === 'string') {
    return shell.openPath(folderPath);
  }
  return false;
});

// 當 Electron 完成準備後
app.whenReady().then(() => {
  log('app.whenReady 觸發');
  setupApplicationMenu();

  try {
    startServer(SERVER_PORT, (err, res) => {
      if (err) {
        log('啟動本地伺服器失敗: ' + (err.message || err));
        app.quit();
        return;
      }
      activeServerPort = res.port;
      isServerReady = true;
      log('本地伺服器已啟動在 port ' + activeServerPort);
      try {
        createWindow(activeServerPort);
        log('createWindow 完成');
      } catch (cwErr) {
        log('createWindow 拋出異常: ' + (cwErr.stack || cwErr));
      }
    });
  } catch (err) {
    log('startServer 呼叫異常: ' + (err.stack || err));
  }

  app.on('activate', () => {
    if (isServerReady && BrowserWindow.getAllWindows().length === 0) {
      createWindow(activeServerPort);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

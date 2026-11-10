const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      ipcRenderer.send('open-external', url);
    }
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openDirectoryDialog: () => ipcRenderer.invoke('select-directory'),
  openPath: (folderPath) => ipcRenderer.invoke('open-path', folderPath),
  setTitle: (title) => ipcRenderer.send('set-title', title),
  isElectron: true
});
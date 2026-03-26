const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  
  // Управление окном
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
  hide: () => ipcRenderer.send('hide-window'),
  show: () => ipcRenderer.send('show-window'),
  
  // Уведомления
  showNotification: (title, body) => {
    ipcRenderer.send('show-notification', { title, body });
  },
  
  // Получение информации о системе
  getSystemInfo: () => ({
    platform: process.platform,
    arch: process.arch,
    version: process.version,
    isPackaged: process.env.NODE_ENV === 'production'
  })
});
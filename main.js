const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

let mainWindow;

// Создание окна приложения
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    titleBarStyle: 'default',
    backgroundColor: '#ffffff',
    show: false,
    frame: true,
    autoHideMenuBar: true  // Скрывает меню, но можно показать Alt
  });

  // Полностью убираем меню
  mainWindow.setMenuBarVisibility(false);
  
  // Или если нужно полностью удалить меню:
  // mainWindow.removeMenu();

  // Загружаем ваш уже запущенный сайт
  mainWindow.loadURL('http://78.40.188.120:3000');

  // Показываем окно когда загрузится
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Открываем DevTools в режиме разработки (закомментировать для релиза)
  // mainWindow.webContents.openDevTools();

  // Обработка внешних ссылок
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Обработка закрытия окна
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Инициализация приложения (без создания меню)
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Предотвращаем множественный запуск
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
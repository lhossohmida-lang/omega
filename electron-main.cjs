const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// =============================================================================
//  OMEGA — Electron Main Process
//  Opens the OMEGA POS web app in a native desktop window.
// =============================================================================

let mainWindow;

const fs = require('fs');

function createWindow() {
  const iconPath = fs.existsSync(path.join(__dirname, 'dist', 'logo.png'))
    ? path.join(__dirname, 'dist', 'logo.png')
    : fs.existsSync(path.join(__dirname, 'logo.png'))
    ? path.join(__dirname, 'logo.png')
    : path.join(__dirname, 'public', 'logo.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: 'أوميغا — OMEGA',
    icon: iconPath,
    backgroundColor: '#f8f9fa',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    frame: true,
    autoHideMenuBar: true,
    titleBarStyle: 'default'
  });

  // Load the Vercel-deployed PWA when no local build is bundled.
  const VERCEL_URL = 'https://omega-gules-nine.vercel.app';
  const LOCAL_BUILD  = path.join(__dirname, 'dist', 'index.html');

  // Try local dist first, fall back to Vercel URL.
  if (fs.existsSync(LOCAL_BUILD)) {
    mainWindow.loadFile(LOCAL_BUILD);
  } else {
    mainWindow.loadURL(VERCEL_URL);
  }

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const { BrowserWindow, Menu } = require('electron');
const path = require('path');

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true
  });

  win.loadFile(path.join(__dirname, '..', '..', 'renderer', 'index.html'));
  // Remove the menu bar entirely
  try {
    Menu.setApplicationMenu(null);
    win.setMenuBarVisibility(false);
  } catch {}
  return win;
}

module.exports = { createMainWindow };

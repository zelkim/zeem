const { app, dialog } = require('electron');
const path = require('path');
const { Database } = require('./services/db');
const { Scheduler } = require('./services/scheduler');
const { joinZoom, leaveZoom, isZoomRunning } = require('./services/zoom');
const { createMainWindow } = require('./windows/mainWindow');
const { registerMeetingsIpc } = require('./ipc/meetings.ipc');
const { registerZoomIpc } = require('./ipc/zoom.ipc');

let mainWindow;
let db;
let scheduler;

// Notify function always targets the current window reference
function notify(evt) {
  if (mainWindow) {
    mainWindow.webContents.send('scheduler:event', evt);
  }
}

app.whenReady().then(async () => {
  try {
  db = await Database.create(path.join(app.getPath('userData'), 'zeem.sqlite'));
  mainWindow = createMainWindow();
  mainWindow.on('closed', () => { mainWindow = null; });
  scheduler = new Scheduler(db, joinZoom, leaveZoom, notify, isZoomRunning);

    registerMeetingsIpc(db, scheduler);
    registerZoomIpc({ joinZoom, leaveZoom });
  } catch (e) {
    console.error('Failed to init app', e);
    dialog.showErrorBox('Initialization Error', String(e && e.stack || e));
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!mainWindow) {
    mainWindow = createMainWindow();
    mainWindow.on('closed', () => { mainWindow = null; });
  }
});

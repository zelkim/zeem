const { app, dialog } = require('electron');
const isDev = require('electron-is-dev');
let log;
try {
  log = require('electron-log').default;
  log.transports.file.level = 'info';
} catch (e) {
  log = console;
}

// Lazy require to avoid bundler issues in dev
const { autoUpdater } = require('electron-updater');

function wireAutoUpdaterEvents(mainWindow) {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true; // download as soon as update found

  autoUpdater.on('checking-for-update', () => log.info('Updater: checking for update...'));
  autoUpdater.on('update-available', (info) => {
    log.info('Updater: update available', info && info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update:available', info);
    }
  });
  autoUpdater.on('update-not-available', (info) => {
    log.info('Updater: no update available');
    if (mainWindow) {
      mainWindow.webContents.send('update:not-available', info);
    }
  });
  autoUpdater.on('download-progress', (progress) => {
    log.info(`Updater: download ${Math.round(progress.percent || 0)}%`);
    if (mainWindow) {
      mainWindow.webContents.send('update:progress', progress);
    }
  });
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Updater: update downloaded. Quitting and installing...');
    // Optionally prompt before install; for fully automatic we proceed immediately
    try {
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
    } catch (e) {
      log.error('Updater: quitAndInstall failed', e);
      try { dialog.showErrorBox('Update Error', String(e)); } catch (_) {}
    }
  });
  autoUpdater.on('error', (err) => {
    log.error('Updater error', err);
    if (mainWindow) {
      mainWindow.webContents.send('update:error', String(err));
    }
  });
}

async function checkForUpdates(mainWindow) {
  try {
    if (isDev) {
      log.info('Updater: skipping auto update in dev');
      return;
    }
    wireAutoUpdaterEvents(mainWindow);
    await autoUpdater.checkForUpdates();
  } catch (e) {
    log.error('Updater: checkForUpdates failed', e);
  }
}

module.exports = {
  checkForUpdates,
};

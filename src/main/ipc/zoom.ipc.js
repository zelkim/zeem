const { ipcMain } = require('electron');

function registerZoomIpc(zoom) {
  ipcMain.handle('zoom:join', async (_e, url) => zoom.joinZoom(url));
  ipcMain.handle('zoom:leave', async () => zoom.leaveZoom());
}

module.exports = { registerZoomIpc };

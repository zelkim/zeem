const { ipcMain } = require('electron');

function registerMeetingsIpc(db, scheduler) {
  ipcMain.handle('meetings:list', async () => db.listMeetings());

  ipcMain.handle('meetings:create', async (_e, item) => {
    const created = db.createMeeting(item);
    scheduler.refresh();
    return created;
  });

  ipcMain.handle('meetings:update', async (_e, item) => {
    const updated = db.updateMeeting(item);
    scheduler.refresh();
    return updated;
  });

  ipcMain.handle('meetings:delete', async (_e, id) => {
    db.deleteMeeting(id);
    scheduler.refresh();
    return { ok: true };
  });

  ipcMain.handle('meetings:toggle', async (_e, id, enabled) => {
    db.setEnabled(id, enabled);
    scheduler.refresh();
    return { ok: true };
  });

  // Scheduler status snapshot for initial render
  ipcMain.handle('scheduler:status', async () => scheduler.snapshot());
}

module.exports = { registerMeetingsIpc };

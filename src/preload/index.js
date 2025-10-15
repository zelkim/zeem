const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zeem', {
  listMeetings: () => ipcRenderer.invoke('meetings:list'),
  createMeeting: (m) => ipcRenderer.invoke('meetings:create', m),
  updateMeeting: (m) => ipcRenderer.invoke('meetings:update', m),
  deleteMeeting: (id) => ipcRenderer.invoke('meetings:delete', id),
  toggleMeeting: (id, enabled) => ipcRenderer.invoke('meetings:toggle', id, enabled),
  getStatus: () => ipcRenderer.invoke('scheduler:status'),
  joinNow: (url) => ipcRenderer.invoke('zoom:join', url),
  leaveNow: () => ipcRenderer.invoke('zoom:leave'),
  onSchedulerEvent: (cb) => ipcRenderer.on('scheduler:event', (_e, evt) => cb(evt))
});

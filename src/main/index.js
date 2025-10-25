const { app, dialog, Tray, Menu, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const { Database } = require('./services/db');
const { Scheduler } = require('./services/scheduler');
const { joinZoom, leaveZoom, isZoomRunning } = require('./services/zoom');
const { createMainWindow } = require('./windows/mainWindow');
const { registerMeetingsIpc } = require('./ipc/meetings.ipc');
const { registerZoomIpc } = require('./ipc/zoom.ipc');
const { checkForUpdates } = require('./services/updater');

let mainWindow;
let db;
let scheduler;
let tray;
let isQuitting = false;

// Notify function always targets the current window reference
function notify(evt) {
  if (mainWindow) {
    mainWindow.webContents.send('scheduler:event', evt);
  }
  // Refresh tray menu on scheduler status changes
  try { updateTrayMenu(); } catch {}
}

app.whenReady().then(async () => {
  try {
    // Init database first
    db = await Database.create(path.join(app.getPath('userData'), 'zeem.sqlite'));

    // Kill Zoom on startup before any scheduling/join attempts
    try {
      await leaveZoom();
    } catch (e) {
      console.warn('[startup] leaveZoom error (continuing)', e);
    }

    // Initialize scheduler (safe to exist before window; notify is guarded)
    scheduler = new Scheduler(db, joinZoom, leaveZoom, notify, isZoomRunning);

    // Register IPC handlers BEFORE creating the window to avoid race with renderer
    registerMeetingsIpc(db, scheduler);
    registerZoomIpc({ joinZoom, leaveZoom });

    // Now create the UI window
    mainWindow = createMainWindow();
    // Minimize to tray on minimize
    mainWindow.on('minimize', (e) => {
      e.preventDefault();
      mainWindow.hide();
    });
    // Minimize to tray on close (X), unless quitting explicitly
    mainWindow.on('close', (e) => {
      if (!isQuitting) {
        e.preventDefault();
        mainWindow.hide();
      }
    });
    mainWindow.on('closed', () => { mainWindow = null; });

    // Trigger auto-update check (skips in dev)
    checkForUpdates(mainWindow);

    // Create system tray
    createTray();
    updateTrayMenu();
  } catch (e) {
    console.error('Failed to init app', e);
    dialog.showErrorBox('Initialization Error', String(e && e.stack || e));
    app.quit();
  }
});

// Keep app running in tray even when all windows are closed
app.on('window-all-closed', () => {
  // Do nothing to keep tray alive; quit only from tray Exit or on mac explicit quit
});

app.on('activate', () => {
  if (!mainWindow) {
    mainWindow = createMainWindow();
    mainWindow.on('minimize', (e) => {
      e.preventDefault();
      mainWindow.hide();
    });
    mainWindow.on('close', (e) => {
      if (!isQuitting) {
        e.preventDefault();
        mainWindow.hide();
      }
    });
    mainWindow.on('closed', () => { mainWindow = null; });
  }
});

// ---- Tray helpers ----
function loadTrayImage() {
  // Try a set of candidates, return the first non-empty image
  const candidates = [];
  if (app.isPackaged) {
    candidates.push(
      path.join(process.resourcesPath, 'icons', 'icon.ico'),
      path.join(process.resourcesPath, 'icon.ico'),
      path.join(process.resourcesPath, 'icons', 'icon.png'),
      path.join(process.resourcesPath, 'icon.png')
    );
  } else {
    const root = app.getAppPath();
    candidates.push(
      path.join(root, 'icon.ico'),
      path.join(root, 'icon.png'),
      path.join(root, 'build', 'icon.ico'),
      path.join(root, 'build', 'icon.png')
    );
  }
  for (const p of candidates) {
    try {
      const img = nativeImage.createFromPath(p);
      if (img && !img.isEmpty()) return img;
    } catch {}
  }
  return null;
}

function createTray() {
  try {
    const image = loadTrayImage();
    tray = new Tray(image || nativeImage.createEmpty());
  } catch {
    // As a fallback, try without icon (may show default)
    tray = new Tray(nativeImage.createEmpty());
  }
  tray.setToolTip('Zeem');
  tray.on('click', () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
  });
  tray.on('right-click', () => {
    // Rebuild to ensure fresh upcoming list
    updateTrayMenu();
    const menu = tray.getContextMenu();
    if (menu) tray.popUpContextMenu(menu);
  });
}

function updateTrayMenu() {
  if (!tray || !db) return;
  const upcomingItems = buildUpcomingSubmenu();
  const menu = Menu.buildFromTemplate([
    { label: 'Zeem', enabled: false },
    { type: 'separator' },
    { label: 'Upcoming Classes', submenu: upcomingItems, enabled: upcomingItems.length > 0 },
    { type: 'separator' },
    {
      label: 'Show',
      click: () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
      }
    },
    {
      label: 'Exit',
      click: () => {
        isQuitting = true;
        // Close window first so close handlers don't intercept
        if (mainWindow) {
          try { mainWindow.destroy(); } catch {}
        }
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(menu);
}

function buildUpcomingSubmenu(limit = 5) {
  try {
    const now = new Date();
    const meetings = (db.upcomingAndOngoing(now.toISOString()) || []).filter(m => m.enabled);
    const parseHM = (hm) => {
      const [h, m] = String(hm).split(':').map(n => parseInt(n, 10));
      return { h: h || 0, m: m || 0 };
    };
    const nextOccurrence = (dow, hm, from = now) => {
      const { h, m } = parseHM(hm);
      const d = new Date(from);
      const delta = (dow - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + delta);
      d.setHours(h, m, 0, 0);
      if (d <= from) d.setDate(d.getDate() + 7);
      return d;
    };
    const formatTime = (d) => {
      let h = d.getHours();
      const m = d.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12; if (h === 0) h = 12;
      const mm = String(m).padStart(2, '0');
      return `${h}:${mm} ${ampm}`;
    };
    const trunc = (s, n) => (s && s.length > n ? s.slice(0, n) + '…' : s || 'Untitled');

    const upcoming = meetings
      .map(m => ({ ...m, start: nextOccurrence(m.weekday, m.start_hm) }))
      .filter(x => x.start > now)
      .sort((a, b) => a.start - b.start)
      .slice(0, limit);

    if (!upcoming.length) {
      return [ { label: 'No upcoming', enabled: false } ];
    }
    return upcoming.map(m => ({
      label: `${trunc(m.title, 10)} - ${formatTime(m.start)}`,
      enabled: false
    }));
  } catch (e) {
    console.warn('[tray] buildUpcomingSubmenu error', e);
    return [ { label: 'Unavailable', enabled: false } ];
  }
}

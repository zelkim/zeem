const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let zoomProcess = null;

function joinZoom(url) {
  return new Promise((resolve, reject) => {
    try {
      const appData = process.env.APPDATA || 'C:/Users/User/AppData/Roaming';
      const candidates = [
        path.join(appData, 'Zoom', 'bin', 'Zoom.exe'),
        'C:/Program Files/Zoom/bin/Zoom.exe',
        'C:/Program Files (x86)/Zoom/bin/Zoom.exe'
      ];
      const zoomPath = candidates.find(p => fs.existsSync(p));
      if (!zoomPath) {
        const msg = `Zoom executable not found in candidates: ${candidates.join(' | ')}`;
        console.error('[joinZoom] ERROR', msg);
        return reject(new Error(msg));
      }

      const zoomArgs = [ `--url=${url}` ];
      console.log('[joinZoom] Launching', { zoomPath, args: zoomArgs });
      const child = spawn(zoomPath, zoomArgs, { windowsHide: false, detached: false });
      zoomProcess = child;
      child.on('error', (err) => {
        console.error('[joinZoom] spawn error', err);
        reject(err);
      });
      child.on('spawn', () => {
        console.log('[joinZoom] spawned OK');
        resolve({ ok: true });
      });
      child.on('exit', (code, signal) => {
        console.log('[joinZoom] child exited', { code, signal });
      });
    } catch (err) {
      console.error('[joinZoom] exception', err);
      reject(err);
    }
  });
}

function leaveZoom() {
  return new Promise((resolve) => {
    console.log('[leaveZoom] Attempting to kill Zoom.exe');
    const cmd = process.env.ComSpec || 'C:/Windows/System32/cmd.exe';
    const args = ['/d', '/s', '/c', 'taskkill /IM Zoom.exe /F'];
    const child = spawn(cmd, args, { windowsHide: true });
    child.on('close', (code) => {
      console.log('[leaveZoom] taskkill exit code', code);
      resolve({ ok: true });
    });
    child.on('error', (err) => {
      console.error('[leaveZoom] error', err);
      resolve({ ok: false });
    });
  });
}

function isZoomRunning() {
  return new Promise((resolve) => {
    try {
      const tasklist = path.join(process.env.SystemRoot || 'C:/Windows', 'System32', 'tasklist.exe');
      const args = ['/FI', 'IMAGENAME eq Zoom.exe', '/FO', 'CSV', '/NH'];
      let out = '';
      let err = '';
      const child = spawn(tasklist, args, { windowsHide: true });
      child.stdout.on('data', (d) => { out += d.toString(); });
      child.stderr.on('data', (d) => { err += d.toString(); });
      child.on('close', () => {
        const text = (out + '\n' + err).trim();
        if (!text || /^info:/i.test(text)) {
          console.log('[isZoomRunning] none (INFO or empty)');
          return resolve(false);
        }
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const zoomLines = lines.filter(l => /^"?Zoom\.exe"?,/i.test(l) || l.toLowerCase().startsWith('zoom.exe'));
        const running = zoomLines.length > 0;
        console.log('[isZoomRunning] lines:', lines.length, 'zoomLines:', zoomLines.length, 'running:', running);
        resolve(running);
      });
      child.on('error', (e) => {
        console.error('[isZoomRunning] spawn error', e);
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

module.exports = { joinZoom, leaveZoom, isZoomRunning };

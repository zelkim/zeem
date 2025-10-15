const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js/dist/sql-wasm.js');

class Database {
  static async create(filePath) {
    const locateFile = (file) => {
      // In dev, node_modules exists relative to cwd; in production, prefer a path inside app resources
      // sql.js needs to load sql-wasm.wasm; electron-builder packs it into asar unless configured.
      // We'll reference from app.asar.unpacked if available, else fall back to node_modules.
      const devPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file);
      const prodPath = path.join(process.resourcesPath || process.cwd(), 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', file);
      try {
        if (fs.existsSync(prodPath)) return prodPath;
      } catch {}
      return devPath;
    };
    const SQL = await initSqlJs({ locateFile });
    let db;
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      db = new SQL.Database(new Uint8Array(buf));
    } else {
      db = new SQL.Database();
    }
    const instance = new Database(db, filePath);
    instance.migrate();
    instance.persist();
    return instance;
  }

  constructor(db, filePath) {
    this.db = db;
    this.filePath = filePath;
  }

  migrate() {
    // Base table (original schema)
    this.db.run(`
      create table if not exists meetings (
        id integer primary key,
        title text not null,
        url text not null,
        start_time text not null,
        end_time text not null,
        enabled integer not null default 1
      );
      create index if not exists idx_meetings_start on meetings(start_time);
      create index if not exists idx_meetings_enabled on meetings(enabled);
    `);

    // Add new weekly scheduling columns if missing: weekday (0-6), start_hm (HH:MM), end_hm (HH:MM)
    const cols = this.db.exec("PRAGMA table_info('meetings')");
    const colNames = (cols && cols[0] && cols[0].values ? cols[0].values.map(v => v[1]) : []);
    const hasWeekday = colNames.includes('weekday');
    const hasStartHM = colNames.includes('start_hm');
    const hasEndHM = colNames.includes('end_hm');
    if (!hasWeekday) this.db.run("ALTER TABLE meetings ADD COLUMN weekday integer not null default 1");
    if (!hasStartHM) this.db.run("ALTER TABLE meetings ADD COLUMN start_hm text not null default '09:00'");
    if (!hasEndHM) this.db.run("ALTER TABLE meetings ADD COLUMN end_hm text not null default '10:00'");

    // Best-effort migration: if start_time/end_time look like ISO datetimes and new columns were just added, derive weekday and times
    if (!hasWeekday || !hasStartHM || !hasEndHM) {
      try {
        const stmt = this.db.prepare('select id, start_time, end_time from meetings');
        const toUpdate = [];
        while (stmt.step()) {
          const row = stmt.getAsObject();
          if (row.start_time && row.end_time) {
            const sd = new Date(row.start_time);
            const ed = new Date(row.end_time);
            if (!isNaN(sd.getTime()) && !isNaN(ed.getTime())) {
              const pad = (n) => String(n).padStart(2, '0');
              const weekday = sd.getDay(); // 0 (Sun) - 6 (Sat)
              const start_hm = `${pad(sd.getHours())}:${pad(sd.getMinutes())}`;
              const end_hm = `${pad(ed.getHours())}:${pad(ed.getMinutes())}`;
              toUpdate.push({ id: row.id, weekday, start_hm, end_hm });
            }
          }
        }
        stmt.free();
        const upd = this.db.prepare('update meetings set weekday=?, start_hm=?, end_hm=? where id=?');
        for (const r of toUpdate) upd.run([r.weekday, r.start_hm, r.end_hm, r.id]);
        upd.free();
      } catch (e) {
        // non-fatal
        console.warn('[db] migration weekly columns warning', e);
      }
    }
  }

  persist() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, buffer);
  }

  listMeetings() {
    const stmt = this.db.prepare('select * from meetings order by weekday asc, start_hm asc');
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows.map(this._mapRow);
  }

  createMeeting(item) {
    const { title, url, enabled = 1 } = item;
    // Support both legacy payload (start_time/end_time) and new (weekday/start_hm/end_hm)
    const { weekday, start_hm, end_hm } = this._normalizeWeekly(item);
    // Persist legacy fields too for backward compatibility (not used by new scheduler)
    const { start_time, end_time } = this._deriveIsoFromWeekly(weekday, start_hm, end_hm);
    const stmt = this.db.prepare('insert into meetings (title, url, start_time, end_time, enabled, weekday, start_hm, end_hm) values (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run([title, url, start_time, end_time, enabled ? 1 : 0, weekday, start_hm, end_hm]);
    stmt.free();
    this.persist();
    const id = this.db.exec('select last_insert_rowid() as id')[0].values[0][0];
    return { id, title, url, start_time, end_time, enabled: !!enabled, weekday, start_hm, end_hm };
  }

  updateMeeting(item) {
    const { id, title, url, enabled } = item;
    const { weekday, start_hm, end_hm } = this._normalizeWeekly(item);
    const { start_time, end_time } = this._deriveIsoFromWeekly(weekday, start_hm, end_hm);
    const stmt = this.db.prepare('update meetings set title=?, url=?, start_time=?, end_time=?, enabled=?, weekday=?, start_hm=?, end_hm=? where id=?');
    stmt.run([title, url, start_time, end_time, enabled ? 1 : 0, weekday, start_hm, end_hm, id]);
    stmt.free();
    this.persist();
    return { id, title, url, start_time, end_time, enabled: !!enabled, weekday, start_hm, end_hm };
  }

  deleteMeeting(id) {
    const stmt = this.db.prepare('delete from meetings where id=?');
    stmt.run([id]);
    stmt.free();
    this.persist();
  }

  setEnabled(id, enabled) {
    const stmt = this.db.prepare('update meetings set enabled=? where id=?');
    stmt.run([enabled ? 1 : 0, id]);
    stmt.free();
    this.persist();
  }

  // Legacy helper kept for compatibility but now simply returns enabled meetings mapped
  upcomingAndOngoing(_nowIso) {
    const stmt = this.db.prepare('select * from meetings order by weekday asc, start_hm asc');
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows.map(this._mapRow);
  }

  _mapRow(row) {
    return {
      id: row.id,
      title: row.title,
      url: row.url,
      start_time: row.start_time,
      end_time: row.end_time,
      enabled: !!row.enabled,
      weekday: row.weekday,
      start_hm: row.start_hm,
      end_hm: row.end_hm,
    };
  }

  _normalizeWeekly(item) {
    // Accept either weekday/start_hm/end_hm or derive from ISO datetimes
    if (item.weekday != null && item.start_hm && item.end_hm) {
      return { weekday: Number(item.weekday), start_hm: String(item.start_hm), end_hm: String(item.end_hm) };
    }
    if (item.start_time && item.end_time) {
      const sd = new Date(item.start_time);
      const ed = new Date(item.end_time);
      const pad = (n) => String(n).padStart(2, '0');
      return {
        weekday: sd.getDay(),
        start_hm: `${pad(sd.getHours())}:${pad(sd.getMinutes())}`,
        end_hm: `${pad(ed.getHours())}:${pad(ed.getMinutes())}`,
      };
    }
    // Fallback defaults
    return { weekday: new Date().getDay(), start_hm: '09:00', end_hm: '10:00' };
  }

  _deriveIsoFromWeekly(weekday, start_hm, end_hm) {
    // Compute ISO datetimes for the next occurrence from now using weekday and HH:MM
    const now = new Date();
    const next = (targetDow, hm) => {
      const [h, m] = String(hm).split(':').map(n => parseInt(n, 10));
      // Start from today at given time
      const d = new Date(now);
      const delta = (targetDow - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + delta);
      d.setHours(h, m || 0, 0, 0);
      if (d <= now) {
        // if in the past today, move one week ahead
        d.setDate(d.getDate() + 7);
      }
      return d.toISOString();
    };
    return { start_time: next(weekday, start_hm), end_time: next(weekday, end_hm) };
  }
}

module.exports = { Database };

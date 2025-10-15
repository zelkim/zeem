const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

class Database {
  static async create(filePath) {
    const SQL = await initSqlJs({
      locateFile: (file) => {
        const devPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file);
        const prodPath = path.join(process.resourcesPath || process.cwd(), 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', file);
        try {
          if (fs.existsSync(prodPath)) return prodPath;
        } catch {}
        return devPath;
      }
    });
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
  }

  persist() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, buffer);
  }

  listMeetings() {
    const stmt = this.db.prepare('select * from meetings order by datetime(start_time) asc');
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows.map(this._mapRow);
  }

  createMeeting(item) {
    const { title, url, start_time, end_time, enabled = 1 } = item;
    const stmt = this.db.prepare('insert into meetings (title, url, start_time, end_time, enabled) values (?, ?, ?, ?, ?)');
    stmt.run([title, url, start_time, end_time, enabled ? 1 : 0]);
    stmt.free();
    this.persist();
    const id = this.db.exec('select last_insert_rowid() as id')[0].values[0][0];
    return { id, title, url, start_time, end_time, enabled: !!enabled };
  }

  updateMeeting(item) {
    const { id, title, url, start_time, end_time, enabled } = item;
    const stmt = this.db.prepare('update meetings set title=?, url=?, start_time=?, end_time=?, enabled=? where id=?');
    stmt.run([title, url, start_time, end_time, enabled ? 1 : 0, id]);
    stmt.free();
    this.persist();
    return { id, title, url, start_time, end_time, enabled: !!enabled };
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

  upcomingAndOngoing(nowIso) {
    const stmt = this.db.prepare('select * from meetings where datetime(end_time) >= datetime(?) and enabled=1 order by datetime(start_time) asc');
    const rows = [];
    stmt.bind([nowIso]);
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
      enabled: !!row.enabled
    };
  }
}

module.exports = { Database };

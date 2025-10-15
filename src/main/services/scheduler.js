class Scheduler {
  constructor(db, joinFn, leaveFn, notify, isZoomRunning) {
    this.db = db;
    this.joinFn = joinFn;
    this.leaveFn = leaveFn;
    this.notify = notify || (() => {});
    this.isZoomRunning = isZoomRunning || (async () => true);
    this.timer = null;
    this.joinedMeetingId = null;
    this.lastStatus = { ongoing: null, next: null };
    this.refresh();
  }

  refresh() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 15 * 1000);
    // run immediately
    this.tick();
  }

  async tick() {
    const now = new Date();
    const nowIso = now.toISOString();
    const meetings = this.db.upcomingAndOngoing(nowIso); // returns all enabled meetings with weekday/start_hm
    const threeMinMs = 3 * 60 * 1000;

    // Helpers to compute today's and next occurrence times
    const parseHM = (hm) => {
      const [h, m] = String(hm).split(':').map(n => parseInt(n, 10));
      return { h: h || 0, m: m || 0 };
    };
    const atDate = (base, { h, m }) => {
      const d = new Date(base);
      d.setHours(h, m, 0, 0);
      return d;
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

    const todayDow = now.getDay();

    // Determine ongoing meeting based on today's weekday and time window
    let ongoing = null;
    for (const m of meetings) {
      if (!m.enabled) continue;
      const { h: sh, m: sm } = parseHM(m.start_hm || '00:00');
      const { h: eh, m: em } = parseHM(m.end_hm || m.start_hm || '00:00');
      if (m.weekday === todayDow) {
        const start = atDate(now, { h: sh, m: sm });
        const end = atDate(now, { h: eh, m: em });
        if (start <= now && now <= end) {
          ongoing = { ...m, start_time: start.toISOString(), end_time: end.toISOString() };
          break;
        }
      }
    }

    // Auto join logic
    if (!this.joinedMeetingId) {
      for (const m of meetings) {
        if (!m.enabled) continue;
        const start = nextOccurrence(m.weekday, m.start_hm);
        const diff = start - now;
        if (diff <= threeMinMs && diff >= -60 * 1000) {
          try {
            this.notify({ type: 'joining', meetingId: m.id });
            await this.joinFn(m.url);
            this.joinedMeetingId = m.id;
            this.notify({ type: 'joined', meetingId: m.id });
          } catch (e) {
            console.error('[scheduler] join-error', e);
            this.notify({ type: 'join-error', meetingId: m.id, error: String(e) });
          }
          break;
        }
      }
    }

    // If ongoing and Zoom not running, ensure join
    if (ongoing && ongoing.enabled) {
      try {
        const running = await this.isZoomRunning();
        if (!running) {
          try {
            await this.joinFn(ongoing.url);
            this.joinedMeetingId = ongoing.id;
            this.notify({ type: 'joined', meetingId: ongoing.id });
          } catch (e) {
            console.error('[scheduler] join-error (ensure running)', e);
            this.notify({ type: 'join-error', meetingId: ongoing.id, error: String(e) });
          }
        }
      } catch (e) {
        console.error('[scheduler] isZoomRunning error', e);
      }
    }

    // Auto leave logic
    if (this.joinedMeetingId) {
      // Determine if the meeting we're in is still ongoing today
      const current = meetings.find(m => m.id === this.joinedMeetingId);
      if (!current) {
        try { await this.leaveFn(); } catch {}
        this.notify({ type: 'left', meetingId: this.joinedMeetingId });
        this.joinedMeetingId = null;
      } else {
        const { h: eh, m: em } = parseHM(current.end_hm || current.start_hm || '00:00');
        const end = atDate(now, { h: eh, m: em });
        if (current.weekday !== todayDow || now >= end) {
          try { await this.leaveFn(); } catch {}
          this.notify({ type: 'left', meetingId: this.joinedMeetingId });
          this.joinedMeetingId = null;
        }
      }
    }

    // Sidebar status events: find next meeting occurrence
    const upcoming = meetings
      .filter(m => m.enabled)
      .map(m => {
        const s = nextOccurrence(m.weekday, m.start_hm);
        const e = nextOccurrence(m.weekday, m.end_hm);
        return { ...m, start_time: s.toISOString(), end_time: e.toISOString() };
      })
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    const next = upcoming.find(m => new Date(m.start_time) > now) || null;
    // Update snapshot then emit
    this.lastStatus = { ongoing: ongoing || null, next: ongoing ? null : next };
    if (ongoing) this.notify({ type: 'status', ongoing, next: null });
    else this.notify({ type: 'status', ongoing: null, next });
  }

  snapshot() {
    return this.lastStatus;
  }
}

module.exports = { Scheduler };

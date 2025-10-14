class Scheduler {
  constructor(db, joinFn, leaveFn, notify, isZoomRunning) {
    this.db = db;
    this.joinFn = joinFn;
    this.leaveFn = leaveFn;
    this.notify = notify || (() => {});
    this.isZoomRunning = isZoomRunning || (async () => true);
    this.timer = null;
    this.joinedMeetingId = null;
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
    const meetings = this.db.upcomingAndOngoing(nowIso);
    console.log('[scheduler] tick', { now: nowIso, count: meetings.length });
    const threeMinMs = 3 * 60 * 1000;

    // Determine ongoing meeting
    let ongoing = null;
    for (const m of meetings) {
      const start = new Date(m.start_time);
      const end = new Date(m.end_time);
      if (start <= now && now <= end) { ongoing = m; break; }
    }

    // Auto join logic: if not already joined, and there exists a meeting whose start is within 3 min
    if (!this.joinedMeetingId) {
      for (const m of meetings) {
        const start = new Date(m.start_time);
        const diff = start - now;
        if (diff <= threeMinMs && diff >= -60 * 1000) { // join from 3 min before up to 1 min after
          if (m.enabled) {
            console.log('[scheduler] joining criteria met', { meetingId: m.id, title: m.title, diffMs: diff });
            this.notify({ type: 'joining', meetingId: m.id });
            try {
              await this.joinFn(m.url);
              this.joinedMeetingId = m.id;
              console.log('[scheduler] joined', { meetingId: m.id });
              this.notify({ type: 'joined', meetingId: m.id });
            } catch (e) {
              console.error('[scheduler] join-error', e);
              this.notify({ type: 'join-error', meetingId: m.id, error: String(e) });
            }
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
          console.log('[scheduler] Zoom not running during ongoing meeting; joining now', { meetingId: ongoing.id });
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
      const current = meetings.find(m => m.id === this.joinedMeetingId);
      if (!current) {
        try {
          console.log('[scheduler] leaving (no longer current)');
          await this.leaveFn();
        } catch {}
        this.notify({ type: 'left', meetingId: this.joinedMeetingId });
        this.joinedMeetingId = null;
      } else {
        const end = new Date(current.end_time);
        if (now >= end) {
          try {
            console.log('[scheduler] leaving (reached end time)');
            await this.leaveFn();
          } catch {}
          this.notify({ type: 'left', meetingId: this.joinedMeetingId });
          this.joinedMeetingId = null;
        }
      }
    }

    // Sidebar status events
    const next = meetings.find(m => new Date(m.start_time) > now);
    if (ongoing) this.notify({ type: 'status', ongoing, next: null });
    else this.notify({ type: 'status', ongoing: null, next });
  }
}

module.exports = { Scheduler };

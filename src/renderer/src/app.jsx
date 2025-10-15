import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import MeetingsList from './components/MeetingsList';
import ConfirmModal from './components/ConfirmModal';
import EditModal from './components/EditModal';

const api = window.zeem;

export default function App() {
  const [meetings, setMeetings] = useState([]);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [status, setStatus] = useState({ ongoing: null, next: null });

  const reload = async () => {
    const m = await api.listMeetings();
    setMeetings(m);
    return m;
  };

  useEffect(() => {
    // Register status listener immediately
    const handler = (evt) => {
      if (evt && evt.type === 'status') {
        setStatus({ ongoing: evt.ongoing, next: evt.next });
      } else if (evt && (evt.type === 'joined' || evt.type === 'left' || evt.type === 'joining')) {
        // no-op for list
      } else {
        // On structural changes, refresh list
        reload();
      }
    };
    api.onSchedulerEvent(handler);

    // Initial load: meetings and scheduler status snapshot
    (async () => {
      const m = await reload();
      try {
        const snap = await api.getStatus?.();
        if (snap && (snap.ongoing || snap.next)) {
          setStatus({ ongoing: snap.ongoing, next: snap.next });
        } else {
          // Fallback: compute from meetings
          const computed = computeStatusFromMeetings(m);
          setStatus(computed);
        }
      } catch {
        const computed = computeStatusFromMeetings(m);
        setStatus(computed);
      }
    })();

    return () => { /* no off in our bridge; okay for app lifetime */ };
  }, []);

  // Helper to compute initial status on the client as a fallback
  function computeStatusFromMeetings(m) {
    const now = new Date();
    const parseHM = (hm) => {
      const [h, mm] = String(hm || '00:00').split(':').map(n => parseInt(n, 10));
      return { h: h || 0, m: mm || 0 };
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
    let ongoing = null;
    const todayDow = now.getDay();
    for (const x of m) {
      if (!x.enabled) continue;
      if (x.weekday !== todayDow) continue;
      const s = atDate(now, parseHM(x.start_hm));
      const e = atDate(now, parseHM(x.end_hm || x.start_hm));
      if (s <= now && now <= e) {
        ongoing = { ...x, start_time: s.toISOString(), end_time: e.toISOString() };
        break;
      }
    }
    const upcoming = m
      .filter(x => x.enabled)
      .map(x => ({ ...x, start_time: nextOccurrence(x.weekday, x.start_hm).toISOString() }))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    const next = ongoing ? null : (upcoming.find(x => new Date(x.start_time) > now) || null);
    return { ongoing, next };
  }

  const ongoing = status.ongoing;
  const next = status.next;

  return (
    <div className="flex h-screen">
      <Sidebar
        meetings={meetings}
        ongoing={ongoing}
        next={next}
        onJoin={async (url) => api.joinNow(url)}
        onLeave={async () => api.leaveNow()}
      />
      <main className="flex-1 p-4 overflow-auto">
        {meetings.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <p className="text-muted">Add mo n yng meeting m baks,, lam q antok k na</p>
              <button className="px-3 py-2 rounded-lg bg-card/90 hover:bg-card/60 text-text" onClick={() => setEditing({})}>+ Add Meeting</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-start mb-3">
              <button className="px-3 py-2 rounded-lg bg-card/90 hover:bg-card/60 text-text" onClick={() => setEditing({})}>+ Add Meeting</button>
            </div>
            <MeetingsList
              meetings={meetings}
              onToggle={async (id, enabled) => { await api.toggleMeeting(id, enabled); reload(); }}
              onEdit={(m) => setEditing(m)}
              onDelete={(id) => setConfirmDelete(id)}
            />
          </>
        )}
      </main>

      {editing && (
        <EditModal initial={editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}
      {confirmDelete != null && (
        <ConfirmModal id={confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={async () => { await api.deleteMeeting(confirmDelete); setConfirmDelete(null); reload(); }} />
      )}
    </div>
  );
}


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

  const reload = async () => {
    const m = await api.listMeetings();
    setMeetings(m);
  };

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    const handler = () => reload();
    api.onSchedulerEvent(handler);
    return () => { /* no off in our bridge; okay for app lifetime */ };
  }, []);

  const ongoing = useMemo(() => {
    const now = Date.now();
    return meetings.find(m => new Date(m.start_time).getTime() <= now && now <= new Date(m.end_time).getTime());
  }, [meetings]);

  const next = useMemo(() => {
    const now = Date.now();
    return meetings.filter(m => new Date(m.start_time).getTime() > now).sort((a,b)=> new Date(a.start_time)-new Date(b.start_time))[0] || null;
  }, [meetings]);

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
        <div className="flex justify-start mb-3">
          <button className="px-3 py-2 rounded-md bg-primary/30 hover:bg-primary/40 text-text" onClick={() => setEditing({})}>+ Add Meeting</button>
        </div>
        <MeetingsList
          meetings={meetings}
          onToggle={async (id, enabled) => { await api.toggleMeeting(id, enabled); reload(); }}
          onEdit={(m) => setEditing(m)}
          onDelete={(id) => setConfirmDelete(id)}
        />
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


import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import MeetingsList from './components/MeetingsList';

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

function ConfirmModal({ id, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="w-[420px] bg-card border border-white/10 p-4 rounded-xl">
        <h3 className="text-lg mb-2">Delete meeting?</h3>
        <p className="text-muted mb-4">This action cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button className="px-3 py-2 rounded-md bg-white/10" onClick={onClose}>Cancel</button>
          <button className="px-3 py-2 rounded-md bg-red-600/80" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ initial, onClose, onSaved }) {
  const [title, setTitle] = useState(initial.title || '');
  const [url, setUrl] = useState(initial.url || '');
  const [start, setStart] = useState(initial.start_time ? inputValue(initial.start_time) : '');
  const [end, setEnd] = useState(initial.end_time ? inputValue(initial.end_time) : '');
  const [enabled, setEnabled] = useState(initial.enabled ?? true);

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      id: initial.id,
      title: title.trim(),
      url: url.trim(),
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      enabled,
    };
    if (initial.id) await window.zeem.updateMeeting(payload);
    else await window.zeem.createMeeting(payload);
    onClose();
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="w-[460px] bg-card border border-white/10 p-4 rounded-xl">
        <h3 className="text-lg mb-3">{initial.id ? 'Edit Meeting' : 'Add Meeting'}</h3>
        <form onSubmit={submit} className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Title</span>
            <input className="px-3 py-2 rounded-md bg-[#0b1220] border border-white/10" value={title} onChange={e=>setTitle(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">URL</span>
            <input className="px-3 py-2 rounded-md bg-[#0b1220] border border-white/10" value={url} onChange={e=>setUrl(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Start Time</span>
            <input type="datetime-local" className="px-3 py-2 rounded-md bg-[#0b1220] border border-white/10" value={start} onChange={e=>setStart(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">End Time</span>
            <input type="datetime-local" className="px-3 py-2 rounded-md bg-[#0b1220] border border-white/10" value={end} onChange={e=>setEnd(e.target.value)} required />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} />
            <span className="text-sm">Auto-join enabled</span>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="px-3 py-2 rounded-md bg-white/10" onClick={onClose}>Cancel</button>
            <button className="px-3 py-2 rounded-md bg-primary/30">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function inputValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

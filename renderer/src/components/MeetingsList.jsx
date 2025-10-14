import React from 'react';

function fmt(dt) {
  const d = new Date(dt);
  return d.toLocaleString(undefined, { hour12: false });
}

export default function MeetingsList({ meetings, onToggle, onEdit, onDelete }) {
  return (
    <ul className="space-y-2">
      {meetings.map(m => (
        <li key={m.id} className="grid grid-cols-[28px_1fr_auto] gap-3 items-center bg-card border border-white/10 p-3 rounded-xl">
          <input type="checkbox" className="w-5 h-5" checked={m.enabled} onChange={e => onToggle(m.id, e.target.checked)} />
          <div className="flex flex-col gap-1">
            <div>{m.title}</div>
            <div className="text-sm text-muted">{fmt(m.start_time)} → {fmt(m.end_time)}</div>
            <div className="text-sm text-muted break-all">{m.url}</div>
          </div>
          <div className="flex gap-2">
            <button className="px-2 py-1 rounded-md bg-white/10" title="Edit" onClick={() => onEdit(m)}>✎</button>
            <button className="px-2 py-1 rounded-md bg-red-600/80" title="Delete" onClick={() => onDelete(m.id)}>🗑</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

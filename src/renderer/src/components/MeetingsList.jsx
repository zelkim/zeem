import React from 'react';

const WEEKDAYS_UP = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
function fmt12(hm) {
  if (!hm) return '';
  const [hs, ms] = String(hm).split(':');
  let h = parseInt(hs, 10);
  const m = parseInt(ms, 10) || 0;
  const am = h < 12;
  let h12 = h % 12; if (h12 === 0) h12 = 12;
  const pad = (n) => String(n).padStart(2, '0');
  return `${h12}:${pad(m)} ${am ? 'AM' : 'PM'}`;
}

export default function MeetingsList({ meetings, onToggle, onEdit, onDelete }) {
  return (
    <div className="space-y-2">
      {meetings.map(m => (
        <div key={m.id} className="relative group bg-card border border-white/10 p-3 rounded-xl overflow-hidden">
          {/* Content */}
          <div className="grid grid-cols-[48px_1fr] gap-3 items-center">
            {/* Switch toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={m.enabled}
              onClick={() => onToggle(m.id, !m.enabled)}
              className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${m.enabled ? 'bg-blue-500/70' : 'bg-white/10'} border border-white/10`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${m.enabled ? 'translate-x-5' : 'translate-x-1'}`}
              />
            </button>
            <div className="min-w-0 flex flex-col gap-1">
              <div className="text-md font-medium flex items-center gap-2">
                <span className="truncate">{m.title}</span>
                <span className="shrink-0 text-xs px-2 rounded-lg bg-white/10 border border-white/10 text-muted">
                  {WEEKDAYS_UP[m.weekday ?? new Date(m.start_time).getDay()]} {fmt12(m.start_hm || '')} - {fmt12(m.end_hm || '')}
                </span>
              </div>
              <div className="text-xs text-muted/50 truncate">{m.url}</div>
            </div>
          </div>

          {/* Hover overlay with gradient and actions */}
          <div className="pointer-events-none group-hover:pointer-events-auto absolute inset-y-0 right-0 w-44 bg-gradient-to-l from-white/10 to-transparent flex items-center justify-end gap-2 pr-3 pl-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="px-2 py-1 text-sm rounded-md bg-white/10" title="Edit" onClick={() => onEdit(m)}>Modify</button>
            <button className="px-2 py-1 text-sm rounded-md bg-red-600/80" title="Delete" onClick={() => onDelete(m.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';

function fmt(dt) {
  const d = new Date(dt);
  return d.toLocaleString(undefined, { hour12: false });
}

export default function Sidebar({ meetings, ongoing, next, onJoin, onLeave }) {
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleString(undefined, { hour12: false }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const miniItems = useMemo(() => {
    const now = Date.now();
    const items = meetings
      .filter(m => !ongoing && next ? m.id !== next.id : true)
      .filter(m => new Date(m.start_time).getTime() >= now)
      .slice(0, 8);
    return items;
  }, [meetings, ongoing, next]);

  return (
    <aside className="w-80 border-r border-white/10 p-4 overflow-auto">
      <div className="text-center text-muted mb-3 font-mono">{clock}</div>
      <div className="relative bg-card border border-white/10 p-4 rounded-xl mb-4">
        {ongoing && (
          <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-green-600/80">Ongoing</span>
        )}
        <h2 className="text-lg mb-1">{ongoing ? ongoing.title : next ? next.title : 'No meetings'}</h2>
        <div className="text-sm text-muted flex gap-2 mb-3">
          <span>{ongoing ? fmt(ongoing.start_time) : next ? fmt(next.start_time) : ''}</span>
          <span>{ongoing ? fmt(ongoing.end_time) : next ? fmt(next.end_time) : ''}</span>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-md bg-primary/30" onClick={() => onJoin((ongoing || next)?.url)} disabled={!ongoing && !next}>Join</button>
          <button className="px-3 py-2 rounded-md bg-white/10" onClick={onLeave}>Leave</button>
        </div>
      </div>
      <div>
        <h3 className="text-md mb-2">Upcoming</h3>
        <ul className="space-y-1">
          {miniItems.map(m => (
            <li key={m.id}>
              <button className="w-full text-left px-2 py-2 rounded-md hover:bg-white/5 flex items-center justify-between" onClick={() => onJoin(m.url)}>
                <span>{m.title}</span>
                <span className="text-sm text-muted">{fmt(m.start_time)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

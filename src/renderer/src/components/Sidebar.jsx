import React, { useEffect, useMemo, useState } from 'react';

function fmt(dt) {
  const d = new Date(dt);
  return d.toLocaleString(undefined, { hour12: false });
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
}

const nextOccurrence = (weekday, hm) => {
  const now = new Date();
  const [h, m] = String(hm || '00:00').split(':').map(n => parseInt(n, 10));
  const d = new Date(now);
  const delta = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + delta);
  d.setHours(h || 0, m || 0, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 7);
  return d.toISOString();
};

export default function Sidebar({ meetings, ongoing, next, onJoin, onLeave }) {
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const dateStr = d.toLocaleString(undefined, { month: 'long', day: 'numeric' });
      const timeStr = d.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      setClock(`Today is ${dateStr}, ${timeStr}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const miniItems = useMemo(() => {
    const now = Date.now();
    const items = meetings
      .map(m => ({
        ...m,
        start_time: m.start_time || nextOccurrence(m.weekday, m.start_hm),
        end_time: m.end_time || nextOccurrence(m.weekday, m.end_hm),
      }))
      .filter(m => !ongoing && next ? m.id !== next.id : true)
      .filter(m => new Date(m.start_time).getTime() >= now)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    return items;
  }, [meetings, ongoing, next]);

  const WEEKDAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const grouped = useMemo(() => {
    const map = new Map();
    miniItems.forEach(m => {
      const key = m.weekday;
      const label = WEEKDAYS_FULL[m.weekday] || 'Unknown';
      if (!map.has(key)) map.set(key, { key, label, items: [] });
      map.get(key).items.push(m);
    });
    // Keep group order as they appear in miniItems (already sorted by time)
    return Array.from(map.values());
  }, [miniItems]);

  const primary = ongoing || next || (miniItems.length > 0 ? miniItems[0] : null);

  return (
    <aside className="w-80 border-r border-white/10 p-4 flex flex-col min-h-0">
      <div className="flex-1 overflow-auto">
        <div className="text-center text-muted mb-3 font-sans">{clock}</div>
        <div className="relative bg-card border border-white/10 p-4 rounded-xl mb-4">
          {ongoing && (
            <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-green-600/80">Ongoing</span>
          )}
          <h2 className="text-lg mb-1 line-clamp-3">{ongoing ? ongoing.title : next ? next.title : 'No meetings scheduled for today!'}</h2>
          <div className="text-sm mb-1 line-clamp-3 text-muted">{ongoing ? ongoing.title : next ? null : 'bka nakakalimutan m lng i-enable ha,,,'}</div>
          <div className="text-sm text-muted mb-3">
            {(() => {
              const s = ongoing ? ongoing.start_time : next ? next.start_time : '';
              const e = ongoing ? ongoing.end_time : next ? next.end_time : '';
              return s && e ? `${fmtTime(s)} - ${fmtTime(e)}` : '';
            })()}
          </div>
          <div className="flex gap-2">
            {primary && (
              <button className="font-bold text-sm px-3 py-2 rounded-lg bg-text/90 hover:bg-text/60 text-card" onClick={() => onJoin(primary.url)}>Join Meeting</button>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-md mb-2">Upcoming</h3>
          {grouped.length === 0 && (
            <div className="text-sm text-muted px-2">Paparating na... ang ano...? wala,,, </div>
          )}
          {grouped.map(g => (
            <div key={g.key} className="mb-3">
              <h4 className="text-sm text-muted px-2 mb-1">{g.label}</h4>
              <ul className="space-y-1">
                {g.items.map(m => (
                  <li key={m.id}>
                    <button className="w-full text-left px-2 py-2 rounded-md hover:bg-white/5" onClick={() => onJoin(m.url)}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate flex-1">{m.title}</span>
                        {!m.enabled && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/80">DISABLED</span>
                        )}
                      </div>
                      <div className="text-sm text-muted">{fmtTime(m.start_time)} - {fmtTime(m.end_time)}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <footer className="pt-3 mt-3 border-t border-white/10 text-xs text-muted">
        <div className="flex flex-col gap-1">
          <div>Made with &lt;3 by zel</div>
          <a href="mailto:sean@dlsu-lscs.org" className="underline hover:text-white">Report an Issue</a>
        </div>
      </footer>
    </aside>
  );
}

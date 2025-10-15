import React, { useMemo, useState } from 'react';
import { inputValue } from '../utils/utils';

export default function EditModal({ initial, onClose, onSaved }) {
  const [title, setTitle] = useState(initial.title || '');
  const [url, setUrl] = useState(initial.url || '');
  const [urlError, setUrlError] = useState('');
  const defaultWeekday = initial.weekday ?? (initial.start_time ? new Date(initial.start_time).getDay() : new Date().getDay());
  const pad = (n) => String(n).padStart(2, '0');
  const hmFromIso = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [weekday, setWeekday] = useState(defaultWeekday);
  const [startHM, setStartHM] = useState(initial.start_hm || hmFromIso(initial.start_time) || '09:00');
  const [endHM, setEndHM] = useState(initial.end_hm || hmFromIso(initial.end_time) || '10:00');
  const [enabled, setEnabled] = useState(initial.enabled ?? true);

  const isValidUrl = (value) => {
    const v = String(value || '').trim();
    if (!v) return false;
    try {
      // URL constructor throws on invalid
      // Accepts custom schemes like zoommtg:// in addition to http/https
      // If user passed without scheme, try prefixing https:// for convenience check
      // but require explicit scheme for final validity
      const u = new URL(v);
      return !!u.protocol && !!u.host;
    } catch {
      return false;
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    // Validate URL before proceeding
    if (!isValidUrl(url)) {
      setUrlError('Please enter a valid URL (e.g., https://... or zoommtg://...)');
      return;
    }
    const payload = {
      id: initial.id,
      title: title.trim(),
      url: url.trim(),
      weekday: Number(weekday),
      start_hm: startHM,
      end_hm: endHM,
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
            <input className="text-sm px-3 py-2 rounded-md bg-[#0b1220] border border-white/10" value={title} onChange={e=>setTitle(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Zoom Meeting Link</span>
            <input
              className={`text-sm px-3 py-2 rounded-md bg-[#0b1220] border ${urlError ? 'border-red-500/80' : 'border-white/10'}`}
              value={url}
              onChange={e=>{ setUrl(e.target.value); if (urlError && isValidUrl(e.target.value)) setUrlError(''); }}
              onBlur={(e)=> setUrlError(isValidUrl(e.target.value) ? '' : 'Please enter a valid URL (e.g., https://... or zoommtg://...)')}
              placeholder="https://..."
              required
              aria-invalid={!!urlError}
              aria-describedby={urlError ? 'url-error' : undefined}
            />
            {urlError && (
              <span id="url-error" className="text-xs text-red-400 mt-1">{urlError}</span>
            )}
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted">Weekday</span>
              <select className="text-sm px-3 py-2 rounded-md bg-[#0b1220] border border-white/10" value={weekday} onChange={e=>setWeekday(e.target.value)} required>
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted">Start (HH:MM)</span>
              <input type="time" className="text-sm px-2 py-2 rounded-lg bg-[#0b1220] border border-white/10" value={startHM} onChange={e=>setStartHM(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted">End (HH:MM)</span>
              <input type="time" className="text-sm px-2 py-2 rounded-lg bg-[#0b1220] border border-white/10" value={endHM} onChange={e=>setEndHM(e.target.value)} required />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} />
            <span className="text-sm">Auto-join enabled</span>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="text-sm font-medium px-2 py-2 rounded-lg text-card bg-white/100 hover:bg-white/80" onClick={onClose}>Cancel</button>
            <button disabled={!!urlError || !isValidUrl(url)} className="text-sm font-medium px-2 py-2 rounded-lg text-card bg-white/100 hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

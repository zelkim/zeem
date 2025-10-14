import React, { useState } from 'react';
import { inputValue } from '../utils/utils';

export default function EditModal({ initial, onClose, onSaved }) {
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

import React from 'react';

export default function ConfirmModal({ id, onClose, onConfirm }) {
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

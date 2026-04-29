'use client';

import { useState, useRef, useEffect } from 'react';
import { useWatchlist } from '@/hooks/useWatchlist';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ManageWatchlistModal({ open, onClose }: Props) {
  const lists = useWatchlist((s) => s.lists);
  const activeListId = useWatchlist((s) => s.activeListId);
  const setActiveList = useWatchlist((s) => s.setActiveList);
  const renameList = useWatchlist((s) => s.renameList);
  const deleteList = useWatchlist((s) => s.deleteList);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) {
      setTimeout(() => editRef.current?.focus(), 50);
    }
  }, [editingId]);

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setConfirmDeleteId(null);
    }
  }, [open]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setEditName(name);
    setConfirmDeleteId(null);
  }

  function commitEdit() {
    if (editingId && editName.trim()) {
      renameList(editingId, editName.trim());
    }
    setEditingId(null);
  }

  function handleDelete(id: string) {
    if (confirmDeleteId === id) {
      deleteList(id);
      setConfirmDeleteId(null);
      // If deleted list was active, Zustand switches automatically
    } else {
      setConfirmDeleteId(id);
      setEditingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-2/50">
          <h2 className="text-[15px] font-semibold text-foreground">จัดการรายการจับตา</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-dim hover:text-foreground hover:bg-surface-3 transition-colors text-[16px]"
          >
            ×
          </button>
        </div>

        {/* List */}
        <div className="px-5 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {lists.map((list) => {
            const isActive = list.id === activeListId;
            const isEditing = editingId === list.id;
            const isConfirmDelete = confirmDeleteId === list.id;

            return (
              <div
                key={list.id}
                className={`rounded-xl border p-3 transition-all ${
                  isActive ? 'border-accent/40 bg-accent/5' : 'border-border bg-surface-2/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Active indicator */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-accent' : 'bg-border'}`} />

                  {/* Name / Edit input */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        ref={editRef}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="w-full bg-surface border border-accent/50 rounded-lg px-2.5 py-1 text-[13px] text-foreground outline-none"
                      />
                    ) : (
                      <div>
                        <span className="text-[13px] font-semibold text-foreground">{list.name}</span>
                        <span className="text-[11px] text-dim ml-2">{list.items.length} หุ้น</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      {!isActive && (
                        <button
                          onClick={() => { setActiveList(list.id); }}
                          className="px-2 py-1 rounded-md text-[11px] text-dim hover:text-accent hover:bg-accent/10 transition-all"
                          title="เลือกเป็นรายการหลัก"
                        >
                          เลือก
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(list.id, list.name)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[12px] text-dim hover:text-foreground hover:bg-surface-3 transition-all"
                        title="เปลี่ยนชื่อ"
                      >
                        ✏️
                      </button>
                      {lists.length > 1 && (
                        <button
                          onClick={() => handleDelete(list.id)}
                          className={`w-7 h-7 rounded-md flex items-center justify-center text-[12px] transition-all ${
                            isConfirmDelete
                              ? 'bg-red/20 text-red'
                              : 'text-dim hover:text-red hover:bg-red/10'
                          }`}
                          title={isConfirmDelete ? 'กดอีกครั้งเพื่อยืนยันลบ' : 'ลบรายการ'}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm delete warning */}
                {isConfirmDelete && (
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <span className="text-red">กดปุ่มถังขยะอีกครั้งเพื่อยืนยันลบ</span>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-dim hover:text-foreground underline"
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}

                {/* Stock pills preview */}
                {list.items.length > 0 && !isEditing && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {list.items.slice(0, 10).map((item) => (
                      <span
                        key={item.symbol}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-3/80 text-dim"
                      >
                        {item.symbol}
                      </span>
                    ))}
                    {list.items.length > 10 && (
                      <span className="text-[10px] text-dim/50">+{list.items.length - 10}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface-2/30">
          <p className="text-[10px] text-dim/40 text-center">
            เลือก, เปลี่ยนชื่อ, หรือลบรายการจับตา
          </p>
        </div>
      </div>
    </div>
  );
}

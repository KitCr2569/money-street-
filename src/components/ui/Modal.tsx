'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="glass rounded-2xl border border-border shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        </div>
        <div className="px-5 pb-5">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Prompt Modal ──

interface PromptModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
}

export function PromptModal({ open, onClose, onConfirm, title, placeholder, defaultValue = '', confirmLabel = 'ตกลง' }: PromptModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(defaultValue);

  useEffect(() => {
    if (open) {
      valueRef.current = defaultValue;
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.value = defaultValue;
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [open, defaultValue]);

  function handleSubmit() {
    const val = inputRef.current?.value?.trim();
    if (val) { onConfirm(val); onClose(); }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <input
        ref={inputRef}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-dim focus:outline-none focus:border-accent/40 font-mono mb-4"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-dim hover:text-foreground hover:bg-surface-2 transition-all">
          ยกเลิก
        </button>
        <button onClick={handleSubmit} className="px-4 py-1.5 rounded-lg text-[13px] font-semibold bg-accent text-background hover:bg-accent/85 transition-all">
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ── Confirm Modal ──

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'ยืนยัน', danger = false }: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-[13px] text-dim mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-dim hover:text-foreground hover:bg-surface-2 transition-all">
          ยกเลิก
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
            danger
              ? 'bg-red/20 text-red hover:bg-red/30'
              : 'bg-accent text-background hover:bg-accent/85'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ── Alert Modal ──

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export function AlertModal({ open, onClose, title, message }: AlertModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-[13px] text-dim mb-4">{message}</p>
      <div className="flex justify-end">
        <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-[13px] font-semibold bg-accent text-background hover:bg-accent/85 transition-all">
          ตกลง
        </button>
      </div>
    </Modal>
  );
}

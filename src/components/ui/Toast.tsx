'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export interface ToastItem {
  id: string;
  message: string;
  symbol?: string;
  type: 'alert' | 'info';
}

interface ToastContextValue {
  showToast: (item: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { ...item, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="toast-slide-in glass rounded-xl px-4 py-3 flex items-start gap-3 border border-yellow/20 bg-yellow-dim shadow-lg shadow-yellow/5"
            >
              <span className="text-[20px] shrink-0 mt-0.5">🔔</span>
              <div className="flex-1 min-w-0">
                {t.symbol && (
                  <div className="text-[13px] font-bold text-yellow">{t.symbol}</div>
                )}
                <div className="text-[13px] text-foreground">{t.message}</div>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-dim hover:text-foreground text-[14px] mt-0.5"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

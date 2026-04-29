import { create } from 'zustand';
import type { PriceAlert } from '@/types';

interface PriceAlertState {
  alerts: PriceAlert[];
  _hydrated: boolean;
  addAlert: (symbol: string, targetPrice: number, direction: 'above' | 'below', source: PriceAlert['source']) => void;
  removeAlert: (id: string) => void;
  triggerAlert: (id: string) => void;
  dismissAlert: (id: string) => void;
  dismissAllForSymbol: (symbol: string) => void;
  _loadFromDB: () => Promise<void>;
}

// ── DB sync ──
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function syncToDB(alerts: PriceAlert[]) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alerts }),
    }).catch(() => {});
  }, 500);
}

export const usePriceAlerts = create<PriceAlertState>()(
  (set, get) => ({
    alerts: [],
    _hydrated: false,

    addAlert: (symbol, targetPrice, direction, source) =>
      set((state) => {
        const exists = state.alerts.some(
          (a) => a.symbol === symbol && a.targetPrice === targetPrice && a.direction === direction && !a.triggered,
        );
        if (exists) return state;
        const alert: PriceAlert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          symbol,
          targetPrice,
          direction,
          source,
          createdAt: new Date().toISOString(),
          triggered: false,
          dismissed: false,
        };
        const alerts = [...state.alerts, alert];
        syncToDB(alerts);
        return { alerts };
      }),

    removeAlert: (id) =>
      set((state) => {
        const alerts = state.alerts.filter((a) => a.id !== id);
        syncToDB(alerts);
        return { alerts };
      }),

    triggerAlert: (id) =>
      set((state) => {
        const alerts = state.alerts.map((a) =>
          a.id === id ? { ...a, triggered: true, triggeredAt: new Date().toISOString() } : a,
        );
        syncToDB(alerts);
        return { alerts };
      }),

    dismissAlert: (id) =>
      set((state) => {
        const alerts = state.alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a));
        syncToDB(alerts);
        return { alerts };
      }),

    dismissAllForSymbol: (symbol) =>
      set((state) => {
        const alerts = state.alerts.map((a) =>
          a.symbol === symbol && a.triggered && !a.dismissed ? { ...a, dismissed: true } : a,
        );
        syncToDB(alerts);
        return { alerts };
      }),

    _loadFromDB: async () => {
      try {
        const r = await fetch('/api/alerts');
        const data = await r.json();
        if (Array.isArray(data)) {
          usePriceAlerts.setState({ alerts: data, _hydrated: true });
        } else {
          usePriceAlerts.setState({ _hydrated: true });
        }
      } catch {
        usePriceAlerts.setState({ _hydrated: true });
      }
    },
  })
);

/** Active (non-triggered) alerts for a symbol */
export function useActiveAlertsForSymbol(symbol: string) {
  return usePriceAlerts((s) => s.alerts.filter((a) => a.symbol === symbol && !a.triggered));
}

/** Triggered but not dismissed alerts */
export function useTriggeredAlerts() {
  return usePriceAlerts((s) => s.alerts.filter((a) => a.triggered && !a.dismissed));
}

import { create } from 'zustand';
import type { Holding, HoldingLot } from '@/types';

export interface Portfolio {
  id: string;
  name: string;
  holdings: Holding[];
  createdAt: string;
}

interface PortfolioState {
  portfolios: Portfolio[];
  activePortfolioId: string;
  _hydrated: boolean;

  // Portfolio management
  createPortfolio: (name: string) => string;
  renamePortfolio: (id: string, name: string) => void;
  deletePortfolio: (id: string) => void;
  setActivePortfolio: (id: string) => void;

  // Holdings (operates on active portfolio)
  holdings: Holding[];
  addLot: (symbol: string, lot: Omit<HoldingLot, 'id'>) => void;
  removeLot: (symbol: string, lotId: string) => void;
  removeHolding: (symbol: string) => void;
  getHolding: (symbol: string) => Holding | undefined;

  _loadFromDB: () => Promise<void>;
}

const DEFAULT_ID = 'default';

function createPortfolio(id: string, name: string): Portfolio {
  return { id, name, holdings: [], createdAt: new Date().toISOString() };
}

// ── Site limits ──
let _maxPortfolios = 5;
if (typeof window !== 'undefined') {
  fetch('/api/site-limits')
    .then((r) => r.ok ? r.json() : null)
    .then((data: { maxPortfolios?: number } | null) => {
      if (data?.maxPortfolios && data.maxPortfolios > 0) _maxPortfolios = data.maxPortfolios;
    })
    .catch(() => {});
}

// ── DB sync ──
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function syncToDB(portfolios: Portfolio[], activePortfolioId: string) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    // Sync active portfolio holdings (backward compatible)
    const active = portfolios.find((p) => p.id === activePortfolioId);
    fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        holdings: active?.holdings ?? [],
        portfolios,
        activePortfolioId,
      }),
    }).catch(() => {});
  }, 500);
}

// ── localStorage cache ──
const LS_KEY = 'ms_portfolios';

function saveLocal(state: { portfolios: Portfolio[]; activePortfolioId: string }) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

function loadLocal(): { portfolios: Portfolio[]; activePortfolioId: string } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.portfolios?.length > 0) return data;
  } catch {}
  return null;
}

function getActiveHoldings(portfolios: Portfolio[], activeId: string): Holding[] {
  return portfolios.find((p) => p.id === activeId)?.holdings ?? [];
}

export const usePortfolio = create<PortfolioState>()(
  (set, get) => ({
    portfolios: [createPortfolio(DEFAULT_ID, 'พอร์ตหลัก')],
    activePortfolioId: DEFAULT_ID,
    _hydrated: false,

    get holdings() {
      const state = get();
      return getActiveHoldings(state.portfolios, state.activePortfolioId);
    },

    createPortfolio: (name) => {
      const id = `port_${Date.now()}`;
      set((state) => {
        if (_maxPortfolios > 0 && state.portfolios.length >= _maxPortfolios) return state;
        const portfolios = [...state.portfolios, createPortfolio(id, name)];
        syncToDB(portfolios, id);
        saveLocal({ portfolios, activePortfolioId: id });
        return { portfolios, activePortfolioId: id };
      });
      return id;
    },

    renamePortfolio: (id, name) =>
      set((state) => {
        const portfolios = state.portfolios.map((p) => p.id === id ? { ...p, name } : p);
        syncToDB(portfolios, state.activePortfolioId);
        saveLocal({ portfolios, activePortfolioId: state.activePortfolioId });
        return { portfolios };
      }),

    deletePortfolio: (id) =>
      set((state) => {
        if (state.portfolios.length <= 1) return state;
        const portfolios = state.portfolios.filter((p) => p.id !== id);
        const activePortfolioId = state.activePortfolioId === id ? portfolios[0].id : state.activePortfolioId;
        syncToDB(portfolios, activePortfolioId);
        saveLocal({ portfolios, activePortfolioId });
        return { portfolios, activePortfolioId };
      }),

    setActivePortfolio: (id) => {
      set({ activePortfolioId: id });
      const state = get();
      saveLocal({ portfolios: state.portfolios, activePortfolioId: id });
    },

    addLot: (symbol, lot) =>
      set((state) => {
        const portfolios = state.portfolios.map((p) => {
          if (p.id !== state.activePortfolioId) return p;
          const existing = p.holdings.find((h) => h.symbol === symbol);
          const newLot: HoldingLot = { ...lot, id: crypto.randomUUID() };
          if (existing) {
            return { ...p, holdings: p.holdings.map((h) => h.symbol === symbol ? { ...h, lots: [...h.lots, newLot] } : h) };
          }
          return { ...p, holdings: [...p.holdings, { symbol, lots: [newLot] }] };
        });
        syncToDB(portfolios, state.activePortfolioId);
        saveLocal({ portfolios, activePortfolioId: state.activePortfolioId });
        return { portfolios };
      }),

    removeLot: (symbol, lotId) =>
      set((state) => {
        const portfolios = state.portfolios.map((p) => {
          if (p.id !== state.activePortfolioId) return p;
          return {
            ...p,
            holdings: p.holdings
              .map((h) => h.symbol === symbol ? { ...h, lots: h.lots.filter((l) => l.id !== lotId) } : h)
              .filter((h) => h.lots.length > 0),
          };
        });
        syncToDB(portfolios, state.activePortfolioId);
        saveLocal({ portfolios, activePortfolioId: state.activePortfolioId });
        return { portfolios };
      }),

    removeHolding: (symbol) =>
      set((state) => {
        const portfolios = state.portfolios.map((p) => {
          if (p.id !== state.activePortfolioId) return p;
          return { ...p, holdings: p.holdings.filter((h) => h.symbol !== symbol) };
        });
        syncToDB(portfolios, state.activePortfolioId);
        saveLocal({ portfolios, activePortfolioId: state.activePortfolioId });
        return { portfolios };
      }),

    getHolding: (symbol) => {
      const state = get();
      return getActiveHoldings(state.portfolios, state.activePortfolioId).find((h) => h.symbol === symbol);
    },

    _loadFromDB: async () => {
      // 1. Load from localStorage first
      const cached = loadLocal();
      if (cached) {
        usePortfolio.setState({
          portfolios: cached.portfolios,
          activePortfolioId: cached.activePortfolioId,
          _hydrated: true,
        });
      }

      // 2. Sync from DB
      try {
        const r = await fetch('/api/portfolio');
        const data = await r.json();
        if (data?.portfolios?.length > 0) {
          usePortfolio.setState({
            portfolios: data.portfolios,
            activePortfolioId: data.activePortfolioId || DEFAULT_ID,
            _hydrated: true,
          });
          saveLocal({ portfolios: data.portfolios, activePortfolioId: data.activePortfolioId || DEFAULT_ID });
        } else if (data?.holdings?.length > 0 && !cached) {
          // Backward compat: migrate single portfolio to multi
          const migrated = [{ ...createPortfolio(DEFAULT_ID, 'พอร์ตหลัก'), holdings: data.holdings }];
          usePortfolio.setState({ portfolios: migrated, activePortfolioId: DEFAULT_ID, _hydrated: true });
          syncToDB(migrated, DEFAULT_ID);
          saveLocal({ portfolios: migrated, activePortfolioId: DEFAULT_ID });
        } else if (!cached) {
          usePortfolio.setState({ _hydrated: true });
        }
      } catch {
        usePortfolio.setState({ _hydrated: true });
      }
    },
  })
);

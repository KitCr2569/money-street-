import { create } from 'zustand';
import type { WatchlistItem, WatchlistList } from '@/types';

const DEFAULT_LIST_ID = 'default';
const MAG7_LIST_ID = 'mag7';
const MAG7_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'];

function createList(id: string, name: string, items: WatchlistItem[] = []): WatchlistList {
  return { id, name, items, createdAt: new Date().toISOString() };
}

function createMag7List(): WatchlistList {
  return createList(MAG7_LIST_ID, 'Magnificent 7', MAG7_SYMBOLS.map((s) => ({ symbol: s, addedAt: new Date().toISOString() })));
}

interface WatchlistState {
  lists: WatchlistList[];
  activeListId: string;
  _hydrated: boolean;

  addItem: (symbol: string) => void;
  removeItem: (symbol: string) => void;
  hasItem: (symbol: string) => boolean;
  togglePin: (symbol: string) => void;
  setActiveList: (id: string) => void;
  createList: (name: string) => string;
  renameList: (id: string, name: string) => void;
  deleteList: (id: string) => void;
  moveItem: (symbol: string, fromListId: string, toListId: string) => void;
  copyItem: (symbol: string, toListId: string) => void;

  // DB sync
  _loadFromDB: () => Promise<void>;
}

function getActiveItems(lists: WatchlistList[], activeListId: string): WatchlistItem[] {
  return lists.find((l) => l.id === activeListId)?.items ?? [];
}

// ── localStorage cache ──
const LS_KEY = 'ms_watchlist';

function saveToLocal(state: { lists: WatchlistList[]; activeListId: string }) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      lists: state.lists,
      activeListId: state.activeListId,
      ts: Date.now(),
    }));
  } catch {}
}

function loadFromLocal(): { lists: WatchlistList[]; activeListId: string } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.lists) && data.lists.length > 0) {
      return { lists: data.lists, activeListId: data.activeListId || DEFAULT_LIST_ID };
    }
  } catch {}
  return null;
}

// ── Site limits (cached from API) ──
let _maxWatchlists = 0; // 0 = unlimited
let _maxStocksPerList = 0; // 0 = unlimited

function loadSiteLimits() {
  fetch('/api/site-limits')
    .then((r) => r.ok ? r.json() : null)
    .then((data: { maxWatchlists?: number; maxStocksPerList?: number } | null) => {
      if (!data) return;
      _maxWatchlists = data.maxWatchlists ?? 0;
      _maxStocksPerList = data.maxStocksPerList ?? 0;
    })
    .catch(() => {});
}

// Load limits on module init (client-side only)
if (typeof window !== 'undefined') {
  loadSiteLimits();
}

// ── DB sync: save state to server after every mutation ──
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function syncToDB(state: { lists: WatchlistList[]; activeListId: string }) {
  saveToLocal(state);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lists: state.lists, activeListId: state.activeListId }),
    }).catch(() => {});
  }, 500);
}

export const useWatchlist = create<WatchlistState>()(
  (set, get) => ({
    lists: [createList(DEFAULT_LIST_ID, 'รายการหลัก'), createMag7List()],
    activeListId: DEFAULT_LIST_ID,
    _hydrated: false,

    addItem: (symbol) =>
      set((state) => {
        const lists = state.lists.map((list) => {
          if (list.id !== state.activeListId) return list;
          if (list.items.some((i) => i.symbol === symbol)) return list;
          // Check max stocks per list
          if (_maxStocksPerList > 0 && list.items.length >= _maxStocksPerList) return list;
          return { ...list, items: [...list.items, { symbol, addedAt: new Date().toISOString() }] };
        });
        syncToDB({ lists, activeListId: state.activeListId });
        return { lists };
      }),

    removeItem: (symbol) =>
      set((state) => {
        const lists = state.lists.map((list) => {
          if (list.id !== state.activeListId) return list;
          return {
            ...list,
            items: list.items.filter((i) => i.symbol !== symbol),
            pinnedSymbols: (list.pinnedSymbols ?? []).filter((s) => s !== symbol),
          };
        });
        syncToDB({ lists, activeListId: state.activeListId });
        return { lists };
      }),

    togglePin: (symbol) =>
      set((state) => {
        const lists = state.lists.map((list) => {
          if (list.id !== state.activeListId) return list;
          const pinned = list.pinnedSymbols ?? [];
          const isPinned = pinned.includes(symbol);
          return {
            ...list,
            pinnedSymbols: isPinned ? pinned.filter((s) => s !== symbol) : [...pinned, symbol],
          };
        });
        syncToDB({ lists, activeListId: state.activeListId });
        return { lists };
      }),

    hasItem: (symbol) => {
      const state = get();
      return getActiveItems(state.lists, state.activeListId).some((i) => i.symbol === symbol);
    },

    setActiveList: (id) => {
      set({ activeListId: id });
      const state = get();
      syncToDB({ lists: state.lists, activeListId: id });
    },

    createList: (name) => {
      const id = `list_${Date.now()}`;
      set((state) => {
        // Check max watchlists
        if (_maxWatchlists > 0 && state.lists.length >= _maxWatchlists) return state;
        return {
          lists: [...state.lists, createList(id, name)],
          activeListId: id,
        };
      });
      const state = get();
      syncToDB({ lists: state.lists, activeListId: state.activeListId });
      return id;
    },

    renameList: (id, name) =>
      set((state) => {
        const lists = state.lists.map((l) => (l.id === id ? { ...l, name } : l));
        syncToDB({ lists, activeListId: state.activeListId });
        return { lists };
      }),

    deleteList: (id) =>
      set((state) => {
        if (state.lists.length <= 1) return state;
        const lists = state.lists.filter((l) => l.id !== id);
        const activeListId = state.activeListId === id ? lists[0].id : state.activeListId;
        syncToDB({ lists, activeListId });
        return { lists, activeListId };
      }),

    moveItem: (symbol, fromListId, toListId) =>
      set((state) => {
        const fromList = state.lists.find((l) => l.id === fromListId);
        const item = fromList?.items.find((i) => i.symbol === symbol);
        if (!item) return state;
        const lists = state.lists.map((list) => {
          if (list.id === fromListId) return { ...list, items: list.items.filter((i) => i.symbol !== symbol) };
          if (list.id === toListId) {
            if (list.items.some((i) => i.symbol === symbol)) return list;
            return { ...list, items: [...list.items, item] };
          }
          return list;
        });
        syncToDB({ lists, activeListId: state.activeListId });
        return { lists };
      }),

    copyItem: (symbol, toListId) =>
      set((state) => {
        const lists = state.lists.map((list) => {
          if (list.id !== toListId) return list;
          if (list.items.some((i) => i.symbol === symbol)) return list;
          return { ...list, items: [...list.items, { symbol, addedAt: new Date().toISOString() }] };
        });
        syncToDB({ lists, activeListId: state.activeListId });
        return { lists };
      }),

    _loadFromDB: async () => {
      // 1. Load from localStorage first (instant)
      const cached = loadFromLocal();
      if (cached) {
        useWatchlist.setState({
          lists: cached.lists,
          activeListId: cached.activeListId,
          _hydrated: true,
        });
      }

      // 2. Sync from DB in background
      try {
        const r = await fetch('/api/watchlist');
        const data = await r.json();
        if (data && Array.isArray(data.lists) && data.lists.length > 0) {
          useWatchlist.setState({
            lists: data.lists,
            activeListId: data.activeListId || DEFAULT_LIST_ID,
            _hydrated: true,
          });
          saveToLocal({ lists: data.lists, activeListId: data.activeListId || DEFAULT_LIST_ID });
        } else if (!cached) {
          // No DB data and no cache — seed with defaults
          const state = useWatchlist.getState();
          useWatchlist.setState({ _hydrated: true });
          syncToDB({ lists: state.lists, activeListId: state.activeListId });
        }
      } catch {
        // Offline — localStorage cache is enough
        useWatchlist.setState({ _hydrated: true });
      }
    },
  })
);

/** Derived selector — always computes items from active list */
export function useWatchlistItems() {
  return useWatchlist((s) => s.lists.find((l) => l.id === s.activeListId)?.items ?? []);
}

/** Derived selector — pinned symbols array from active list */
export function usePinnedSymbols(): string[] {
  return useWatchlist((s) => s.lists.find((l) => l.id === s.activeListId)?.pinnedSymbols ?? emptyPinned);
}

const emptyPinned: string[] = [];

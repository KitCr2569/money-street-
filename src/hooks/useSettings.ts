import { create } from 'zustand';
import type { RangeOption } from '@/types';

type SortKey = 'change' | 'symbol' | 'score' | 'volume';
type FilterKey = 'all' | 'oversold' | 'overbought' | 'buy';

interface SettingsState {
  // Watchlist
  watchlistRange: RangeOption;
  watchlistSortKey: SortKey;
  watchlistSortAsc: boolean;
  watchlistFilter: FilterKey;

  // Display
  showTags: boolean;

  // Home sidebar
  homeWatchlistId: string;

  // Watchlist "show all" tab
  watchlistShowAll: boolean;

  // Actions
  setWatchlistRange: (range: RangeOption) => void;
  setWatchlistSort: (key: SortKey, asc: boolean) => void;
  setWatchlistFilter: (filter: FilterKey) => void;
  toggleTags: () => void;
  setHomeWatchlistId: (id: string) => void;
  setWatchlistShowAll: (v: boolean) => void;

  _loadFromDB: () => Promise<void>;
}

// ── localStorage cache ──
const LS_SETTINGS = 'ms_settings';

function saveSettingsLocal() {
  try {
    const { watchlistRange, watchlistSortKey, watchlistSortAsc, watchlistFilter, showTags, homeWatchlistId, watchlistShowAll } = useSettings.getState();
    localStorage.setItem(LS_SETTINGS, JSON.stringify({ watchlistRange, watchlistSortKey, watchlistSortAsc, watchlistFilter, showTags, homeWatchlistId, watchlistShowAll }));
  } catch {}
}

// ── DB sync ──
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function syncToDB(state: Partial<SettingsState>) {
  saveSettingsLocal();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { watchlistRange, watchlistSortKey, watchlistSortAsc, watchlistFilter, showTags, homeWatchlistId, watchlistShowAll } = useSettings.getState();
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchlistRange, watchlistSortKey, watchlistSortAsc, watchlistFilter, showTags, homeWatchlistId, watchlistShowAll }),
    }).catch(() => {});
  }, 500);
}

export const useSettings = create<SettingsState>()(
  (set) => ({
    watchlistRange: '6mo',
    watchlistSortKey: 'change',
    watchlistSortAsc: false,
    watchlistFilter: 'all',
    showTags: true,
    homeWatchlistId: '',
    watchlistShowAll: false,

    setWatchlistRange: (range) => { set({ watchlistRange: range }); syncToDB({}); },
    setWatchlistSort: (key, asc) => { set({ watchlistSortKey: key, watchlistSortAsc: asc }); syncToDB({}); },
    setWatchlistFilter: (filter) => { set({ watchlistFilter: filter }); syncToDB({}); },
    toggleTags: () => { set((s) => ({ showTags: !s.showTags })); syncToDB({}); },
    setHomeWatchlistId: (id) => { set({ homeWatchlistId: id }); syncToDB({}); },
    setWatchlistShowAll: (v) => { set({ watchlistShowAll: v }); syncToDB({}); },

    _loadFromDB: async () => {
      // 1. Load from localStorage first (instant)
      try {
        const raw = localStorage.getItem(LS_SETTINGS);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached) {
            useSettings.setState({
              watchlistRange: cached.watchlistRange ?? '6mo',
              watchlistSortKey: cached.watchlistSortKey ?? 'change',
              watchlistSortAsc: cached.watchlistSortAsc ?? false,
              watchlistFilter: cached.watchlistFilter ?? 'all',
              showTags: cached.showTags ?? true,
              homeWatchlistId: cached.homeWatchlistId ?? '',
              watchlistShowAll: cached.watchlistShowAll ?? false,
            });
          }
        }
      } catch {}

      // 2. Sync from DB in background
      try {
        const r = await fetch('/api/settings');
        const data = await r.json();
        if (data) {
          useSettings.setState({
            watchlistRange: data.watchlistRange ?? '6mo',
            watchlistSortKey: data.watchlistSortKey ?? 'change',
            watchlistSortAsc: data.watchlistSortAsc ?? false,
            watchlistFilter: data.watchlistFilter ?? 'all',
            showTags: data.showTags ?? true,
            homeWatchlistId: data.homeWatchlistId ?? '',
            watchlistShowAll: data.watchlistShowAll ?? false,
          });
          saveSettingsLocal();
        }
      } catch {}
    },
  })
);

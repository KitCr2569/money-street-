'use client';

import { useEffect, useRef } from 'react';
import { useWatchlist } from './useWatchlist';
import { usePortfolio } from './usePortfolio';
import { usePriceAlerts } from './usePriceAlerts';
import { useSettings } from './useSettings';

/**
 * Standalone: load all data from SQLite on mount (no auth check needed).
 */
export function useDBSync() {
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    Promise.all([
      useWatchlist.getState()._loadFromDB(),
      usePortfolio.getState()._loadFromDB(),
      usePriceAlerts.getState()._loadFromDB(),
      useSettings.getState()._loadFromDB(),
    ]);
  }, []);
}

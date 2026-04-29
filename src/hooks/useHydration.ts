import { useEffect, useState } from 'react';

/**
 * Returns true once the component has mounted on the client.
 * Zustand stores have default data, so we show it immediately
 * while DB data loads in the background via DBSyncProvider.
 */
export function useHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}

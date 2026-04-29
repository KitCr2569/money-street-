'use client';

import { SWRConfig, type Cache } from 'swr';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'money-street-swr-cache';
const MAX_AGE = 10 * 60 * 1000; // 10 minutes — discard stale entries on boot

function localStorageProvider(): Cache {
  type Entry = { ts: number; v: unknown };
  let map = new Map<string, Entry>();

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const entries = JSON.parse(raw) as [string, Entry][];
        const now = Date.now();
        map = new Map(entries.filter(([, e]) => now - e.ts < MAX_AGE));
      }
    } catch {
      // corrupted — start fresh
    }

    window.addEventListener('beforeunload', () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...map.entries()]));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    });
  }

  return {
    get(key: string) { return map.get(key)?.v as ReturnType<Cache['get']>; },
    set(key: string, value: unknown) { map.set(key, { ts: Date.now(), v: value }); },
    delete(key: string) { map.delete(key); },
    keys() { return map.keys(); },
  };
}

export default function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: localStorageProvider }}>
      {children}
    </SWRConfig>
  );
}

import { useEffect, useRef, useState } from 'react';

const LS_LOGO_KEY = 'ms_logos';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

interface LogoCache {
  data: Record<string, string>;
  ts: number;
}

function readCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_LOGO_KEY);
    if (!raw) return {};
    const cache: LogoCache = JSON.parse(raw);
    if (Date.now() - cache.ts > CACHE_TTL) return {};
    return cache.data ?? {};
  } catch {
    return {};
  }
}

function writeCache(data: Record<string, string>) {
  try {
    const existing = readCache();
    const merged = { ...existing, ...data };
    localStorage.setItem(LS_LOGO_KEY, JSON.stringify({ data: merged, ts: Date.now() }));
  } catch {}
}

/** Returns a map of symbol → logo URL. Cached in localStorage for 30 days. */
export function useStockLogos(symbols: string[]): Record<string, string> {
  const [logos, setLogos] = useState<Record<string, string>>(() => readCache());
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!symbols.length) return;

    // Find symbols not yet cached
    const cached = readCache();
    const missing = symbols.filter((s) => !cached[s] && !fetchedRef.current.has(s));
    if (missing.length === 0) {
      // All cached — just set state if needed
      if (Object.keys(logos).length < Object.keys(cached).length) {
        setLogos(cached);
      }
      return;
    }

    missing.forEach((s) => fetchedRef.current.add(s));

    fetch(`/api/finnhub/logo?symbols=${encodeURIComponent(missing.join(','))}`)
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        writeCache(data);
        setLogos((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});
  }, [symbols.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return logos;
}

import useSWR from 'swr';
import type { StockQuote } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Dynamic poll interval from site settings (cached)
let _pollMs = 30000;
if (typeof window !== 'undefined') {
  fetch('/api/site-limits')
    .then((r) => r.ok ? r.json() : null)
    .then((data: { quotePollSec?: number } | null) => {
      if (data?.quotePollSec && data.quotePollSec >= 10) {
        _pollMs = data.quotePollSec * 1000;
      }
    })
    .catch(() => {});
}

export function useStockQuote(symbols: string | string[]) {
  const symbolList = Array.isArray(symbols) ? symbols.join(',') : symbols;

  const { data, error, isLoading } = useSWR<StockQuote[]>(
    symbolList ? `/api/yahoo/quote?symbols=${encodeURIComponent(symbolList)}` : null,
    fetcher,
    { refreshInterval: _pollMs }
  );

  return {
    quotes: data ?? [],
    isLoading,
    error,
  };
}

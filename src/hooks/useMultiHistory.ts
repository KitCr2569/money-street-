import useSWR from 'swr';
import type { HistoryResponse, RangeOption } from '@/types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

export function useMultiHistory(symbols: string[], range: RangeOption = '6mo') {
  const key = symbols.length > 0
    ? `/api/yahoo/batch-history?symbols=${symbols.join(',')}&range=${range}`
    : null;

  const { data, isLoading, isValidating } = useSWR<Record<string, HistoryResponse>>(
    key,
    fetcher,
    {
      refreshInterval: 300000,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
    }
  );

  return { data: data ?? {}, isLoading: isLoading || isValidating };
}

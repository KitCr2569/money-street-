import useSWR from 'swr';
import type { HistoryResponse, RangeOption } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useStockHistory(symbol: string, range: RangeOption) {
  const { data, error, isLoading } = useSWR<HistoryResponse>(
    symbol
      ? `/api/yahoo/history?symbol=${encodeURIComponent(symbol)}&range=${range}`
      : null,
    fetcher,
    { refreshInterval: 300000 }
  );

  return {
    data,
    isLoading,
    error,
  };
}

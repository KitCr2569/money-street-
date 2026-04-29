import useSWR from 'swr';
import type { NewsArticle, NewsProvider } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useStockNews(symbol?: string, provider?: NewsProvider) {
  const params = new URLSearchParams();
  if (symbol) params.set('symbol', symbol);
  if (provider) params.set('provider', provider);

  const query = params.toString();
  const url = `/api/yahoo/news${query ? `?${query}` : ''}`;

  const { data, error, isLoading } = useSWR<NewsArticle[]>(
    url,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );

  return {
    articles: data ?? [],
    isLoading,
    error,
  };
}

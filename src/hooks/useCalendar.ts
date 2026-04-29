import useSWR from 'swr';
import { useMemo } from 'react';
import type { CalendarEvent, CalendarEventType } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCalendar(from: string, to: string, typeFilter?: CalendarEventType) {
  // Always fetch all types — filter client-side so tab switching is instant
  const url = `/api/finnhub/calendar?from=${from}&to=${to}`;

  const { data, error, isLoading } = useSWR<CalendarEvent[]>(
    from && to ? url : null,
    fetcher,
    { refreshInterval: 30 * 60 * 1000 }
  );

  const allEvents = Array.isArray(data) ? data : [];

  const events = useMemo(() => {
    if (!typeFilter) return allEvents;
    return allEvents.filter((e) => e.type === typeFilter);
  }, [allEvents, typeFilter]);

  return { events, allEvents, isLoading, error };
}

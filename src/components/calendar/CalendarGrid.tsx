'use client';

import type { CalendarEvent, CalendarEventType } from '@/types';

interface Props {
  year: number;
  month: number; // 0-11
  events: CalendarEvent[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const TYPE_COLORS: Record<CalendarEventType, string> = {
  earnings: 'bg-blue',
  ipo: 'bg-green',
  dividend: 'bg-yellow',
};

const DAY_NAMES = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarGrid({ year, month, events, selectedDate, onSelectDate }: Props) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = new Date().toISOString().slice(0, 10);

  // Group events by date
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const existing = eventsByDate.get(ev.date) ?? [];
    existing.push(ev);
    eventsByDate.set(ev.date, existing);
  }

  // Get unique event types for a date
  function getDateTypes(date: string): CalendarEventType[] {
    const evs = eventsByDate.get(date) ?? [];
    return [...new Set(evs.map((e) => e.type))];
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Fill remaining to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Day names header */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_NAMES.map((name, i) => (
          <div
            key={i}
            className={`py-2 text-center text-[11px] font-medium ${i === 0 || i === 6 ? 'text-dim/60' : 'text-dim'}`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="h-16 sm:h-20 border-b border-r border-border/50" />;
          }

          const date = formatDate(year, month, day);
          const types = getDateTypes(date);
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const hasEvents = types.length > 0;
          const eventCount = eventsByDate.get(date)?.length ?? 0;

          return (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              className={`h-16 sm:h-20 border-b border-r border-border/50 p-1 flex flex-col items-center transition-colors relative
                ${isSelected ? 'bg-accent/10 ring-1 ring-accent/40' : hasEvents ? 'hover:bg-surface-2/50 cursor-pointer' : 'cursor-default'}
                ${isToday ? 'bg-surface-2/30' : ''}
              `}
            >
              <span
                className={`text-[12px] sm:text-[13px] w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-accent text-white font-bold' : 'text-foreground'}
                `}
              >
                {day}
              </span>

              {/* Event dots */}
              {types.length > 0 && (
                <div className="flex items-center gap-0.5 mt-1">
                  {types.map((t) => (
                    <span key={t} className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[t]}`} />
                  ))}
                </div>
              )}

              {/* Event count badge */}
              {eventCount > 0 && (
                <span className="text-[9px] text-dim mt-0.5 hidden sm:block">
                  {eventCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

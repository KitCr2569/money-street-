'use client';

import { useState, useMemo } from 'react';
import { useCalendar } from '@/hooks/useCalendar';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import EventList from '@/components/calendar/EventList';
import type { CalendarEventType } from '@/types';

const MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const EVENT_TYPES: { value: CalendarEventType | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'ทั้งหมด', icon: '📅' },
  { value: 'earnings', label: 'งบการเงิน', icon: '📊' },
  { value: 'ipo', label: 'IPO', icon: '🚀' },
  { value: 'dividend', label: 'XD', icon: '💰' },
];

function getMonthRange(year: number, month: number) {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<CalendarEventType | 'all'>('all');

  const { from, to } = getMonthRange(year, month);
  const clientType = typeFilter === 'all' ? undefined : typeFilter;
  const { events, allEvents, isLoading, error } = useCalendar(from, to, clientType);

  // Filter events for selected date
  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter((ev) => ev.date === selectedDate);
  }, [events, selectedDate]);

  // Summary counts (always from allEvents so tabs show correct numbers)
  const counts = useMemo(() => {
    const c = { earnings: 0, ipo: 0, dividend: 0 };
    for (const ev of allEvents) c[ev.type]++;
    return c;
  }, [allEvents]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
    setSelectedDate(null);
  }

  function goToday() {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(today.toISOString().slice(0, 10));
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold">📅 ปฏิทินตลาดหุ้น</h1>
            <p className="text-[12px] text-dim mt-0.5">วันปิดงบ, IPO, วันขึ้น XD</p>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-dim hover:text-foreground hover:bg-surface-2 transition-colors"
            >
              ←
            </button>
            <div className="text-[15px] font-semibold min-w-[160px] text-center">
              {MONTH_NAMES[month]} {year}
            </div>
            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-dim hover:text-foreground hover:bg-surface-2 transition-colors"
            >
              →
            </button>
            <button
              onClick={goToday}
              className="text-[12px] px-3 py-1.5 rounded-lg bg-surface-2 text-dim hover:text-foreground hover:bg-surface-3 transition-colors ml-1"
            >
              วันนี้
            </button>
          </div>
        </div>

        {/* Type filter tabs */}
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {EVENT_TYPES.map((t) => {
            const isActive = typeFilter === t.value;
            const count = t.value === 'all'
              ? counts.earnings + counts.ipo + counts.dividend
              : counts[t.value];

            return (
              <button
                key={t.value}
                onClick={() => { setTypeFilter(t.value); setSelectedDate(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all
                  ${isActive
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'bg-surface-2/50 text-dim hover:text-foreground hover:bg-surface-2 border border-transparent'
                  }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {!isLoading && count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isActive ? 'bg-accent/20' : 'bg-surface-3'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
          {/* Calendar */}
          <div>
            {error && (
              <div className="bg-red-dim rounded-xl p-4 text-[13px]">
                <p className="text-red font-semibold">ไม่สามารถโหลดข้อมูลได้</p>
                <p className="text-dim text-[12px] mt-1">ลองรีเฟรชหน้าใหม่</p>
              </div>
            )}

            {!error && (
              <div className="relative">
                {isLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                      <span className="text-[12px] text-dim">โหลดข้อมูล...</span>
                    </div>
                  </div>
                )}
                <CalendarGrid
                  year={year}
                  month={month}
                  events={events}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-[11px] text-dim">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue" />
                <span>งบการเงิน</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green" />
                <span>IPO</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow" />
                <span>XD (เงินปันผล)</span>
              </div>
            </div>
          </div>

          {/* Event detail panel */}
          <div className="bg-surface border border-border rounded-xl p-4 h-fit lg:sticky lg:top-16 max-h-[calc(100vh-5rem)] overflow-y-auto">
            {selectedDate ? (
              <EventList date={selectedDate} events={selectedEvents} />
            ) : (
              <div className="text-center py-12 text-dim">
                <p className="text-2xl mb-2">👈</p>
                <p className="text-[13px]">เลือกวันที่ในปฏิทินเพื่อดูรายละเอียด</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-[10px] text-dim/40 text-center mt-6">
          ข้อมูลจาก Finnhub — อาจมีความล่าช้า ควรตรวจสอบกับแหล่งข้อมูลหลักก่อนตัดสินใจ
        </p>
      </div>
    </div>
  );
}

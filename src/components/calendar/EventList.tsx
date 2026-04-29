'use client';

import type { CalendarEvent, CalendarEventType } from '@/types';

interface Props {
  date: string;
  events: CalendarEvent[];
}

const TYPE_CONFIG: Record<CalendarEventType, { icon: string; label: string; color: string }> = {
  earnings: { icon: '📊', label: 'งบการเงิน', color: 'text-blue' },
  ipo: { icon: '🚀', label: 'IPO', color: 'text-green' },
  dividend: { icon: '💰', label: 'XD', color: 'text-yellow' },
};

function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—';
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toFixed(2);
}

function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  return `วัน${days[d.getDay()]}ที่ ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function HourBadge({ hour }: { hour?: string }) {
  if (!hour) return null;
  const label = hour === 'bmo' ? 'ก่อนเปิด' : hour === 'amc' ? 'หลังปิด' : hour;
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-dim">{label}</span>;
}

function EarningsDetail({ event }: { event: CalendarEvent }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-dim mt-1">
      <HourBadge hour={event.hour} />
      {event.epsEstimate != null && (
        <span>EPS คาด: <span className="text-foreground">{event.epsEstimate.toFixed(2)}</span></span>
      )}
      {event.epsActual != null && (
        <span>EPS จริง: <span className={event.epsActual >= (event.epsEstimate ?? 0) ? 'text-green' : 'text-red'}>
          {event.epsActual.toFixed(2)}
        </span></span>
      )}
      {event.revenueEstimate != null && (
        <span>รายได้คาด: <span className="text-foreground">{formatNumber(event.revenueEstimate)}</span></span>
      )}
      {event.revenueActual != null && (
        <span>รายได้จริง: <span className={event.revenueActual >= (event.revenueEstimate ?? 0) ? 'text-green' : 'text-red'}>
          {formatNumber(event.revenueActual)}
        </span></span>
      )}
    </div>
  );
}

function IPODetail({ event }: { event: CalendarEvent }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-dim mt-1">
      {event.name && <span className="text-foreground">{event.name}</span>}
      {event.exchange && <span>ตลาด: {event.exchange}</span>}
      {event.priceRange && <span>ราคา: {event.priceRange}</span>}
      {event.shares != null && <span>หุ้น: {formatNumber(event.shares)}</span>}
    </div>
  );
}

function DividendDetail({ event }: { event: CalendarEvent }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-dim mt-1">
      {event.amount != null && (
        <span>เงินปันผล: <span className="text-green">${event.amount.toFixed(4)}</span></span>
      )}
      {event.payDate && <span>วันจ่าย: {event.payDate}</span>}
      {event.recordDate && <span>Record: {event.recordDate}</span>}
      {event.currency && event.currency !== 'USD' && <span>สกุล: {event.currency}</span>}
    </div>
  );
}

export default function EventList({ date, events }: Props) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-dim text-[13px]">
        ไม่มีเหตุการณ์ในวันนี้
      </div>
    );
  }

  // Group by type
  const grouped: Record<CalendarEventType, CalendarEvent[]> = {
    earnings: [],
    ipo: [],
    dividend: [],
  };
  for (const ev of events) {
    grouped[ev.type].push(ev);
  }

  return (
    <div>
      <h3 className="text-[14px] font-semibold text-foreground mb-3">
        📅 {formatThaiDate(date)}
        <span className="text-dim font-normal ml-2">({events.length} เหตุการณ์)</span>
      </h3>

      <div className="space-y-4">
        {(['earnings', 'ipo', 'dividend'] as CalendarEventType[]).map((type) => {
          const items = grouped[type];
          if (items.length === 0) return null;
          const cfg = TYPE_CONFIG[type];

          return (
            <div key={type}>
              <div className={`text-[13px] font-medium ${cfg.color} mb-2`}>
                {cfg.icon} {cfg.label} ({items.length})
              </div>
              <div className="space-y-1.5">
                {items.map((ev, i) => (
                  <div
                    key={`${ev.symbol}-${i}`}
                    className="bg-surface-2/50 border border-border/50 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-accent">{ev.symbol}</span>
                      {ev.name && <span className="text-[12px] text-dim truncate">{ev.name}</span>}
                    </div>
                    {type === 'earnings' && <EarningsDetail event={ev} />}
                    {type === 'ipo' && <IPODetail event={ev} />}
                    {type === 'dividend' && <DividendDetail event={ev} />}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

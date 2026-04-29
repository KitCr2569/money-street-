'use client';

import { useEffect, useState } from 'react';

function getMarketStatus(): { status: 'open' | 'pre' | 'after' | 'overnight' | 'closed'; label: string; nextEvent: string } {
  const now = new Date();

  // Convert to US Eastern Time
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay(); // 0=Sun, 6=Sat
  const hours = et.getHours();
  const mins = et.getMinutes();
  const time = hours * 60 + mins;

  // Weekend
  if (day === 0 || day === 6) {
    return { status: 'closed', label: 'ปิดทำการ (วันหยุด)', nextEvent: 'เปิดวันจันทร์ 20:30' };
  }

  // Overnight: 12:00 AM - 4:00 AM ET (continued from previous day 8 PM)
  if (time < 240) {
    const h = Math.floor((240 - time) / 60);
    const m = (240 - time) % 60;
    return { status: 'overnight', label: 'Overnight', nextEvent: `Pre-market ในอีก ${h}ชม. ${m}น.` };
  }

  // Pre-market: 4:00 AM - 9:30 AM ET
  if (time >= 240 && time < 570) {
    const h = Math.floor((570 - time) / 60);
    const m = (570 - time) % 60;
    return { status: 'pre', label: 'Pre-Market', nextEvent: `เปิดในอีก ${h}ชม. ${m}น.` };
  }

  // Market open: 9:30 AM - 4:00 PM ET
  if (time >= 570 && time < 960) {
    const h = Math.floor((960 - time) / 60);
    const m = (960 - time) % 60;
    return { status: 'open', label: 'ตลาดเปิด', nextEvent: `ปิดในอีก ${h}ชม. ${m}น.` };
  }

  // After-hours: 4:00 PM - 8:00 PM ET
  if (time >= 960 && time < 1200) {
    const h = Math.floor((1200 - time) / 60);
    const m = (1200 - time) % 60;
    return { status: 'after', label: 'After-Hours', nextEvent: `Overnight ในอีก ${h}ชม. ${m}น.` };
  }

  // Overnight: 8:00 PM - 12:00 AM ET
  const h = Math.floor((1680 - time) / 60);
  const m = (1680 - time) % 60;
  return { status: 'overnight', label: 'Overnight', nextEvent: `Pre-market ในอีก ${h}ชม. ${m}น.` };
}

const statusStyles = {
  open: { dot: 'bg-green', text: 'text-green', bg: 'bg-green/8' },
  pre: { dot: 'bg-yellow', text: 'text-yellow', bg: 'bg-yellow/8' },
  after: { dot: 'bg-blue', text: 'text-blue', bg: 'bg-blue/8' },
  overnight: { dot: 'bg-purple-400', text: 'text-purple-400', bg: 'bg-purple-400/8' },
  closed: { dot: 'bg-dim', text: 'text-dim', bg: 'bg-surface-2' },
};

export default function MarketStatus() {
  const [info, setInfo] = useState(getMarketStatus);

  useEffect(() => {
    const timer = setInterval(() => setInfo(getMarketStatus()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const style = statusStyles[info.status];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${style.bg} border border-border`}>
      <span className={`w-2 h-2 rounded-full ${style.dot} ${info.status === 'open' ? 'animate-pulse' : ''}`} />
      <div className="flex items-center gap-1.5">
        <span className={`text-[12px] font-semibold ${style.text}`}>{info.label}</span>
        <span className="text-[10px] text-dim">{info.nextEvent}</span>
      </div>
    </div>
  );
}

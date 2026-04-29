'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWatchlist } from '@/hooks/useWatchlist';

interface PortfolioTemplate {
  id: string;
  name: string;
  icon: string;
  desc: string;
  risk: 'ต่ำ' | 'ปานกลาง' | 'สูง';
  riskColor: string;
  stocks: { symbol: string; name: string; pct: number }[];
}

const TEMPLATES: PortfolioTemplate[] = [
  {
    id: 'mag7-equal',
    name: 'Magnificent 7 เท่ากัน',
    icon: '👑',
    desc: 'แบ่งเท่าๆ กัน 7 ตัว — ได้ทั้ง AI, Cloud, EV, Social',
    risk: 'สูง',
    riskColor: 'text-red bg-red/10',
    stocks: [
      { symbol: 'AAPL', name: 'Apple', pct: 14.3 },
      { symbol: 'MSFT', name: 'Microsoft', pct: 14.3 },
      { symbol: 'GOOGL', name: 'Alphabet', pct: 14.3 },
      { symbol: 'AMZN', name: 'Amazon', pct: 14.3 },
      { symbol: 'NVDA', name: 'NVIDIA', pct: 14.3 },
      { symbol: 'META', name: 'Meta', pct: 14.3 },
      { symbol: 'TSLA', name: 'Tesla', pct: 14.2 },
    ],
  },
  {
    id: 'ai-focused',
    name: 'AI All-In',
    icon: '🤖',
    desc: 'เน้น AI chips + software — เหมาะกับคนเชื่อว่า AI คือ megatrend',
    risk: 'สูง',
    riskColor: 'text-red bg-red/10',
    stocks: [
      { symbol: 'NVDA', name: 'NVIDIA', pct: 25 },
      { symbol: 'MSFT', name: 'Microsoft', pct: 20 },
      { symbol: 'GOOGL', name: 'Alphabet', pct: 15 },
      { symbol: 'AMD', name: 'AMD', pct: 10 },
      { symbol: 'PLTR', name: 'Palantir', pct: 10 },
      { symbol: 'AVGO', name: 'Broadcom', pct: 10 },
      { symbol: 'TSM', name: 'TSMC', pct: 10 },
    ],
  },
  {
    id: 'balanced',
    name: 'สมดุล Growth + Value',
    icon: '⚖️',
    desc: 'ผสม tech growth + dividend value — ลดความผันผวน',
    risk: 'ปานกลาง',
    riskColor: 'text-yellow bg-yellow/10',
    stocks: [
      { symbol: 'MSFT', name: 'Microsoft', pct: 15 },
      { symbol: 'AAPL', name: 'Apple', pct: 15 },
      { symbol: 'GOOGL', name: 'Alphabet', pct: 10 },
      { symbol: 'JNJ', name: 'Johnson & Johnson', pct: 10 },
      { symbol: 'PG', name: 'Procter & Gamble', pct: 10 },
      { symbol: 'KO', name: 'Coca-Cola', pct: 10 },
      { symbol: 'VOO', name: 'S&P 500 ETF', pct: 15 },
      { symbol: 'SCHD', name: 'Dividend ETF', pct: 15 },
    ],
  },
  {
    id: 'dividend-income',
    name: 'ปันผลสม่ำเสมอ',
    icon: '💰',
    desc: 'เน้น Dividend Yield สูง — สร้างรายได้ passive income',
    risk: 'ต่ำ',
    riskColor: 'text-green bg-green/10',
    stocks: [
      { symbol: 'SCHD', name: 'Schwab Dividend ETF', pct: 20 },
      { symbol: 'O', name: 'Realty Income', pct: 15 },
      { symbol: 'JNJ', name: 'Johnson & Johnson', pct: 15 },
      { symbol: 'KO', name: 'Coca-Cola', pct: 12.5 },
      { symbol: 'PEP', name: 'PepsiCo', pct: 12.5 },
      { symbol: 'ABBV', name: 'AbbVie', pct: 12.5 },
      { symbol: 'XOM', name: 'ExxonMobil', pct: 12.5 },
    ],
  },
  {
    id: 'space-defense',
    name: 'อวกาศ & กลาโหม',
    icon: '🚀',
    desc: 'เทรนด์อวกาศ + งบกลาโหมเพิ่ม — growth สูง',
    risk: 'สูง',
    riskColor: 'text-red bg-red/10',
    stocks: [
      { symbol: 'LMT', name: 'Lockheed Martin', pct: 20 },
      { symbol: 'RTX', name: 'RTX (Raytheon)', pct: 15 },
      { symbol: 'RKLB', name: 'Rocket Lab', pct: 15 },
      { symbol: 'PLTR', name: 'Palantir', pct: 15 },
      { symbol: 'AXON', name: 'Axon', pct: 10 },
      { symbol: 'ASTS', name: 'AST SpaceMobile', pct: 10 },
      { symbol: 'NOC', name: 'Northrop Grumman', pct: 15 },
    ],
  },
  {
    id: 'etf-lazy',
    name: 'ขี้เกียจแต่อยากรวย',
    icon: '😴',
    desc: 'แค่ 3 ETF ครอบคลุมทั้งตลาด — DCA แล้วลืมมัน',
    risk: 'ต่ำ',
    riskColor: 'text-green bg-green/10',
    stocks: [
      { symbol: 'VOO', name: 'S&P 500', pct: 50 },
      { symbol: 'QQQ', name: 'Nasdaq-100', pct: 30 },
      { symbol: 'SCHD', name: 'Dividend', pct: 20 },
    ],
  },
];

function formatMoney(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString();
}

export default function PopularPortfolioPage() {
  const router = useRouter();
  const addItem = useWatchlist((s) => s.addItem);
  const createList = useWatchlist((s) => s.createList);
  const setActiveList = useWatchlist((s) => s.setActiveList);

  const [capital, setCapital] = useState('100000');
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const capitalNum = parseFloat(capital.replace(/,/g, '')) || 0;
  const template = TEMPLATES.find((t) => t.id === selected);

  function handleApply() {
    if (!template) return;
    const listId = createList(`พอร์ต ${template.name}`);
    setActiveList(listId);
    for (const s of template.stocks) {
      addItem(s.symbol);
    }
    setCopied(true);
    setTimeout(() => {
      router.push('/watchlist');
    }, 1500);
  }

  return (
    <div className="px-4 lg:px-6 py-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">พอร์ตยอดนิยม</h1>
        <p className="text-[14px] text-dim mt-0.5">เลือกพอร์ตสำเร็จรูป กรอกทุน แล้วจัดพอร์ตได้ทันที</p>
      </div>

      {/* Capital input */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <label className="text-sm font-semibold text-foreground block mb-2">เงินลงทุนของฉัน (บาท)</label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dim text-sm">฿</span>
            <input
              type="text"
              value={capital}
              onChange={(e) => setCapital(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground font-mono text-lg focus:border-green/40 focus:outline-none transition-colors"
              placeholder="100000"
            />
          </div>
          <div className="flex gap-1.5">
            {[50000, 100000, 500000, 1000000].map((v) => (
              <button
                key={v}
                onClick={() => setCapital(v.toString())}
                className={`px-3 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                  capitalNum === v
                    ? 'bg-green/15 text-green border border-green/20'
                    : 'bg-surface-2 text-dim border border-border hover:text-foreground'
                }`}
              >
                {formatMoney(v)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Portfolio templates */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(selected === t.id ? null : t.id)}
            className={`text-left p-5 rounded-xl border transition-all ${
              selected === t.id
                ? 'border-green/40 bg-green/[0.03] ring-1 ring-green/20'
                : 'border-border bg-surface hover:border-border-hover hover:bg-surface-2/50'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold truncate">{t.name}</div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.riskColor}`}>
                  ความเสี่ยง {t.risk}
                </span>
              </div>
            </div>
            <p className="text-[12px] text-dim leading-relaxed">{t.desc}</p>
            <div className="mt-3 text-[11px] text-dim">
              {t.stocks.length} หุ้น · {t.stocks.map((s) => s.symbol).join(', ')}
            </div>
          </button>
        ))}
      </div>

      {/* Selected template detail */}
      {template && (
        <div className="bg-surface border border-green/15 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{template.icon}</span>
              <div>
                <h2 className="text-[15px] font-semibold">{template.name}</h2>
                <p className="text-[12px] text-dim">ทุน ฿{capitalNum.toLocaleString()} — แบ่งตามสัดส่วน</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {copied ? (
                <span className="px-4 py-2 rounded-xl text-sm font-semibold bg-green/15 text-green">
                  สร้างแล้ว! กำลังไป watchlist...
                </span>
              ) : (
                <button
                  onClick={handleApply}
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-green text-black hover:bg-green/90 transition-all"
                >
                  จัดพอร์ตนี้
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] text-dim uppercase tracking-wider">
                  <th className="text-left px-5 py-2.5">หุ้น</th>
                  <th className="text-right px-5 py-2.5">สัดส่วน</th>
                  <th className="text-right px-5 py-2.5">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {template.stocks.map((s) => {
                  const amount = (capitalNum * s.pct) / 100;
                  return (
                    <tr key={s.symbol} className="border-b border-border/30 hover:bg-surface-2/50">
                      <td className="px-5 py-2.5">
                        <span className="font-bold text-accent">{s.symbol}</span>
                        <span className="text-dim text-xs ml-2">{s.name}</span>
                      </td>
                      <td className="text-right px-5 py-2.5 font-mono">{s.pct}%</td>
                      <td className="text-right px-5 py-2.5 font-mono text-green">
                        ฿{amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-surface-2/30 font-semibold">
                  <td className="px-5 py-2.5">รวม</td>
                  <td className="text-right px-5 py-2.5 font-mono">100%</td>
                  <td className="text-right px-5 py-2.5 font-mono text-green">
                    ฿{capitalNum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

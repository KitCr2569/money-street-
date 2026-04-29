'use client';

import { useState } from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useStockQuote } from '@/hooks/useStockQuote';
import { useHydration } from '@/hooks/useHydration';
import { getStockTags } from '@/lib/stock-tags';
import { useSettings } from '@/hooks/useSettings';
import CostBasisCalc from './CostBasisCalc';
import WhatIfCalc from './WhatIfCalc';

export default function HoldingsList() {
  const hydrated = useHydration();
  const { holdings } = usePortfolio();
  const symbols = holdings.map((h) => h.symbol);
  const { quotes: quotesArr } = useStockQuote(symbols);
  const [expanded, setExpanded] = useState<string | null>(null);
  const showTags = useSettings((s) => s.showTags);

  const quotesMap: Record<string, (typeof quotesArr)[number]> = {};
  for (const q of quotesArr) quotesMap[q.symbol] = q;

  // Calculate total portfolio value for allocation %
  const totalPortfolioValue = holdings.reduce((sum, h) => {
    const q = quotesMap[h.symbol];
    const price = q?.regularMarketPrice ?? 0;
    const shares = h.lots.reduce((s, l) => s + l.shares, 0);
    return sum + price * shares;
  }, 0);

  if (!hydrated || holdings.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center text-dim text-sm">
        {!hydrated ? 'กำลังโหลด...' : 'ยังไม่มีหุ้นในพอร์ต เพิ่มหุ้นตัวแรกด้านบน'}
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 gap-2 px-4 py-2 text-[10px] font-semibold text-dim uppercase tracking-wider border-b border-border">
        <div className="text-center">สัดส่วน</div>
        <div className="text-left">ชื่อหุ้น</div>
        <div className="text-right">จำนวน</div>
        <div className="text-right">ต้นทุนเฉลี่ย</div>
        <div className="text-right">ราคา</div>
        <div className="text-right">มูลค่า</div>
        <div className="text-right">กำไร/ขาดทุน</div>
      </div>

      {holdings.map((holding) => {
        const quote = quotesMap[holding.symbol];
        const currentPrice = quote?.regularMarketPrice ?? 0;
        const totalShares = holding.lots.reduce((s, l) => s + l.shares, 0);
        const totalCost = holding.lots.reduce((s, l) => s + l.shares * l.price, 0);
        const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
        const marketValue = currentPrice * totalShares;
        const allocationPct = totalPortfolioValue > 0 ? (marketValue / totalPortfolioValue) * 100 : 0;
        const pnl = (currentPrice - avgCost) * totalShares;
        const pnlPct = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0;
        const positive = pnl >= 0;
        const isExpanded = expanded === holding.symbol;
        const tags = getStockTags(holding.symbol, quote);

        return (
          <div key={holding.symbol} className={`${isExpanded ? 'ring-1 ring-accent/30 rounded-lg' : ''}`}>
            <button
              onClick={() => setExpanded(isExpanded ? null : holding.symbol)}
              className={`w-full grid grid-cols-7 gap-2 px-4 py-3 text-[13px] transition-colors items-center ${
                isExpanded
                  ? 'bg-accent/8 border-b border-accent/20'
                  : 'hover:bg-surface-2'
              }`}
            >
              <div className="text-center font-mono text-blue font-semibold">{allocationPct.toFixed(1)}%</div>
              <div className="text-left flex items-center gap-2">
                <img
                  src={`/logos/${holding.symbol}.png`}
                  alt={holding.symbol}
                  className="shrink-0 w-7 h-7 rounded-md object-contain bg-white/5"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div>
                <div className="font-mono font-semibold text-accent">{holding.symbol}</div>
                {showTags && tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tags.map((tag) => (
                      <span
                        key={tag.label}
                        className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${tag.bg} ${tag.color}`}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}
                </div>
              </div>
              <div className="text-right font-mono text-dim">{totalShares}</div>
              <div className="text-right font-mono text-dim">{avgCost.toFixed(2)}</div>
              <div className="text-right font-mono">{currentPrice > 0 ? currentPrice.toFixed(2) : '---'}</div>
              <div className="text-right font-mono text-dim">{marketValue > 0 ? `$${marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '---'}</div>
              <div className={`text-right font-mono ${positive ? 'text-green' : 'text-red'}`}>
                {positive ? '+' : ''}{pnl.toFixed(2)} ({positive ? '+' : ''}{pnlPct.toFixed(2)}%)
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 py-4 space-y-4 bg-accent/5 border-t border-accent/15">
                <CostBasisCalc holding={holding} currentPrice={currentPrice} />
                <WhatIfCalc holding={holding} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

'use client';

import type { Holding } from '@/types';

interface CostBasisCalcProps {
  holding: Holding;
  currentPrice: number;
}

export default function CostBasisCalc({ holding, currentPrice }: CostBasisCalcProps) {
  const totalShares = holding.lots.reduce((s, l) => s + l.shares, 0);
  const totalCost = holding.lots.reduce((s, l) => s + l.shares * l.price, 0);
  const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
  const totalPnl = (currentPrice - avgCost) * totalShares;
  const totalPnlPct = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0;
  const positive = totalPnl >= 0;

  return (
    <div className="space-y-3 pt-3">
      <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
        รายละเอียดต้นทุน
      </h3>

      {/* Lots table */}
      <div className="text-xs">
        <div className="grid grid-cols-5 gap-2 py-1 text-muted font-semibold border-b border-border">
          <div>วันที่</div>
          <div className="text-right">จำนวน</div>
          <div className="text-right">ราคาซื้อ</div>
          <div className="text-right">ต้นทุน</div>
          <div className="text-right">กำไร/ขาดทุน</div>
        </div>
        {holding.lots.map((lot) => {
          const lotPnl = (currentPrice - lot.price) * lot.shares;
          const lotPositive = lotPnl >= 0;
          return (
            <div key={lot.id} className="grid grid-cols-5 gap-2 py-1.5 border-b border-border/50">
              <div className="font-mono">{lot.date}</div>
              <div className="text-right font-mono">{lot.shares}</div>
              <div className="text-right font-mono">{lot.price.toFixed(2)}</div>
              <div className="text-right font-mono">{(lot.shares * lot.price).toFixed(2)}</div>
              <div className={`text-right font-mono ${lotPositive ? 'text-green' : 'text-red'}`}>
                {lotPositive ? '+' : ''}
                {lotPnl.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-6 text-sm pt-2">
        <div>
          <span className="text-muted text-xs">ต้นทุนเฉลี่ยถ่วงน้ำหนัก</span>
          <div className="font-mono font-semibold">{avgCost.toFixed(2)}</div>
        </div>
        <div>
          <span className="text-muted text-xs">จำนวนหุ้นรวม</span>
          <div className="font-mono font-semibold">{totalShares}</div>
        </div>
        <div>
          <span className="text-muted text-xs">เงินลงทุนรวม</span>
          <div className="font-mono font-semibold">{totalCost.toFixed(2)}</div>
        </div>
        <div>
          <span className="text-muted text-xs">กำไร/ขาดทุนรวม</span>
          <div className={`font-mono font-semibold ${positive ? 'text-green' : 'text-red'}`}>
            {positive ? '+' : ''}
            {totalPnl.toFixed(2)} ({positive ? '+' : ''}
            {totalPnlPct.toFixed(2)}%)
          </div>
        </div>
      </div>
    </div>
  );
}

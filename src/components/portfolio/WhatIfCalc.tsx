'use client';

import { useState } from 'react';
import type { Holding } from '@/types';
import { calculateWhatIf } from '@/lib/cost-basis';

interface WhatIfCalcProps {
  holding: Holding;
}

export default function WhatIfCalc({ holding }: WhatIfCalcProps) {
  const [mode, setMode] = useState<'shares' | 'amount'>('shares');
  const [addShares, setAddShares] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [investAmount, setInvestAmount] = useState('');

  const pr = parseFloat(addPrice);

  // Mode: shares → use input directly
  // Mode: amount → calculate shares from amount / price
  let sh: number;
  if (mode === 'shares') {
    sh = parseFloat(addShares);
  } else {
    const amt = parseFloat(investAmount);
    sh = !isNaN(amt) && amt > 0 && !isNaN(pr) && pr > 0 ? amt / pr : 0;
  }

  const hasInput = !isNaN(sh) && sh > 0 && !isNaN(pr) && pr > 0;
  const result = hasInput ? calculateWhatIf(holding.lots, sh, pr) : null;

  return (
    <div className="space-y-3 pt-3">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
          เครื่องคิด What-If
        </h3>
        <div className="flex items-center gap-0.5 bg-surface-2 rounded-lg p-0.5 text-[11px]">
          <button
            onClick={() => setMode('shares')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              mode === 'shares' ? 'bg-accent text-background' : 'text-dim hover:text-foreground'
            }`}
          >
            จำนวนหุ้น
          </button>
          <button
            onClick={() => setMode('amount')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              mode === 'amount' ? 'bg-accent text-background' : 'text-dim hover:text-foreground'
            }`}
          >
            เงินลงทุน
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        {mode === 'shares' ? (
          <input
            type="number"
            value={addShares}
            onChange={(e) => setAddShares(e.target.value)}
            placeholder="จำนวนที่ซื้อเพิ่ม"
            step="any"
            className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent w-44"
          />
        ) : (
          <div className="relative w-44">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-dim">$</span>
            <input
              type="number"
              value={investAmount}
              onChange={(e) => setInvestAmount(e.target.value)}
              placeholder="เงินลงทุน"
              step="any"
              className="bg-background border border-border rounded-md pl-7 pr-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent w-full"
            />
          </div>
        )}
        <input
          type="number"
          value={addPrice}
          onChange={(e) => setAddPrice(e.target.value)}
          placeholder="ราคาซื้อ"
          step="any"
          className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent w-44"
        />
      </div>

      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm bg-card rounded-lg border border-border p-3">
          {mode === 'amount' && (
            <div>
              <span className="text-muted text-xs">ซื้อได้</span>
              <div className="font-mono font-semibold text-accent">{sh.toFixed(2)} <span className="text-dim text-[10px]">หุ้น</span></div>
            </div>
          )}
          <div>
            <span className="text-muted text-xs">ต้นทุนเฉลี่ยใหม่</span>
            <div className="font-mono font-semibold">{result.newAvgCost.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-muted text-xs">จำนวนหุ้นรวม</span>
            <div className="font-mono font-semibold">{result.newShares.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-muted text-xs">เงินลงทุนรวม</span>
            <div className="font-mono font-semibold">${result.newInvestment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <span className="text-muted text-xs">ต้นทุนเปลี่ยนแปลง</span>
            <div
              className={`font-mono font-semibold ${
                result.newAvgCost < result.currentAvgCost ? 'text-green' : result.newAvgCost > result.currentAvgCost ? 'text-red' : 'text-dim'
              }`}
            >
              {result.newAvgCost < result.currentAvgCost ? '' : '+'}
              {(result.newAvgCost - result.currentAvgCost).toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

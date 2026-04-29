'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';

interface TradeCalcModalProps {
  open: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number | null;
}

const THB_RATE = 34; // approximate USD→THB

export default function TradeCalcModal({ open, onClose, symbol, currentPrice }: TradeCalcModalProps) {
  const [buyPrice, setBuyPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'THB'>('USD');
  const [targetPrice, setTargetPrice] = useState('');
  const buyRef = useRef<HTMLInputElement>(null);

  // Pre-fill buy price with current price
  useEffect(() => {
    if (open && currentPrice) {
      setBuyPrice(currentPrice.toFixed(2));
      setAmount('');
      setTargetPrice('');
    }
  }, [open, currentPrice]);

  useEffect(() => {
    if (open) setTimeout(() => buyRef.current?.select(), 100);
  }, [open]);

  const buyPriceNum = parseFloat(buyPrice) || 0;
  const amountNum = parseFloat(amount) || 0;
  const targetNum = parseFloat(targetPrice) || 0;

  // Convert amount to USD if THB
  const investUSD = currency === 'THB' ? amountNum / THB_RATE : amountNum;
  const investTHB = currency === 'THB' ? amountNum : amountNum * THB_RATE;

  // Calculate shares
  const shares = buyPriceNum > 0 ? Math.floor(investUSD / buyPriceNum) : 0;
  const actualCostUSD = shares * buyPriceNum;
  const actualCostTHB = actualCostUSD * THB_RATE;

  // Calculate profit
  const profitUSD = shares * (targetNum - buyPriceNum);
  const profitTHB = profitUSD * THB_RATE;
  const profitPct = buyPriceNum > 0 ? ((targetNum - buyPriceNum) / buyPriceNum) * 100 : 0;

  const hasResult = shares > 0 && targetNum > 0;
  const isProfit = profitUSD >= 0;

  return (
    <Modal open={open} onClose={onClose} title="">
      <div className="-mt-3">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="2" width="16" height="20" rx="2" strokeWidth={1.5} />
              <rect x="7" y="5" width="10" height="4" rx="1" strokeWidth={1.5} />
              <circle cx="8.5" cy="12.5" r="0.75" fill="currentColor" stroke="none" />
              <circle cx="12" cy="12.5" r="0.75" fill="currentColor" stroke="none" />
              <circle cx="15.5" cy="12.5" r="0.75" fill="currentColor" stroke="none" />
              <circle cx="8.5" cy="15.5" r="0.75" fill="currentColor" stroke="none" />
              <circle cx="12" cy="15.5" r="0.75" fill="currentColor" stroke="none" />
              <circle cx="15.5" cy="15.5" r="0.75" fill="currentColor" stroke="none" />
              <circle cx="8.5" cy="18.5" r="0.75" fill="currentColor" stroke="none" />
              <circle cx="12" cy="18.5" r="0.75" fill="currentColor" stroke="none" />
              <circle cx="15.5" cy="18.5" r="0.75" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-foreground">คำนวณกำไร {symbol}</h3>
            {currentPrice != null && (
              <p className="text-[13px] text-dim">
                ราคาปัจจุบัน <span className="text-accent font-semibold font-mono">${currentPrice.toFixed(2)}</span>
                <span className="text-dim/60 ml-1">({(currentPrice * THB_RATE).toLocaleString('th-TH', { maximumFractionDigits: 0 })} บาท)</span>
              </p>
            )}
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          {/* Buy Price */}
          <div>
            <label className="text-[12px] text-dim font-medium mb-1 block">ราคาซื้อ (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dim text-[13px]">$</span>
              <input
                ref={buyRef}
                type="number"
                step="0.01"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-surface border border-border rounded-lg pl-7 pr-3 py-2 text-sm text-foreground font-mono placeholder:text-dim/40 focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          </div>

          {/* Amount + Currency toggle */}
          <div>
            <label className="text-[12px] text-dim font-medium mb-1 block">จำนวนเงินลงทุน</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dim text-[13px]">
                  {currency === 'USD' ? '$' : '฿'}
                </span>
                <input
                  type="number"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-surface border border-border rounded-lg pl-7 pr-3 py-2 text-sm text-foreground font-mono placeholder:text-dim/40 focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
              <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-2 text-[12px] font-semibold transition-colors ${
                    currency === 'USD' ? 'bg-accent text-background' : 'bg-surface text-dim hover:text-foreground'
                  }`}
                >
                  USD
                </button>
                <button
                  onClick={() => setCurrency('THB')}
                  className={`px-3 py-2 text-[12px] font-semibold transition-colors ${
                    currency === 'THB' ? 'bg-accent text-background' : 'bg-surface text-dim hover:text-foreground'
                  }`}
                >
                  THB
                </button>
              </div>
            </div>
          </div>

          {/* Target Price */}
          <div>
            <label className="text-[12px] text-dim font-medium mb-1 block">เป้าหมายขาย (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dim text-[13px]">$</span>
              <input
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-surface border border-border rounded-lg pl-7 pr-3 py-2 text-sm text-foreground font-mono placeholder:text-dim/40 focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {shares > 0 && (
          <div className="mt-4 rounded-xl bg-surface border border-border p-4 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-dim">จำนวนหุ้นที่ซื้อได้</span>
              <span className="text-[16px] font-bold text-foreground font-mono">{shares.toLocaleString()} หุ้น</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-dim">ต้นทุนจริง</span>
              <span className="text-[13px] text-foreground font-mono">
                ${actualCostUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-dim/60 ml-1">({actualCostTHB.toLocaleString('th-TH', { maximumFractionDigits: 0 })} บาท)</span>
              </span>
            </div>

            {hasResult && (
              <>
                <div className="border-t border-border/50 my-1" />
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-dim">{isProfit ? 'กำไร' : 'ขาดทุน'}</span>
                  <span className={`text-[16px] font-bold font-mono ${isProfit ? 'text-green' : 'text-red'}`}>
                    {isProfit ? '+' : ''}{profitPct.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-dim">มูลค่า ({isProfit ? 'กำไร' : 'ขาดทุน'})</span>
                  <div className="text-right">
                    <span className={`text-[14px] font-bold font-mono ${isProfit ? 'text-green' : 'text-red'}`}>
                      {isProfit ? '+' : ''}${Math.abs(profitUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <div className={`text-[12px] font-mono ${isProfit ? 'text-green/70' : 'text-red/70'}`}>
                      {isProfit ? '+' : ''}{Math.abs(profitTHB).toLocaleString('th-TH', { maximumFractionDigits: 0 })} บาท
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Close button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg text-[13px] font-semibold text-dim hover:text-foreground hover:bg-surface-2 transition-all"
          >
            ปิด
          </button>
        </div>
      </div>
    </Modal>
  );
}

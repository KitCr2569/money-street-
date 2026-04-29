'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { StockAnalysisInput, AnalysisRequest, TradingStrategy } from '@/app/api/ai/analyze/route';
import type { AnalysisHistoryItem } from '@/app/api/ai/history/route';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'single' | 'dashboard';
  stocks: StockAnalysisInput[];
  range: string;
}

const strategies: { value: TradingStrategy; icon: string; label: string; desc: string }[] = [
  { value: 'week',  icon: '📊', label: 'เทรดรายสัปดาห์', desc: 'แนวโน้ม 1-2 สัปดาห์ แนวรับ/ต้าน' },
  { value: 'month', icon: '📈', label: 'เทรดรายเดือน',   desc: '1-3 เดือน งบการเงิน อุตสาหกรรม' },
  { value: 'long',  icon: '🏦', label: 'ลงทุนระยะยาว',   desc: 'พื้นฐานบริษัท การเติบโต 1 ปี+ DCA' },
];

type Step = 'pick' | 'history' | 'result';

function formatTime(time: string): string {
  // HHmmss → HH:mm
  return `${time.slice(0, 2)}:${time.slice(2, 4)}`;
}

function formatDate(date: string): string {
  // YYYY-MM-DD → DD/MM/YYYY
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

export default function AIAnalysisModal({ open, onClose, mode, stocks, range }: Props) {
  const router = useRouter();
  const isAdmin = true;
  const [step, setStep] = useState<Step>('pick');
  const [strategy, setStrategy] = useState<TradingStrategy | null>(null);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyItems, setHistoryItems] = useState<AnalysisHistoryItem[]>([]);
  const [strategyHistory, setStrategyHistory] = useState<AnalysisHistoryItem[]>([]);

  const sym = mode === 'single' ? stocks[0]?.symbol : null;
  const symKey = mode === 'dashboard' ? 'watchlist' : sym?.toUpperCase() ?? '';

  // Fetch history when opening
  useEffect(() => {
    if (open) {
      setStep('pick');
      setStrategy(null);
      setAnalysis('');
      setError('');
      setHistoryItems([]);
      setStrategyHistory([]);

      fetch('/api/ai/history')
        .then((r) => r.json())
        .then((items: AnalysisHistoryItem[]) => {
          if (!Array.isArray(items)) return;
          const filtered = items.filter(
            (i) => i.symbol.toUpperCase() === symKey.toUpperCase()
          );
          setHistoryItems(filtered);
        })
        .catch(() => {});
    }
  }, [open, symKey]);

  // When a strategy is selected, check if it has history
  const isLocalDev = true;

  // Load a saved analysis file
  const loadSavedAnalysis = useCallback(async (filename: string) => {
    setStep('result');
    setLoading(true);
    setError('');
    setAnalysis('');

    try {
      const res = await fetch(`/api/ai/history/${filename}`);
      if (!res.ok) throw new Error('ไม่พบไฟล์วิเคราะห์');
      const data = await res.json();
      // Strip frontmatter
      const cleaned = (data.content || '').replace(/^---[\s\S]*?---\n*/, '');
      setAnalysis(cleaned);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }, []);

  const doFetchAnalysis = useCallback(async (strat: TradingStrategy) => {
    setStep('result');
    setStrategy(strat);
    setLoading(true);
    setError('');
    setAnalysis('');

    try {
      const body: AnalysisRequest = { mode, stocks, range, strategy: strat };
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setAnalysis(data.analysis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }, [mode, stocks, range]);

  const handleStrategyClick = useCallback((strat: TradingStrategy) => {
    const matching = historyItems
      .filter((i) => i.strategy === strat)
      .sort((a, b) => `${b.date}_${b.time}`.localeCompare(`${a.date}_${a.time}`));
    setStrategy(strat);

    if (matching.length > 0) {
      loadSavedAnalysis(matching[0].filename);
    } else if (isAdmin && isLocalDev) {
      doFetchAnalysis(strat);
    } else {
      setStrategyHistory([]);
      setStep('result');
      setAnalysis('');
      setError('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyItems, isAdmin, isLocalDev, loadSavedAnalysis, doFetchAnalysis]);

  // Check financial analysis exists
  const financialItem = historyItems.find(
    (i) => i.filename.includes('_financial_')
  );

  const handleFinancialClick = useCallback(() => {
    if (financialItem) {
      loadSavedAnalysis(financialItem.filename);
    }
  }, [financialItem, loadSavedAnalysis]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const title = mode === 'single'
    ? `AI วิเคราะห์ ${stocks[0]?.symbol}`
    : 'AI วิเคราะห์ Watchlist';

  const activeStrat = strategies.find((s) => s.value === strategy);

  // Count history per strategy for badge
  const historyCount = (strat: string) => historyItems.filter((i) => i.strategy === strat).length;

  // Check profile exists
  const hasProfile = historyItems.some(
    (i) => i.filename.includes('_profile_')
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[85vh] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-2/50">
          <div className="flex items-center gap-2 min-w-0">
            {step === 'result' && (
              <button
                onClick={() => setStep('pick')}
                className="text-[12px] text-dim hover:text-foreground transition-colors"
              >
                ←
              </button>
            )}
            <h2 className="text-[15px] font-semibold text-foreground">
              {step === 'pick' ? 'เลือกกลยุทธ์การวิเคราะห์' : title}
            </h2>
            {activeStrat && step === 'result' && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-accent/10 text-accent font-medium">
                {activeStrat.icon} {activeStrat.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-dim bg-surface-3 px-2 py-0.5 rounded-md font-mono">{range}</span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-dim hover:text-foreground hover:bg-surface-3 transition-colors text-[16px]"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Step 1: Pick strategy */}
          {step === 'pick' && (
            <div className="space-y-2">
              <p className="text-[13px] text-dim mb-3">
                {mode === 'single'
                  ? `เลือกกลยุทธ์สำหรับวิเคราะห์ ${stocks[0]?.symbol}`
                  : `เลือกกลยุทธ์สำหรับวิเคราะห์ ${stocks.length} หุ้นใน Watchlist`
                }
              </p>
              {/* Financial Analysis — Premium Card */}
              {mode === 'single' && stocks[0] && financialItem && (
                <button
                  onClick={handleFinancialClick}
                  className="w-full relative overflow-hidden rounded-2xl border border-green/30 bg-gradient-to-br from-green/8 via-surface to-accent/5 hover:from-green/12 hover:to-accent/10 transition-all text-left group/fa mb-4"
                >
                  {/* Glow effect */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green/5 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl" />
                  <div className="relative flex items-center gap-4 p-5">
                    {/* Logo */}
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-xl bg-surface border border-green/20 flex items-center justify-center overflow-hidden shadow-lg shadow-green/5">
                        <img
                          src={`/logos/${stocks[0].symbol}.png`}
                          alt={stocks[0].symbol}
                          className="w-10 h-10 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <span className="hidden text-[14px] font-bold text-green">{stocks[0].symbol.slice(0, 2)}</span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green rounded-full flex items-center justify-center shadow-md">
                        <svg className="w-3 h-3 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[15px] font-bold text-green group-hover/fa:text-green transition-colors">
                          วิเคราะห์งบการเงิน
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-green/15 text-green font-bold tracking-wide uppercase">
                          Premium
                        </span>
                      </div>
                      <p className="text-[12px] text-dim leading-relaxed">
                        Scorecard 100 คะแนน · Profitability · Growth · Valuation · Balance Sheet
                      </p>
                      <p className="text-[10px] text-dim/50 mt-1">
                        by MoneyStreet.co
                      </p>
                    </div>
                    <div className="shrink-0 w-8 h-8 rounded-full bg-green/10 flex items-center justify-center group-hover/fa:bg-green/20 transition-colors">
                      <svg className="w-4 h-4 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              )}

              {/* Divider between premium and other options */}
              {mode === 'single' && stocks[0] && (
                <div className="flex items-center gap-3 pb-1">
                  <div className="flex-1 border-t border-border/50" />
                  <span className="text-[10px] text-dim/40 uppercase tracking-wider">กลยุทธ์เทรด</span>
                  <div className="flex-1 border-t border-border/50" />
                </div>
              )}

              {mode === 'single' && stocks[0] && (
                <button
                  onClick={() => {
                    onClose();
                    router.push(`/stock/${stocks[0].symbol}/profile`);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-accent/40 hover:bg-surface-2/50 transition-all text-left group/s"
                >
                  <span className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg bg-surface-2 group-hover/s:bg-accent/10 transition-colors">
                    🏢
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-foreground group-hover/s:text-accent transition-colors">
                        {stocks[0].symbol} คืออะไร?
                      </span>
                      {hasProfile && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-dim text-green font-semibold">
                          มีข้อมูลแล้ว
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-dim mt-0.5">AI สรุปธุรกิจ + สถิติการเงิน Market Cap, Revenue, P/E</div>
                  </div>
                  <span className="text-dim text-[14px]">→</span>
                </button>
              )}

              {strategies.map((s) => {
                const count = historyCount(s.value);
                return (
                  <button
                    key={s.value}
                    onClick={() => handleStrategyClick(s.value)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-accent/40 hover:bg-surface-2/50 transition-all text-left group/s"
                  >
                    <span className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg bg-surface-2 group-hover/s:bg-accent/10 transition-colors">
                      {s.icon}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-foreground group-hover/s:text-accent transition-colors">
                          {s.label}
                        </span>
                        {count > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-dim text-green font-semibold">
                            วิเคราะห์แล้ว {count} ครั้ง
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-dim mt-0.5">{s.desc}</div>
                    </div>
                    <span className="text-dim text-[14px]">→</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: History — removed, now loads latest directly */}

          {/* Step 3: Result */}
          {step === 'result' && loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <p className="text-[13px] text-dim">กำลังวิเคราะห์...</p>
              <p className="text-[11px] text-dim/50">อาจใช้เวลา 10-30 วินาที</p>
            </div>
          )}

          {step === 'result' && error && (
            <div className="bg-red-dim rounded-xl p-4 text-[13px]">
              <p className="text-red font-semibold mb-1">ไม่สามารถวิเคราะห์ได้</p>
              <p className="text-dim text-[12px]">{error}</p>
              <button
                onClick={() => strategy && doFetchAnalysis(strategy)}
                className="mt-3 px-3 py-1.5 bg-surface-2 rounded-lg text-[12px] text-accent hover:bg-surface-3 transition-colors"
              >
                ลองใหม่
              </button>
            </div>
          )}

          {step === 'result' && !loading && !error && analysis && (
            <MarkdownRenderer content={analysis} />
          )}

          {step === 'result' && !loading && !error && !analysis && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4 opacity-40">📊</div>
              <p className="text-dim text-[14px]">ยังไม่มีบทวิเคราะห์สำหรับกลยุทธ์นี้</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-border bg-surface-2/30 flex items-center justify-between">
          <p className="text-[9px] text-dim/40">
            เป็นเพียงการวิเคราะห์จาก AI ไม่ใช่คำแนะนำทางการเงิน
          </p>
          {step === 'result' && !loading && analysis && (
            <button
              onClick={() => setStep('pick')}
              className="text-[11px] text-accent hover:text-accent/80 transition-colors"
            >
              เปลี่ยนกลยุทธ์
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
// Logos served from /logos/{SYMBOL}.png (static files)
import { useWatchlist } from '@/hooks/useWatchlist';
import { useHydration } from '@/hooks/useHydration';

interface AnalysisItem {
  filename: string;
  symbol: string;
  date: string;
  time: string;
  range: string;
  strategy: string;
}

const STRATEGIES = [
  { key: 'week',  label: 'รายสัปดาห์',   icon: '📆', desc: '1-2 สัปดาห์' },
  { key: 'month', label: 'รายเดือน',     icon: '📈', desc: '1-3 เดือน' },
  { key: 'long',  label: 'ระยะยาว',      icon: '🏗️',  desc: '1 ปีขึ้นไป' },
];

interface ProfileData {
  symbol: string;
  shortName: string;
  sector: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  fullTimeEmployees: number | null;
  longBusinessSummary: string | null;
  marketCap: number | null;
  currency: string;
  currentPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice: number | null;
  targetMeanPrice: number | null;
  recommendationKey: string | null;
  numberOfAnalystOpinions: number | null;
  totalRevenue: number | null;
  revenueGrowth: number | null;
  grossMargins: number | null;
  operatingMargins: number | null;
  profitMargins: number | null;
  totalCash: number | null;
  totalDebt: number | null;
  returnOnEquity: number | null;
  freeCashflow: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  enterpriseValue: number | null;
  beta: number | null;
  sharesOutstanding: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  regularMarketChangePercent: number | null;
  dividendYield: number | null;
  exchange: string | null;
}

function fmt(n: number | null, suffix = ''): string {
  if (n == null) return '—';
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T${suffix}`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B${suffix}`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M${suffix}`;
  return `$${n.toLocaleString()}${suffix}`;
}

function pct(n: number | null): string {
  if (n == null) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3">
      <div className="text-[10px] text-dim uppercase tracking-wider mb-1">{label}</div>
      <div className="text-[16px] font-bold text-foreground">{value}</div>
      {sub && <div className="text-[11px] text-dim mt-0.5">{sub}</div>}
    </div>
  );
}

export default function StockProfilePage() {
  const { symbol } = useParams<{ symbol: string }>();
  const sym = symbol?.toUpperCase() ?? '';
  // logoMap no longer needed — using static /logos/{sym}.png
  const isAdmin = true;
  const isPro = true;
  const hydrated = useHydration();

  const lists = useWatchlist((s) => s.lists);
  const addItem = useWatchlist((s) => s.addItem);
  const setActiveList = useWatchlist((s) => s.setActiveList);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Watchlist picker state
  const [showPicker, setShowPicker] = useState(false);
  const [addedList, setAddedList] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Analysis modal state
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [availableAnalyses, setAvailableAnalyses] = useState<AnalysisItem[]>([]);
  const [analysesLoaded, setAnalysesLoaded] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [analysisContent, setAnalysisContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    if (showPicker) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showPicker]);

  // Close modal on outside click or Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) closeModal();
    }
    if (showAnalysisModal) {
      document.addEventListener('keydown', handleKey);
      document.addEventListener('mousedown', handleClick);
      return () => {
        document.removeEventListener('keydown', handleKey);
        document.removeEventListener('mousedown', handleClick);
      };
    }
  }, [showAnalysisModal]);

  function closeModal() {
    setShowAnalysisModal(false);
    setSelectedStrategy(null);
    setAnalysisContent(null);
  }

  const handleOpenAnalysisModal = useCallback(async () => {
    setShowAnalysisModal(true);
    if (analysesLoaded) return;
    try {
      const res = await fetch(`/api/ai/history?symbol=${encodeURIComponent(sym)}`);
      if (!res.ok) throw new Error('not found');
      const data: AnalysisItem[] = await res.json();
      setAvailableAnalyses(data);
    } catch {
      setAvailableAnalyses([]);
    }
    setAnalysesLoaded(true);
  }, [sym, analysesLoaded]);

  const handleSelectStrategy = useCallback(async (strategy: string) => {
    const item = availableAnalyses
      .filter((a) => a.strategy === strategy)
      .sort((a, b) => `${b.date}_${b.time}`.localeCompare(`${a.date}_${a.time}`))[0];
    if (!item) return;
    setSelectedStrategy(strategy);
    setLoadingContent(true);
    setAnalysisContent(null);
    try {
      const res = await fetch(`/api/ai/history/${encodeURIComponent(item.filename)}`);
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      const cleaned = (data.content ?? '').replace(/^---[\s\S]*?---\n*/, '');
      setAnalysisContent(cleaned || null);
    } catch {
      setAnalysisContent(null);
    }
    setLoadingContent(false);
  }, [availableAnalyses]);

  function handleAddToList(listId: string) {
    const prev = useWatchlist.getState().activeListId;
    setActiveList(listId);
    addItem(sym);
    setActiveList(prev);
    const listName = lists.find((l) => l.id === listId)?.name ?? '';
    setAddedList(listName);
    setShowPicker(false);
    setTimeout(() => setAddedList(null), 2500);
  }

  // Fetch profile data
  useEffect(() => {
    if (!sym) return;
    setLoading(true);
    fetch(`/api/yahoo/profile?symbol=${encodeURIComponent(sym)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProfile(data);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [sym]);

  // Auto-load existing AI summary (read only — never auto-generate)
  useEffect(() => {
    if (!profile || aiSummary || aiLoading || !isPro) return;

    // Try today first, then latest
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${sym}_profile_${dateStr}.md`;
    fetch(`/api/ai/profile-content?filename=${encodeURIComponent(filename)}`)
      .then((r) => {
        if (r.ok) return r.json();
        // Today not found — try latest
        return fetch(`/api/ai/profile-content?symbol=${encodeURIComponent(sym)}`).then((r2) => {
          if (r2.ok) return r2.json();
          throw new Error('not found');
        });
      })
      .then((data) => {
        const cleaned = (data.content || '').replace(/^---[\s\S]*?---\n*/, '');
        if (cleaned.trim()) setAiSummary(cleaned);
      })
      .catch(() => {
        // No cached file — do nothing, show empty state
      });
  }, [profile, sym, aiSummary, aiLoading, isPro]);

  // Admin: manually generate AI profile
  const handleGenerate = async () => {
    if (!isAdmin || !profile) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: sym, profileData: profile }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiSummary(data.summary);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface-3 rounded w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-20 bg-surface-3 rounded-xl" />)}
          </div>
          <div className="h-64 bg-surface-3 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-center">
        <div className="text-[32px] mb-3 opacity-40">❌</div>
        <p className="text-dim">ไม่พบข้อมูลหุ้น {sym}</p>
        <Link href="/" className="text-accent text-[13px] mt-2 inline-block">← กลับหน้าแรก</Link>
      </div>
    );
  }

  const recMap: Record<string, { label: string; color: string }> = {
    buy: { label: '🟢 ซื้อ', color: 'text-green' },
    strong_buy: { label: '🟢 แนะนำซื้อ', color: 'text-green' },
    strongBuy: { label: '🟢 แนะนำซื้อ', color: 'text-green' },
    hold: { label: '🟡 ถือ', color: 'text-yellow' },
    sell: { label: '🔴 ขาย', color: 'text-red' },
    strong_sell: { label: '🔴 แนะนำขาย', color: 'text-red' },
    strongSell: { label: '🔴 แนะนำขาย', color: 'text-red' },
    underperform: { label: '🟠 ต่ำกว่าตลาด', color: 'text-yellow' },
    outperform: { label: '🟢 สูงกว่าตลาด', color: 'text-green' },
  };
  const rec = recMap[profile.recommendationKey ?? ''] ?? { label: profile.recommendationKey ?? '—', color: 'text-dim' };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <img
          src={`/logos/${sym}.png`}
          alt={sym}
          className="w-14 h-14 rounded-xl object-contain bg-white/5 border border-border"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="hidden w-14 h-14 rounded-xl bg-surface-2 flex items-center justify-center text-[18px] font-bold text-dim border border-border">
          {sym.slice(0, 2)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{sym}</h1>
            {profile.exchange && <span className="text-[11px] text-dim bg-surface-2 px-2 py-0.5 rounded">{profile.exchange}</span>}
          </div>
          <div className="text-[14px] text-dim">{profile.shortName}</div>
          <div className="flex items-center gap-2 mt-1 text-[12px]">
            {profile.sector && <span className="bg-blue-dim text-blue px-2 py-0.5 rounded font-semibold">{profile.sector}</span>}
            {profile.industry && <span className="bg-surface-2 text-dim px-2 py-0.5 rounded">{profile.industry}</span>}
            {profile.country && <span className="text-dim">{profile.country}</span>}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[24px] font-bold font-mono text-foreground">${profile.currentPrice?.toFixed(2) ?? '—'}</div>
          <div className={`text-[14px] font-semibold ${(profile.regularMarketChangePercent ?? 0) >= 0 ? 'text-green' : 'text-red'}`}>
            {(profile.regularMarketChangePercent ?? 0) >= 0 ? '▲' : '▼'} {profile.regularMarketChangePercent?.toFixed(2) ?? '0'}%
          </div>
        </div>
      </div>

      {/* Financial Analysis Banner */}
      {availableAnalyses.some((a) => a.strategy === 'financial-analysis') && (
        <button
          onClick={() => {
            const item = availableAnalyses.find((a) => a.strategy === 'financial-analysis');
            if (item) {
              setShowAnalysisModal(true);
              handleSelectStrategy('financial-analysis');
            }
          }}
          className="w-full relative overflow-hidden rounded-2xl border border-green/25 bg-gradient-to-r from-green/5 via-surface to-accent/5 hover:from-green/10 hover:to-accent/8 transition-all text-left group/banner"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-green/5 rounded-full blur-3xl" />
          <div className="relative flex items-center gap-4 px-5 py-4">
            <div className="w-12 h-12 rounded-xl bg-surface border border-green/20 flex items-center justify-center overflow-hidden shadow-lg shadow-green/5 shrink-0">
              <img
                src={`/logos/${sym}.png`}
                alt={sym}
                className="w-8 h-8 object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-green">วิเคราะห์งบการเงิน {sym}</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-green/15 text-green font-bold uppercase">Premium</span>
              </div>
              <p className="text-[11px] text-dim mt-0.5">Scorecard 100 คะแนน · Profitability · Growth · Valuation · Balance Sheet</p>
            </div>
            <div className="shrink-0 w-8 h-8 rounded-full bg-green/10 flex items-center justify-center group-hover/banner:bg-green/20 transition-colors">
              <svg className="w-4 h-4 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Add to Watchlist — prominent button */}
        {hydrated && (
          <div className="relative" ref={pickerRef}>
            {addedList ? (
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green/15 border border-green/30 text-green text-[14px] font-semibold animate-in fade-in duration-200">
                <span className="text-[16px]">✓</span>
                เพิ่มใน {addedList} แล้ว
              </div>
            ) : (
              <button
                onClick={() => setShowPicker(!showPicker)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent/15 border border-accent/30 text-accent text-[14px] font-semibold hover:bg-accent/25 hover:border-accent/50 transition-all"
              >
                <span className="text-[18px]">+</span>
                เพิ่มเข้า Watchlist
              </button>
            )}
            {showPicker && (
              <div className="absolute left-0 top-full mt-2 z-50 w-56 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2.5 border-b border-border/50 bg-surface-2/50">
                  <p className="text-[12px] font-semibold text-dim uppercase tracking-wider">เลือก Watchlist</p>
                </div>
                <div className="py-1 max-h-56 overflow-y-auto">
                  {lists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => handleAddToList(list.id)}
                      className="w-full text-left px-4 py-2.5 text-[14px] text-foreground hover:bg-accent/10 hover:text-accent transition-colors flex items-center justify-between"
                    >
                      <span className="truncate">{list.name}</span>
                      <span className="text-[12px] text-dim ml-2 shrink-0">{list.items.length} ตัว</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Link href={`/stock/${sym}`} className="px-4 py-2.5 rounded-xl bg-surface border border-border text-dim text-[14px] font-semibold hover:text-foreground hover:bg-surface-2 transition-all">
          📊 กราฟ
        </Link>
        <button
          onClick={handleOpenAnalysisModal}
          className="px-4 py-2.5 rounded-xl bg-surface border border-border text-dim text-[14px] font-semibold hover:text-foreground hover:bg-surface-2 transition-all"
        >
          🔍 วิเคราะห์
        </button>
        <Link href="/discover" className="px-4 py-2.5 rounded-xl bg-surface border border-border text-dim text-[14px] font-semibold hover:text-foreground hover:bg-surface-2 transition-all">
          ← หมวดหุ้นแนะนำ
        </Link>
      </div>

      {/* Analysis Modal */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            ref={modalRef}
            className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-[16px] font-bold text-foreground">🔍 บทวิเคราะห์ {sym}</h2>
                {selectedStrategy && (
                  <button onClick={() => { setSelectedStrategy(null); setAnalysisContent(null); }} className="text-[12px] text-accent mt-0.5 hover:underline">
                    ← เลือกระยะเวลาอื่น
                  </button>
                )}
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-dim hover:text-foreground hover:bg-surface-2 transition-colors text-[18px]">
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {!selectedStrategy ? (
                /* Strategy selection */
                <div>
                  <p className="text-[13px] text-dim mb-4">เลือกระยะเวลาที่ต้องการดูบทวิเคราะห์</p>
                  <div className="grid grid-cols-2 gap-3">
                    {STRATEGIES.map(({ key, label, icon, desc }) => {
                      const hasAnalysis = availableAnalyses.some((a) => a.strategy === key);
                      const latest = availableAnalyses
                        .filter((a) => a.strategy === key)
                        .sort((a, b) => `${b.date}_${b.time}`.localeCompare(`${a.date}_${a.time}`))[0];
                      return (
                        <button
                          key={key}
                          disabled={!hasAnalysis || !analysesLoaded}
                          onClick={() => handleSelectStrategy(key)}
                          className={`flex flex-col items-start gap-1 p-4 rounded-xl border text-left transition-all ${
                            hasAnalysis
                              ? 'border-accent/40 bg-accent/5 hover:bg-accent/10 hover:border-accent/70 cursor-pointer'
                              : 'border-border bg-surface-2/50 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className="text-[20px]">{icon}</span>
                            <span className="text-[14px] font-bold text-foreground">{label}</span>
                            {hasAnalysis && (
                              <span className="ml-auto text-[10px] text-green bg-green/10 px-2 py-0.5 rounded-full font-semibold">มีข้อมูล</span>
                            )}
                          </div>
                          <span className="text-[12px] text-dim">{desc}</span>
                          {latest && (
                            <span className="text-[11px] text-dim/60">{latest.date}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {analysesLoaded && availableAnalyses.length === 0 && (
                    <div className="text-center py-6 text-dim text-[13px]">
                      ยังไม่มีบทวิเคราะห์สำหรับ {sym}
                    </div>
                  )}
                  {!analysesLoaded && (
                    <div className="flex justify-center py-6">
                      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                /* Analysis content */
                <div>
                  {loadingContent && (
                    <div className="flex items-center gap-3 text-dim py-6">
                      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      <span className="text-[14px]">กำลังโหลดบทวิเคราะห์...</span>
                    </div>
                  )}
                  {!loadingContent && analysisContent && (
                    <MarkdownRenderer content={analysisContent} />
                  )}
                  {!loadingContent && !analysisContent && (
                    <div className="text-dim text-[13px] text-center py-6">ไม่สามารถโหลดบทวิเคราะห์ได้</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Key Stats */}
      <div>
        <h2 className="text-[14px] font-semibold text-foreground mb-3">สถิติสำคัญ</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatBox label="มูลค่าตลาด" value={fmt(profile.marketCap)} />
          <StatBox label="ราคา/กำไร (P/E)" value={profile.forwardPE?.toFixed(1) ?? profile.trailingPE?.toFixed(1) ?? '—'} sub={profile.trailingPE ? `ย้อนหลัง: ${profile.trailingPE.toFixed(1)}` : 'Forward P/E'} />
          <StatBox label="รายได้" value={fmt(profile.totalRevenue)} sub={`เติบโต: ${pct(profile.revenueGrowth)}`} />
          <StatBox label="อัตรากำไรสุทธิ" value={pct(profile.profitMargins)} sub={`จากการดำเนินงาน: ${pct(profile.operatingMargins)}`} />
          <StatBox label="ผลตอบแทนผู้ถือหุ้น" value={pct(profile.returnOnEquity)} />
          <StatBox label="กระแสเงินสดอิสระ" value={fmt(profile.freeCashflow)} />
          <StatBox label="เงินสด / หนี้" value={fmt(profile.totalCash)} sub={`หนี้: ${fmt(profile.totalDebt)}`} />
          <StatBox label="ความผันผวน (Beta)" value={profile.beta?.toFixed(2) ?? '—'} sub={`ปันผล: ${profile.dividendYield ? (profile.dividendYield * 100).toFixed(2) + '%' : '—'}`} />
        </div>
      </div>

      {/* Analyst Consensus */}
      <div>
        <h2 className="text-[14px] font-semibold text-foreground mb-3">มุมมองนักวิเคราะห์</h2>
        <div className="glass rounded-xl p-4 flex items-center gap-6">
          <div className="text-center">
            <div className={`text-[18px] font-bold ${rec.color}`}>{rec.label}</div>
            <div className="text-[11px] text-dim mt-1">{profile.numberOfAnalystOpinions ?? 0} นักวิเคราะห์</div>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[11px] text-dim">เป้าต่ำสุด</div>
              <div className="font-mono text-[14px] text-red">${profile.targetLowPrice?.toFixed(2) ?? '—'}</div>
            </div>
            <div>
              <div className="text-[11px] text-dim">เป้าเฉลี่ย</div>
              <div className="font-mono text-[14px] text-yellow font-bold">${profile.targetMeanPrice?.toFixed(2) ?? '—'}</div>
            </div>
            <div>
              <div className="text-[11px] text-dim">เป้าสูงสุด</div>
              <div className="font-mono text-[14px] text-green">${profile.targetHighPrice?.toFixed(2) ?? '—'}</div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-[11px] text-dim">ช่วงราคา 52 สัปดาห์</div>
            <div className="font-mono text-[12px] text-foreground">${profile.fiftyTwoWeekLow?.toFixed(2)} — ${profile.fiftyTwoWeekHigh?.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div>
        <h2 className="text-[14px] font-semibold text-foreground mb-3">🤖 AI สรุปข้อมูลบริษัท</h2>
        <div>
          <div className="glass rounded-xl p-5">
            {aiLoading && (
              <div className="flex items-center gap-3 text-dim">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-[14px]">AI กำลังวิเคราะห์ข้อมูลบริษัท...</span>
              </div>
            )}
            {aiError && (
              <div className="text-red text-[13px]">❌ {aiError}</div>
            )}
            {aiSummary && (
              <MarkdownRenderer content={aiSummary} />
            )}
            {!aiLoading && !aiError && !aiSummary && (
              <div className="text-center py-4">
                <div className="text-dim text-[13px] mb-3">ยังไม่มีบทวิเคราะห์ AI สำหรับหุ้นนี้</div>
                {isAdmin && (
                  <button
                    onClick={handleGenerate}
                    className="px-4 py-2 text-[13px] font-semibold rounded-lg bg-green/10 text-green border border-green/20 hover:bg-green/20 transition-colors"
                  >
                    สร้างบทวิเคราะห์ AI
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-[11px] text-dim/50 text-center">
        ⚠️ ข้อมูลจาก Yahoo Finance + AI สรุป — ไม่ใช่คำแนะนำทางการเงิน ควรศึกษาเพิ่มเติมก่อนตัดสินใจลงทุน
      </div>
    </div>
  );
}

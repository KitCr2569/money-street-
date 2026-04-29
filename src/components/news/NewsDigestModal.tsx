'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NewsArticle } from '@/types';
import type { NewsDigestRequest, TradingStrategy } from '@/app/api/ai/news-digest/route';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';

interface Props {
  open: boolean;
  onClose: () => void;
  article: NewsArticle;
}

const strategies: { value: TradingStrategy; icon: string; label: string; desc: string }[] = [
  { value: 'day',   icon: '⚡', label: 'เทรดรายวัน',     desc: 'ผลกระทบ 1-2 วัน จุดเข้า/ออกระยะสั้น' },
  { value: 'week',  icon: '📊', label: 'เทรดรายสัปดาห์', desc: 'แนวโน้ม 1-2 สัปดาห์ แนวรับ/ต้าน' },
  { value: 'month', icon: '📈', label: 'เทรดรายเดือน',   desc: 'ผลกระทบ 1-3 เดือน งบการเงิน' },
  { value: 'long',  icon: '🏦', label: 'ลงทุนระยะยาว',   desc: 'พื้นฐานบริษัท การเติบโต 1 ปี+' },
];

export default function NewsDigestModal({ open, onClose, article }: Props) {
  const [step, setStep] = useState<'pick' | 'result'>('pick');
  const [strategy, setStrategy] = useState<TradingStrategy | null>(null);
  const [digest, setDigest] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset when opening new article
  useEffect(() => {
    if (open) {
      setStep('pick');
      setStrategy(null);
      setDigest('');
      setError('');
    }
  }, [open, article.link]);

  const fetchDigest = useCallback(async (strat: TradingStrategy) => {
    setStep('result');
    setStrategy(strat);
    setLoading(true);
    setError('');
    setDigest('');

    try {
      const body: NewsDigestRequest = {
        title: article.title,
        description: article.description,
        source: article.source,
        pubDate: article.pubDate,
        link: article.link,
        relatedSymbols: article.relatedSymbols,
        strategy: strat,
      };

      const res = await fetch('/api/ai/news-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setDigest(data.digest);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }, [article]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const activeStrat = strategies.find((s) => s.value === strategy);

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
            <h2 className="text-[15px] font-semibold text-foreground line-clamp-1">
              {step === 'pick' ? 'เลือกกลยุทธ์การวิเคราะห์' : 'AI สรุปข่าว'}
            </h2>
            {activeStrat && step === 'result' && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-accent/10 text-accent font-medium">
                {activeStrat.icon} {activeStrat.label}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-dim hover:text-foreground hover:bg-surface-3 transition-colors text-[16px]"
          >
            ×
          </button>
        </div>

        {/* Original title */}
        <div className="px-5 py-2 border-b border-border/50 bg-surface-2/20">
          <p className="text-[12px] text-dim leading-snug line-clamp-2">{article.title}</p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted">
            <span>{article.source}</span>
            {article.relatedSymbols.length > 0 && (
              <>
                <span>·</span>
                <span>{article.relatedSymbols.join(', ')}</span>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Step 1: Pick strategy */}
          {step === 'pick' && (
            <div className="space-y-2">
              <p className="text-[13px] text-dim mb-3">ข่าวนี้จะถูกวิเคราะห์ตามมุมมองกลยุทธ์ที่คุณเลือก</p>
              {strategies.map((s) => (
                <button
                  key={s.value}
                  onClick={() => fetchDigest(s.value)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-accent/40 hover:bg-surface-2/50 transition-all text-left group/s"
                >
                  <span className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg bg-surface-2 group-hover/s:bg-accent/10 transition-colors">
                    {s.icon}
                  </span>
                  <div>
                    <div className="text-[14px] font-semibold text-foreground group-hover/s:text-accent transition-colors">
                      {s.label}
                    </div>
                    <div className="text-[12px] text-dim mt-0.5">{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Result */}
          {step === 'result' && loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <p className="text-[13px] text-dim">กำลังสรุปข่าว...</p>
              <p className="text-[11px] text-dim/50">อาจใช้เวลา 10-30 วินาที</p>
            </div>
          )}

          {step === 'result' && error && (
            <div className="bg-red-dim rounded-xl p-4 text-[13px]">
              <p className="text-red font-semibold mb-1">ไม่สามารถสรุปข่าวได้</p>
              <p className="text-dim text-[12px]">{error}</p>
              <button
                onClick={() => strategy && fetchDigest(strategy)}
                className="mt-3 px-3 py-1.5 bg-surface-2 rounded-lg text-[12px] text-accent hover:bg-surface-3 transition-colors"
              >
                ลองใหม่
              </button>
            </div>
          )}

          {step === 'result' && !loading && !error && digest && (
            <MarkdownRenderer content={digest} />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-border bg-surface-2/30 flex items-center justify-between">
          <p className="text-[9px] text-dim/40">
            สรุปโดย AI — ควรอ่านข่าวต้นฉบับประกอบ
          </p>
          <div className="flex items-center gap-3">
            {step === 'result' && !loading && digest && (
              <button
                onClick={() => setStep('pick')}
                className="text-[11px] text-dim hover:text-foreground transition-colors"
              >
                เปลี่ยนกลยุทธ์
              </button>
            )}
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-accent hover:text-accent/80 transition-colors"
            >
              อ่านข่าวต้นฉบับ →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

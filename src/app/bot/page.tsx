'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// =====================================================
// Types
// =====================================================

interface PortfolioData {
  cash: number;
  totalValue: number;
  peakValue: number;
  initialCapital: number;
  totalPnl: number;
  totalPnlPct: number;
  drawdown: number;
  openPositions: number;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  holdings: HoldingData[];
}

interface HoldingData {
  id: string;
  symbol: string;
  shares: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  strategy: string;
  signalScore: number;
  confidence: number;
  entryAt: string;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

interface SignalData {
  id: string;
  symbol: string;
  signalType: string;
  totalScore: number;
  normalizedScore: number;
  strategy: string;
  confidence: number;
  price: number;
  stopLoss: number;
  takeProfit1: number;
  factors: { name: string; score: number; reason: string }[];
  executed: boolean;
  createdAt: string;
}

interface TradeData {
  id: string;
  symbol: string;
  side: string;
  shares: number;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number | null;
  pnlPercent: number | null;
  exitReason: string | null;
  strategy: string;
  status: string;
  entryAt: string;
  exitAt: string | null;
}

// =====================================================
// Main Dashboard
// =====================================================

export default function BotDashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [portRes, sigRes, tradeRes] = await Promise.all([
        fetch('/api/bot/portfolio'),
        fetch('/api/bot/signals?limit=20'),
        fetch('/api/bot/trades?limit=20'),
      ]);
      const portData = await portRes.json();
      const sigData = await sigRes.json();
      const tradeData = await tradeRes.json();

      if (!portData.error) setPortfolio(portData);
      if (sigData.signals) setSignals(sigData.signals);
      if (tradeData.trades) setTrades(tradeData.trades);
    } catch (err) {
      console.error('Failed to fetch bot data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const runScan = async (autoTrade = false) => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/bot/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoTrade }),
      });
      const data = await res.json();
      setScanResult(
        `สแกนเสร็จ: ${data.scannedCount} ตัว | 🟢 ${data.buySignals} ซื้อ | 🔴 ${data.sellSignals} ขาย | ⏱ ${(data.scanDuration / 1000).toFixed(1)}s`
      );
      await fetchData();
    } catch (err) {
      setScanResult('❌ สแกนล้มเหลว');
    } finally {
      setScanning(false);
    }
  };

  const resetPortfolio = async () => {
    if (!confirm('⚠️ รีเซ็ตพอร์ตจำลอง? ข้อมูลเทรดทั้งหมดจะถูกลบ')) return;
    try {
      await fetch('/api/bot/portfolio', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialCapital: 100000 }),
      });
      await fetchData();
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="px-4 py-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 text-dim">
          <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" />
          กำลังโหลด Bot Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            🤖 Trading Bot <span className="text-xs font-normal text-dim bg-surface-2 px-2 py-0.5 rounded-full">Paper Trading</span>
          </h1>
          <p className="text-xs text-dim mt-0.5">ระบบเทรดอัตโนมัติ — หุ้น + คริปโต</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => runScan(false)}
            disabled={scanning}
            className="px-3 py-1.5 text-xs font-medium bg-accent/15 text-accent rounded-lg hover:bg-accent/25 transition-colors disabled:opacity-50"
          >
            {scanning ? '⏳ กำลังสแกน...' : '📡 สแกนหุ้น'}
          </button>
          <button
            onClick={() => runScan(true)}
            disabled={scanning}
            className="px-3 py-1.5 text-xs font-medium bg-green/15 text-green rounded-lg hover:bg-green/25 transition-colors disabled:opacity-50"
          >
            🚀 สแกน + เทรดอัตโนมัติ
          </button>
          <Link
            href="/bot/backtest"
            className="px-3 py-1.5 text-xs font-medium bg-surface-2 text-dim rounded-lg hover:text-foreground hover:bg-surface-3 transition-colors"
          >
            📊 Backtest
          </Link>
          <Link
            href="/bot/settings"
            className="px-3 py-1.5 text-xs font-medium bg-surface-2 text-dim rounded-lg hover:text-foreground hover:bg-surface-3 transition-colors"
          >
            ⚙️ ตั้งค่า
          </Link>
        </div>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <div className="px-3 py-2 bg-accent/10 text-accent text-xs rounded-lg border border-accent/20">
          {scanResult}
        </div>
      )}

      {/* Portfolio Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        <StatCard label="มูลค่าพอร์ต" value={`$${fmt(portfolio?.totalValue ?? 0)}`}
          sub={portfolio ? `เริ่มต้น $${fmt(portfolio.initialCapital)}` : ''} />
        <StatCard label="กำไร/ขาดทุน" value={`$${fmt(portfolio?.totalPnl ?? 0)}`}
          color={pnlColor(portfolio?.totalPnl ?? 0)}
          sub={`${(portfolio?.totalPnlPct ?? 0).toFixed(2)}%`} />
        <StatCard label="เงินสด" value={`$${fmt(portfolio?.cash ?? 0)}`} />
        <StatCard label="Win Rate" value={`${(portfolio?.winRate ?? 0).toFixed(1)}%`}
          color={(portfolio?.winRate ?? 0) >= 50 ? 'text-green' : 'text-red'}
          sub={`${portfolio?.winTrades ?? 0}W / ${portfolio?.lossTrades ?? 0}L`} />
        <StatCard label="Drawdown" value={`${(portfolio?.drawdown ?? 0).toFixed(2)}%`}
          color={(portfolio?.drawdown ?? 0) > 5 ? 'text-red' : 'text-dim'} />
        <StatCard label="ตำแหน่งเปิด" value={`${portfolio?.openPositions ?? 0}`}
          sub={`จาก ${portfolio?.totalTrades ?? 0} trades`} />
      </div>

      {/* Holdings */}
      {portfolio?.holdings && portfolio.holdings.length > 0 && (
        <div className="bg-surface-1 rounded-xl border border-border p-3">
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            📌 ตำแหน่งที่เปิดอยู่ <span className="text-xs text-dim font-normal">({portfolio.holdings.length})</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-dim border-b border-border">
                  <th className="text-left py-1.5 px-2">Symbol</th>
                  <th className="text-right py-1.5 px-2">จำนวน</th>
                  <th className="text-right py-1.5 px-2">ราคาเข้า</th>
                  <th className="text-right py-1.5 px-2">ราคาปัจจุบัน</th>
                  <th className="text-right py-1.5 px-2">P&L</th>
                  <th className="text-right py-1.5 px-2">%</th>
                  <th className="text-right py-1.5 px-2">SL</th>
                  <th className="text-right py-1.5 px-2">TP</th>
                  <th className="text-center py-1.5 px-2">กลยุทธ์</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map((h) => (
                  <tr key={h.id} className="border-b border-border/50 hover:bg-surface-2/50">
                    <td className="py-1.5 px-2 font-semibold">{h.symbol}</td>
                    <td className="text-right py-1.5 px-2">{h.shares}</td>
                    <td className="text-right py-1.5 px-2">${h.entryPrice.toFixed(2)}</td>
                    <td className="text-right py-1.5 px-2">${h.currentPrice.toFixed(2)}</td>
                    <td className={`text-right py-1.5 px-2 font-medium ${pnlColor(h.unrealizedPnl)}`}>
                      ${h.unrealizedPnl.toFixed(2)}
                    </td>
                    <td className={`text-right py-1.5 px-2 ${pnlColor(h.unrealizedPnlPct)}`}>
                      {h.unrealizedPnlPct > 0 ? '+' : ''}{h.unrealizedPnlPct.toFixed(2)}%
                    </td>
                    <td className="text-right py-1.5 px-2 text-red">${h.stopLoss.toFixed(2)}</td>
                    <td className="text-right py-1.5 px-2 text-green">${h.takeProfit1.toFixed(2)}</td>
                    <td className="text-center py-1.5 px-2">
                      <span className="text-[10px] bg-surface-3 px-1.5 py-0.5 rounded">{h.strategy}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Signals */}
        <div className="bg-surface-1 rounded-xl border border-border p-3">
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            📡 สัญญาณล่าสุด
          </h2>
          {signals.length === 0 ? (
            <p className="text-xs text-dim py-4 text-center">ยังไม่มีสัญญาณ — กด &quot;สแกนหุ้น&quot; เพื่อเริ่ม</p>
          ) : (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {signals.slice(0, 15).map((s) => (
                <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-2/50 hover:bg-surface-2">
                  <span className="text-lg">{signalEmoji(s.signalType)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/stock/${s.symbol}`} className="font-semibold text-xs hover:text-accent">
                        {s.symbol}
                      </Link>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${signalBg(s.signalType)}`}>
                        {signalLabel(s.signalType)}
                      </span>
                      <span className="text-[10px] text-dim">{s.strategy}</span>
                    </div>
                    <div className="text-[10px] text-dim mt-0.5">
                      Score: {s.totalScore.toFixed(1)} | ${s.price.toFixed(2)} | Conf: {s.confidence}%
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-dim">{timeAgo(s.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Trades */}
        <div className="bg-surface-1 rounded-xl border border-border p-3">
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            📝 เทรดล่าสุด
          </h2>
          {trades.length === 0 ? (
            <p className="text-xs text-dim py-4 text-center">ยังไม่มี trades</p>
          ) : (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {trades.slice(0, 15).map((t) => (
                <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-2/50 hover:bg-surface-2">
                  <span className="text-lg">{t.status === 'open' ? '🟢' : t.pnl && t.pnl > 0 ? '✅' : '🔴'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/stock/${t.symbol}`} className="font-semibold text-xs hover:text-accent">
                        {t.symbol}
                      </Link>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        t.status === 'open' ? 'bg-accent/15 text-accent' :
                        t.status === 'stopped' ? 'bg-red/15 text-red' : 'bg-surface-3 text-dim'
                      }`}>
                        {t.status === 'open' ? 'OPEN' : t.exitReason ?? t.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-dim mt-0.5">
                      {t.shares} shares @ ${t.entryPrice.toFixed(2)}
                      {t.exitPrice ? ` → $${t.exitPrice.toFixed(2)}` : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {t.pnl !== null ? (
                      <div className={`text-xs font-medium ${pnlColor(t.pnl)}`}>
                        {t.pnl > 0 ? '+' : ''}${t.pnl.toFixed(2)}
                        <div className={`text-[10px] ${pnlColor(t.pnlPercent ?? 0)}`}>
                          {(t.pnlPercent ?? 0) > 0 ? '+' : ''}{(t.pnlPercent ?? 0).toFixed(2)}%
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-dim">{timeAgo(t.entryAt)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button onClick={resetPortfolio} className="text-[10px] text-dim hover:text-red transition-colors">
          🗑 รีเซ็ตพอร์ตจำลอง
        </button>
      </div>
    </div>
  );
}

// =====================================================
// Sub-components & Helpers
// =====================================================

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-surface-1 rounded-xl border border-border p-3">
      <div className="text-[10px] text-dim uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${color ?? 'text-foreground'}`}>{value}</div>
      {sub && <div className="text-[10px] text-dim mt-0.5">{sub}</div>}
    </div>
  );
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pnlColor(pnl: number): string {
  return pnl > 0 ? 'text-green' : pnl < 0 ? 'text-red' : 'text-dim';
}

function signalEmoji(type: string): string {
  switch (type) {
    case 'strong_buy': return '🔥';
    case 'buy': return '🟢';
    case 'hold': return '⚪';
    case 'sell': return '🟡';
    case 'strong_sell': return '🔴';
    default: return '⚪';
  }
}

function signalLabel(type: string): string {
  switch (type) {
    case 'strong_buy': return 'ซื้อเลย';
    case 'buy': return 'น่าซื้อ';
    case 'hold': return 'ถือ/รอ';
    case 'sell': return 'ขาย';
    case 'strong_sell': return 'ขายเลย';
    default: return type;
  }
}

function signalBg(type: string): string {
  switch (type) {
    case 'strong_buy': return 'bg-green/20 text-green';
    case 'buy': return 'bg-green/15 text-green';
    case 'hold': return 'bg-surface-3 text-dim';
    case 'sell': return 'bg-yellow/15 text-yellow';
    case 'strong_sell': return 'bg-red/20 text-red';
    default: return 'bg-surface-3 text-dim';
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'เมื่อกี้';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

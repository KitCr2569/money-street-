'use client';

import { useState } from 'react';
import Link from 'next/link';

interface BacktestResult {
  symbol: string;
  period: string;
  totalReturn: number;
  totalReturnPct: number;
  buyHoldReturn: number;
  buyHoldReturnPct: number;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  avgWinPct: number;
  avgLossPct: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  avgHoldDays: number;
  trades: {
    symbol: string;
    entryDate: string;
    entryPrice: number;
    exitDate: string;
    exitPrice: number;
    pnl: number;
    pnlPercent: number;
    exitReason: string;
    strategy: string;
    holdDays: number;
  }[];
  equityCurve: { date: string; value: number }[];
  benchmarkCurve: { date: string; value: number }[];
}

const PRESETS = [
  { label: 'Magnificent 7', symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'] },
  { label: 'AI Chips', symbols: ['NVDA', 'AMD', 'AVGO', 'TSM', 'ARM'] },
  { label: 'Crypto', symbols: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD'] },
  { label: 'ETFs', symbols: ['SPY', 'QQQ', 'SOXX'] },
];

export default function BacktestPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [range, setRange] = useState('2y');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<BacktestResult[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const runBacktest = async (sym?: string) => {
    const targetSymbol = sym ?? symbol;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/bot/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: targetSymbol, range }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backtest failed');
    } finally {
      setLoading(false);
    }
  };

  const runBatch = async (symbols: string[]) => {
    setBatchLoading(true);
    setBatchResults([]);
    const results: BacktestResult[] = [];
    for (const sym of symbols) {
      try {
        const res = await fetch('/api/bot/backtest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: sym, range }),
        });
        const data = await res.json();
        if (!data.error) results.push(data);
      } catch { /* skip */ }
    }
    setBatchResults(results);
    setBatchLoading(false);
  };

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/bot" className="text-dim hover:text-foreground text-xs">← Bot Dashboard</Link>
      </div>

      <h1 className="text-xl font-bold flex items-center gap-2">
        📊 Backtesting <span className="text-xs font-normal text-dim">ทดสอบกลยุทธ์กับข้อมูลย้อนหลัง</span>
      </h1>

      {/* Controls */}
      <div className="bg-surface-1 rounded-xl border border-border p-3 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[10px] text-dim uppercase block mb-1">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm w-32 focus:outline-none focus:border-accent"
              placeholder="AAPL"
            />
          </div>
          <div>
            <label className="text-[10px] text-dim uppercase block mb-1">ช่วงเวลา</label>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
            >
              <option value="1y">1 ปี</option>
              <option value="2y">2 ปี</option>
              <option value="5y">5 ปี</option>
            </select>
          </div>
          <button
            onClick={() => runBacktest()}
            disabled={loading}
            className="px-4 py-1.5 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50"
          >
            {loading ? '⏳ กำลัง Backtest...' : '🚀 Run Backtest'}
          </button>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] text-dim self-center">Quick:</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => runBatch(p.symbols)}
              disabled={batchLoading}
              className="px-2 py-1 text-[10px] bg-surface-2 text-dim rounded-md hover:text-foreground hover:bg-surface-3 transition-colors disabled:opacity-50"
            >
              {p.label} ({p.symbols.length})
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-red/10 text-red text-xs rounded-lg border border-red/20">
          ❌ {error}
        </div>
      )}

      {/* Batch Results */}
      {batchResults.length > 0 && (
        <div className="bg-surface-1 rounded-xl border border-border p-3">
          <h2 className="text-sm font-semibold mb-2">📊 เปรียบเทียบผลลัพธ์</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-dim border-b border-border">
                  <th className="text-left py-1.5 px-2">Symbol</th>
                  <th className="text-right py-1.5 px-2">Bot Return</th>
                  <th className="text-right py-1.5 px-2">Buy&Hold</th>
                  <th className="text-right py-1.5 px-2">Trades</th>
                  <th className="text-right py-1.5 px-2">Win Rate</th>
                  <th className="text-right py-1.5 px-2">Sharpe</th>
                  <th className="text-right py-1.5 px-2">Max DD</th>
                  <th className="text-right py-1.5 px-2">Profit Factor</th>
                </tr>
              </thead>
              <tbody>
                {batchResults.sort((a, b) => b.totalReturnPct - a.totalReturnPct).map((r) => (
                  <tr key={r.symbol} className="border-b border-border/50 hover:bg-surface-2/50 cursor-pointer"
                    onClick={() => { setSymbol(r.symbol); setResult(r); }}>
                    <td className="py-1.5 px-2 font-semibold">{r.symbol}</td>
                    <td className={`text-right py-1.5 px-2 font-medium ${r.totalReturnPct > 0 ? 'text-green' : 'text-red'}`}>
                      {r.totalReturnPct > 0 ? '+' : ''}{r.totalReturnPct.toFixed(2)}%
                    </td>
                    <td className={`text-right py-1.5 px-2 ${r.buyHoldReturnPct > 0 ? 'text-green' : 'text-red'}`}>
                      {r.buyHoldReturnPct > 0 ? '+' : ''}{r.buyHoldReturnPct.toFixed(2)}%
                    </td>
                    <td className="text-right py-1.5 px-2">{r.totalTrades}</td>
                    <td className={`text-right py-1.5 px-2 ${r.winRate >= 50 ? 'text-green' : 'text-red'}`}>
                      {r.winRate.toFixed(1)}%
                    </td>
                    <td className={`text-right py-1.5 px-2 ${r.sharpeRatio > 1 ? 'text-green' : 'text-dim'}`}>
                      {r.sharpeRatio.toFixed(2)}
                    </td>
                    <td className={`text-right py-1.5 px-2 ${r.maxDrawdown > 10 ? 'text-red' : 'text-dim'}`}>
                      {r.maxDrawdown.toFixed(2)}%
                    </td>
                    <td className={`text-right py-1.5 px-2 ${r.profitFactor > 1 ? 'text-green' : 'text-red'}`}>
                      {r.profitFactor.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Single Result */}
      {result && (
        <>
          {/* Summary */}
          <div className="bg-surface-1 rounded-xl border border-border p-4">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-lg font-bold">{result.symbol}</h2>
              <span className="text-xs text-dim">{result.period}</span>
              <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                result.totalReturnPct > result.buyHoldReturnPct
                  ? 'bg-green/15 text-green' : 'bg-red/15 text-red'
              }`}>
                {result.totalReturnPct > result.buyHoldReturnPct ? '🏆 Bot ชนะ' : '📉 Buy&Hold ชนะ'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <div className="text-[10px] text-dim">Bot Return</div>
                <div className={`text-xl font-bold ${result.totalReturnPct > 0 ? 'text-green' : 'text-red'}`}>
                  {result.totalReturnPct > 0 ? '+' : ''}{result.totalReturnPct.toFixed(2)}%
                </div>
                <div className="text-[10px] text-dim">${result.totalReturn.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] text-dim">Buy & Hold</div>
                <div className={`text-xl font-bold ${result.buyHoldReturnPct > 0 ? 'text-green' : 'text-red'}`}>
                  {result.buyHoldReturnPct > 0 ? '+' : ''}{result.buyHoldReturnPct.toFixed(2)}%
                </div>
                <div className="text-[10px] text-dim">${result.buyHoldReturn.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] text-dim">Win Rate</div>
                <div className={`text-xl font-bold ${result.winRate >= 50 ? 'text-green' : 'text-red'}`}>
                  {result.winRate.toFixed(1)}%
                </div>
                <div className="text-[10px] text-dim">{result.winTrades}W / {result.lossTrades}L ({result.totalTrades} trades)</div>
              </div>
              <div>
                <div className="text-[10px] text-dim">Sharpe Ratio</div>
                <div className={`text-xl font-bold ${result.sharpeRatio > 1 ? 'text-green' : 'text-dim'}`}>
                  {result.sharpeRatio.toFixed(2)}
                </div>
                <div className="text-[10px] text-dim">Max DD: {result.maxDrawdown.toFixed(2)}%</div>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3 pt-3 border-t border-border">
              <MiniStat label="Avg Win" value={`+${result.avgWinPct.toFixed(2)}%`} color="text-green" />
              <MiniStat label="Avg Loss" value={`${result.avgLossPct.toFixed(2)}%`} color="text-red" />
              <MiniStat label="Profit Factor" value={result.profitFactor.toFixed(2)}
                color={result.profitFactor > 1 ? 'text-green' : 'text-red'} />
              <MiniStat label="Avg Hold" value={`${result.avgHoldDays.toFixed(1)}d`} />
              <MiniStat label="Max Drawdown" value={`${result.maxDrawdown.toFixed(2)}%`}
                color={result.maxDrawdown > 10 ? 'text-red' : 'text-dim'} />
              <MiniStat label="Total Trades" value={`${result.totalTrades}`} />
            </div>
          </div>

          {/* Equity Curve (simple text representation) */}
          {result.equityCurve.length > 0 && (
            <div className="bg-surface-1 rounded-xl border border-border p-3">
              <h3 className="text-sm font-semibold mb-2">📈 Equity Curve</h3>
              <div className="flex items-end gap-px h-32">
                {sampleCurve(result.equityCurve, 80).map((point, i) => {
                  const min = Math.min(...sampleCurve(result.equityCurve, 80).map(p => p.value));
                  const max = Math.max(...sampleCurve(result.equityCurve, 80).map(p => p.value));
                  const range = max - min || 1;
                  const height = ((point.value - min) / range) * 100;
                  const isProfit = point.value >= 100000;
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-t-sm ${isProfit ? 'bg-green/60' : 'bg-red/60'}`}
                      style={{ height: `${Math.max(2, height)}%` }}
                      title={`${point.date}: $${point.value.toLocaleString()}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] text-dim mt-1">
                <span>{result.equityCurve[0]?.date}</span>
                <span>{result.equityCurve[result.equityCurve.length - 1]?.date}</span>
              </div>
            </div>
          )}

          {/* Trade List */}
          {result.trades.length > 0 && (
            <div className="bg-surface-1 rounded-xl border border-border p-3">
              <h3 className="text-sm font-semibold mb-2">📝 รายการเทรด ({result.trades.length})</h3>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-surface-1">
                    <tr className="text-dim border-b border-border">
                      <th className="text-left py-1.5 px-2">เข้า</th>
                      <th className="text-left py-1.5 px-2">ออก</th>
                      <th className="text-right py-1.5 px-2">ราคาเข้า</th>
                      <th className="text-right py-1.5 px-2">ราคาออก</th>
                      <th className="text-right py-1.5 px-2">P&L</th>
                      <th className="text-right py-1.5 px-2">%</th>
                      <th className="text-center py-1.5 px-2">เหตุผล</th>
                      <th className="text-right py-1.5 px-2">วัน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1 px-2">{t.entryDate}</td>
                        <td className="py-1 px-2">{t.exitDate}</td>
                        <td className="text-right py-1 px-2">${t.entryPrice.toFixed(2)}</td>
                        <td className="text-right py-1 px-2">${t.exitPrice.toFixed(2)}</td>
                        <td className={`text-right py-1 px-2 font-medium ${t.pnl > 0 ? 'text-green' : 'text-red'}`}>
                          {t.pnl > 0 ? '+' : ''}${t.pnl.toFixed(2)}
                        </td>
                        <td className={`text-right py-1 px-2 ${t.pnlPercent > 0 ? 'text-green' : 'text-red'}`}>
                          {t.pnlPercent > 0 ? '+' : ''}{t.pnlPercent.toFixed(2)}%
                        </td>
                        <td className="text-center py-1 px-2">
                          <span className="text-[10px] bg-surface-3 px-1.5 py-0.5 rounded">{t.exitReason}</span>
                        </td>
                        <td className="text-right py-1 px-2">{t.holdDays}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[9px] text-dim uppercase">{label}</div>
      <div className={`text-sm font-semibold ${color ?? 'text-foreground'}`}>{value}</div>
    </div>
  );
}

function sampleCurve(curve: { date: string; value: number }[], maxPoints: number) {
  if (curve.length <= maxPoints) return curve;
  const step = Math.ceil(curve.length / maxPoints);
  return curve.filter((_, i) => i % step === 0);
}

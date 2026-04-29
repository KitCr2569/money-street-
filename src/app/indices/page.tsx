'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import sp500Data from '../../../data/sp500.json';
import nasdaq100Data from '../../../data/nasdaq100.json';
import dow30Data from '../../../data/dow30.json';
import marketCapData from '../../../data/marketcap.json';

const AIAnalysisModal = dynamic(() => import('@/components/watchlist/AIAnalysisModal'), { ssr: false });

type IndexType = 'sp500' | 'nasdaq100' | 'dow30';

interface StockEntry {
  symbol: string;
  name: string;
  sector: string;
}

const SECTOR_TH: Record<string, string> = {
  'Technology': 'เทคโนโลยี',
  'Information Technology': 'เทคโนโลยี',
  'Health Care': 'สุขภาพ',
  'Consumer Cyclical': 'สินค้าฟุ่มเฟือย',
  'Consumer Discretionary': 'สินค้าฟุ่มเฟือย',
  'Consumer Staples': 'สินค้าจำเป็น',
  'Financials': 'การเงิน',
  'Financial Services': 'การเงิน',
  'Industrials': 'อุตสาหกรรม',
  'Communication Services': 'สื่อสาร',
  'Energy': 'พลังงาน',
  'Utilities': 'สาธารณูปโภค',
  'Real Estate': 'อสังหาริมทรัพย์',
  'Materials': 'วัสดุ',
};

const SECTOR_COLORS: Record<string, string> = {
  'เทคโนโลยี': 'bg-blue/10 text-blue',
  'สุขภาพ': 'bg-green/10 text-green',
  'สินค้าฟุ่มเฟือย': 'bg-purple/10 text-purple',
  'สินค้าจำเป็น': 'bg-yellow/10 text-yellow',
  'การเงิน': 'bg-accent/10 text-accent',
  'อุตสาหกรรม': 'bg-dim/20 text-dim',
  'สื่อสาร': 'bg-red/10 text-red',
  'พลังงาน': 'bg-yellow/10 text-yellow',
  'สาธารณูปโภค': 'bg-green/10 text-green',
  'อสังหาริมทรัพย์': 'bg-purple/10 text-purple',
  'วัสดุ': 'bg-dim/20 text-dim',
};

function toThai(sector: string): string {
  return SECTOR_TH[sector] ?? sector;
}

function getSectorColor(sector: string): string {
  return SECTOR_COLORS[toThai(sector)] ?? 'bg-surface-2 text-dim';
}

const mcapMap: Record<string, number> = (marketCapData as { data: Record<string, number> }).data;

function formatMarketCap(sym: string): string {
  const val = mcapMap[sym];
  if (!val) return '-';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val.toLocaleString()}`;
}

type SortKey = 'marketcap' | 'symbol' | 'name';

export default function IndexPage() {
  const [activeIndex, setActiveIndex] = useState<IndexType>('sp500');
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('marketcap');
  const [sortAsc, setSortAsc] = useState(false);
  const [aiModal, setAiModal] = useState<{ open: boolean; symbol: string }>({ open: false, symbol: '' });

  const data: StockEntry[] = activeIndex === 'sp500' ? sp500Data : activeIndex === 'nasdaq100' ? nasdaq100Data : dow30Data;

  // Get unique sectors (Thai)
  const sectors = useMemo(() => {
    const set = new Set<string>();
    for (const s of data) set.add(toThai(s.sector));
    return [...set].sort();
  }, [data]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'symbol' || key === 'name'); // A-Z default for text, desc for mcap
    }
  }

  // Filter + Sort
  const filtered = useMemo(() => {
    let list = [...data];
    if (search) {
      const q = search.toUpperCase();
      list = list.filter((s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q));
    }
    if (sectorFilter) {
      list = list.filter((s) => toThai(s.sector) === sectorFilter);
    }
    // Sort
    list.sort((a, b) => {
      if (sortKey === 'marketcap') {
        const ma = mcapMap[a.symbol] ?? 0;
        const mb = mcapMap[b.symbol] ?? 0;
        return sortAsc ? ma - mb : mb - ma;
      }
      if (sortKey === 'symbol') {
        return sortAsc ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
      }
      // name
      return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    });
    return list;
  }, [data, search, sectorFilter, sortKey, sortAsc]);


  // Top 20 by market cap (for highlight)
  const top20 = useMemo(() => {
    const sorted = [...data].sort((a, b) => (mcapMap[b.symbol] ?? 0) - (mcapMap[a.symbol] ?? 0));
    return new Set(sorted.slice(0, 20).map((s) => s.symbol));
  }, [data]);

  // Count by sector (Thai)
  const sectorCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of data) {
      const th = toThai(s.sector);
      map[th] = (map[th] || 0) + 1;
    }
    return map;
  }, [data]);

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-semibold">ดัชนีหุ้น</h1>
        <p className="text-[13px] text-dim mt-0.5">รายชื่อหุ้นทั้งหมดในดัชนี S&P 500, Nasdaq-100 และ Dow Jones 30</p>
      </div>

      {/* Index tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setActiveIndex('sp500'); setSectorFilter(''); setSearch(''); }}
          className={`px-4 py-2 rounded-xl text-[14px] font-semibold transition-all ${
            activeIndex === 'sp500'
              ? 'bg-accent text-background'
              : 'bg-surface border border-border text-dim hover:text-foreground'
          }`}
        >
          S&P 500
          <span className={`ml-1.5 text-[11px] ${activeIndex === 'sp500' ? 'text-background/60' : 'text-dim/50'}`}>
            {sp500Data.length}
          </span>
        </button>
        <button
          onClick={() => { setActiveIndex('nasdaq100'); setSectorFilter(''); setSearch(''); }}
          className={`px-4 py-2 rounded-xl text-[14px] font-semibold transition-all ${
            activeIndex === 'nasdaq100'
              ? 'bg-accent text-background'
              : 'bg-surface border border-border text-dim hover:text-foreground'
          }`}
        >
          Nasdaq-100
          <span className={`ml-1.5 text-[11px] ${activeIndex === 'nasdaq100' ? 'text-background/60' : 'text-dim/50'}`}>
            {nasdaq100Data.length}
          </span>
        </button>
        <button
          onClick={() => { setActiveIndex('dow30'); setSectorFilter(''); setSearch(''); }}
          className={`px-4 py-2 rounded-xl text-[14px] font-semibold transition-all ${
            activeIndex === 'dow30'
              ? 'bg-accent text-background'
              : 'bg-surface border border-border text-dim hover:text-foreground'
          }`}
        >
          Dow Jones 30
          <span className={`ml-1.5 text-[11px] ${activeIndex === 'dow30' ? 'text-background/60' : 'text-dim/50'}`}>
            {dow30Data.length}
          </span>
        </button>
      </div>

      {/* Search + sector filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา symbol หรือชื่อบริษัท..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-2 border border-border text-[13px] text-foreground placeholder:text-dim/50 focus:border-green/40 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSectorFilter('')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              !sectorFilter
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'bg-surface border border-border text-dim hover:text-foreground'
            }`}
          >
            ทั้งหมด {data.length}
          </button>
          {sectors.map((s) => (
            <button
              key={s}
              onClick={() => setSectorFilter(sectorFilter === s ? '' : s)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                sectorFilter === s
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : 'bg-surface border border-border text-dim hover:text-foreground'
              }`}
            >
              {s} {sectorCounts[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="text-[12px] text-dim">
        แสดง {filtered.length} จาก {data.length} หุ้น
        {sectorFilter && <span className="ml-1">· หมวด {sectorFilter}</span>}
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11px] text-dim uppercase tracking-wider">
                <th className="text-left px-4 py-2.5 w-8">#</th>
                <th className="text-left px-4 py-2.5">
                  <button onClick={() => handleSort('symbol')} className={`hover:text-foreground transition-colors ${sortKey === 'symbol' ? 'text-accent' : ''}`}>
                    Symbol {sortKey === 'symbol' ? (sortAsc ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="text-left px-4 py-2.5">
                  <button onClick={() => handleSort('name')} className={`hover:text-foreground transition-colors ${sortKey === 'name' ? 'text-accent' : ''}`}>
                    ชื่อบริษัท {sortKey === 'name' ? (sortAsc ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="text-right px-4 py-2.5">
                  <button onClick={() => handleSort('marketcap')} className={`hover:text-foreground transition-colors ${sortKey === 'marketcap' ? 'text-accent' : ''}`}>
                    Market Cap {sortKey === 'marketcap' ? (sortAsc ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="text-left px-4 py-2.5">หมวด</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((stock, i) => {
                const isTop20 = top20.has(stock.symbol);
                return (
                <tr key={stock.symbol} className={`border-b transition-colors ${isTop20 ? 'border-green/10 bg-green/[0.03] hover:bg-green/[0.07]' : 'border-border/30 hover:bg-surface-2/50'}`}>
                  <td className={`px-4 py-2 text-[11px] whitespace-nowrap ${isTop20 ? 'text-green font-bold' : 'text-dim'}`}>
                    {isTop20 && '🏆 '}{i + 1}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={`/logos/${stock.symbol}.png`}
                        alt={stock.symbol}
                        className="shrink-0 w-7 h-7 rounded-md object-contain bg-white/5"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden shrink-0 w-7 h-7 rounded-md bg-surface-2 flex items-center justify-center text-[10px] font-bold text-dim">
                        {stock.symbol.slice(0, 2)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Link href={`/stock/${stock.symbol}/profile`} className="font-bold text-accent hover:underline">
                          {stock.symbol}
                        </Link>
                        <Link href={`/stock/${stock.symbol}`} className="text-dim hover:text-accent transition-colors" title="ดูกราฟ">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => setAiModal({ open: true, symbol: stock.symbol })}
                          className="text-dim hover:text-green transition-colors"
                          title="วิเคราะห์"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 py-2 ${isTop20 ? 'text-foreground font-medium' : 'text-foreground/85'}`}>{stock.name}</td>
                  <td className={`px-4 py-2 text-right font-mono text-[12px] ${isTop20 ? 'text-green font-bold' : 'text-foreground/85'}`}>
                    {formatMarketCap(stock.symbol)}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getSectorColor(stock.sector)}`}>
                      {toThai(stock.sector)}
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Analysis Modal */}
      {aiModal.open && (
        <AIAnalysisModal
          open={aiModal.open}
          onClose={() => setAiModal({ open: false, symbol: '' })}
          mode="single"
          stocks={[{ symbol: aiModal.symbol, price: 0, changePct: 0, rsi: null, ema20: null, ema50: null, ema100: null, support: null, resistance: null, trend: null, fiftyTwoWeekHigh: null, fiftyTwoWeekLow: null, compositeScore: 0, scoreBreakdown: { rsi: 0, ema: 0, sr: 0, trend: 0, ath: 0 } }]}
          range="6mo"
        />
      )}
    </div>
  );
}

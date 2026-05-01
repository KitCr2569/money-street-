'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface TrendTopic {
  keyword: string;
  category: string;
  relevance: number;
  relatedSymbols: string[];
  aiReasoning: string;
}

interface Category {
  name: string;
  keywords: string[];
}

export default function TrendsPage() {
  const [keyword, setKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TrendTopic[]>([]);
  const { data: trendData, error: trendError } = useSWR('/api/bot/trends', fetcher);

  const handleDiscover = async (k: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/bot/trends?keyword=${encodeURIComponent(k)}`);
      const data = await res.json();
      setSearchResults(prev => [data, ...prev].slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const addToScan = async (symbol: string) => {
    try {
      // First get current settings
      const settingsRes = await fetch('/api/bot/settings');
      const settings = await settingsRes.json();
      
      const currentSymbols = Array.isArray(settings.scanSymbols) ? settings.scanSymbols : [];
      if (!currentSymbols.includes(symbol)) {
        const newSymbols = [...currentSymbols, symbol];
        await fetch('/api/bot/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scanSymbols: newSymbols }),
        });
        alert(`Added ${symbol} to scan list!`);
      } else {
        alert(`${symbol} is already in scan list.`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add symbol.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Market Trends Discovery</h1>
        <p className="text-dim">Discover trending topics and map them to tradeable symbols using AI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Search & Categories */}
        <div className="flex flex-col gap-6">
          <div className="bg-surface-1 border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Search Keywords</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. AI Agents, Crude Oil..."
                className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDiscover(keyword)}
              />
              <button
                onClick={() => handleDiscover(keyword)}
                disabled={isSearching || !keyword}
                className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {isSearching ? '...' : 'Discover'}
              </button>
            </div>
          </div>

          <div className="bg-surface-1 border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Trending Categories</h2>
            <div className="flex flex-col gap-4">
              {trendData?.categories?.map((cat: Category) => (
                <div key={cat.name} className="flex flex-col gap-2">
                  <h3 className="text-[11px] font-bold text-dim uppercase tracking-wider">{cat.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {cat.keywords.map(k => (
                      <button
                        key={k}
                        onClick={() => handleDiscover(k)}
                        className="text-xs bg-surface-2 hover:bg-surface-3 border border-border rounded-lg px-2.5 py-1.5 transition-colors"
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {isSearching && (
            <div className="bg-surface-1/50 border border-accent/20 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 animate-pulse">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-accent">Claude AI is analyzing market trends...</p>
            </div>
          )}

          {searchResults.length === 0 && !isSearching && (
            <div className="bg-surface-1 border border-border border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="text-4xl">🔎</div>
              <div>
                <h3 className="text-lg font-medium text-foreground">No trends discovered yet</h3>
                <p className="text-sm text-dim">Enter a keyword or pick a category to start discovering symbols.</p>
              </div>
            </div>
          )}

          {searchResults.map((result, idx) => (
            <div
              key={`${result.keyword}-${idx}`}
              className="bg-surface-1 border border-border rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                      {result.category}
                    </span>
                    <span className="text-xs font-medium text-dim">
                      Relevance: {result.relevance}%
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{result.keyword}</h3>
                </div>
              </div>

              <p className="text-sm text-dim mb-6 leading-relaxed">
                <span className="text-foreground font-medium">AI Insights:</span> {result.aiReasoning}
              </p>

              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-dim uppercase tracking-wider">Related Symbols</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.relatedSymbols.map(sym => (
                    <div
                      key={sym}
                      className="flex items-center justify-between bg-surface-2 border border-border rounded-xl px-4 py-3 group hover:border-accent/50 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{sym}</span>
                        <span className="text-[10px] text-dim">US Market</span>
                      </div>
                      <button
                        onClick={() => addToScan(sym)}
                        className="text-[11px] bg-background border border-border hover:bg-accent hover:text-white hover:border-accent px-3 py-1.5 rounded-lg font-medium transition-all"
                      >
                        Add to Scan
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

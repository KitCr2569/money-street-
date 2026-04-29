'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  ColorType,
  LineStyle,
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  LineSeries,
} from 'lightweight-charts';
import type { Candle, SRLevel, Indicators } from '@/types';

/** Deduplicate by time (keep last) and sort ascending */
function dedup<T extends { time: string }>(data: T[]): T[] {
  const map = new Map<string, T>();
  for (const d of data) map.set(d.time, d);
  return [...map.values()].sort((a, b) => a.time.localeCompare(b.time));
}

export type ChartType = 'candlestick' | 'line';

interface ChartInnerProps {
  candles: Candle[];
  levels: SRLevel[];
  indicators?: Indicators;
  chartType?: ChartType;
}

// ── Indicator toggle state ──
interface IndicatorVisibility {
  ema20: boolean;
  ema50: boolean;
  ema100: boolean;
  ema200: boolean;
  sr: boolean;
  trendLong: boolean;
  trendShort: boolean;
  volume: boolean;
}

const LS_CHART_KEY = 'ms_chart_indicators';

const defaultVisibility: IndicatorVisibility = {
  ema20: true,
  ema50: true,
  ema100: false,
  ema200: false,
  sr: true,
  trendLong: false,
  trendShort: false,
  volume: true,
};

function loadVisibility(): IndicatorVisibility {
  try {
    const raw = localStorage.getItem(LS_CHART_KEY);
    if (raw) return { ...defaultVisibility, ...JSON.parse(raw) };
  } catch {}
  return { ...defaultVisibility };
}

function saveVisibility(v: IndicatorVisibility) {
  try { localStorage.setItem(LS_CHART_KEY, JSON.stringify(v)); } catch {}
}

// Chart colors matching dark green theme
const CHART_BG = '#060a08';
const CHART_TEXT = '#8b9a8f';
const CHART_GRID = 'rgba(52,211,153,0.03)';
const CHART_BORDER = 'rgba(52,211,153,0.08)';

export default function ChartInner({ candles, levels, indicators, chartType = 'candlestick' }: ChartInnerProps) {
  const priceRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState<IndicatorVisibility>(defaultVisibility);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setVis(loadVisibility());
    setMounted(true);
  }, []);

  const toggleIndicator = useCallback((key: keyof IndicatorVisibility) => {
    setVis((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveVisibility(next);
      return next;
    });
  }, []);

  // Price + EMA + Volume chart
  useEffect(() => {
    if (!mounted) return;
    const container = priceRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 480,
      layout: {
        background: { type: ColorType.Solid, color: CHART_BG },
        textColor: CHART_TEXT,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: CHART_GRID },
        horzLines: { color: CHART_GRID },
      },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: CHART_BORDER },
      timeScale: { borderColor: CHART_BORDER, timeVisible: false },
    });

    // Price series
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let priceSeries: any;
    if (chartType === 'line') {
      priceSeries = chart.addSeries(AreaSeries, {
        lineColor: '#34d399',
        topColor: 'rgba(52,211,153,0.15)',
        bottomColor: 'rgba(52,211,153,0.01)',
        lineWidth: 2,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      priceSeries.setData(dedup(candles.map((c) => ({ time: c.time, value: c.close }))) as any);
    } else {
      priceSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#34d399',
        downColor: '#f87171',
        borderDownColor: '#f87171',
        borderUpColor: '#34d399',
        wickDownColor: '#f87171',
        wickUpColor: '#34d399',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      priceSeries.setData(dedup(candles.map((c) => ({
        time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
      }))) as any);
    }

    // S/R zones
    if (vis.sr) {
      const zonePct = 0.0075;
      levels.forEach((level) => {
        const isSupport = level.type === 'support';
        const color = isSupport ? 'rgba(52,211,153,0.35)' : 'rgba(248,113,113,0.35)';
        const faintColor = isSupport ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)';
        const upper = level.price * (1 + zonePct);
        const lower = level.price * (1 - zonePct);

        priceSeries.createPriceLine({ price: upper, color: faintColor, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' });
        priceSeries.createPriceLine({ price: level.price, color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: `${isSupport ? 'S' : 'R'} ${level.price.toFixed(2)}` });
        priceSeries.createPriceLine({ price: lower, color: faintColor, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' });
      });
    }

    // EMA overlays — only render if toggled on
    const emaConfigs = [
      { key: 'ema20' as const, data: indicators?.ema20, color: '#f59e0b', width: 2 as const },
      { key: 'ema50' as const, data: indicators?.ema50, color: '#60a5fa', width: 2 as const },
      { key: 'ema100' as const, data: indicators?.ema100, color: '#f472b6', width: 1 as const },
      { key: 'ema200' as const, data: indicators?.ema200, color: '#c084fc', width: 1 as const },
    ];
    emaConfigs.forEach(({ key, data, color, width }) => {
      if (!vis[key] || !data || data.length === 0) return;
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: width,
        title: '',
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      series.setData(dedup(data.map((d) => ({ time: d.time, value: d.value }))) as any);
    });

    // Trendlines
    const tl = indicators?.trendlines;
    if (vis.trendLong) {
      [tl?.long?.upper, tl?.long?.lower].forEach((data) => {
        if (!data || data.length < 2) return;
        const series = chart.addSeries(LineSeries, {
          color: 'rgba(255,255,255,0.6)',
          lineWidth: 2,
          lineStyle: 0,
          title: '',
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        series.setData(dedup(data.map((d) => ({ time: d.time, value: d.value }))) as any);
      });
    }
    if (vis.trendShort) {
      [tl?.short?.upper, tl?.short?.lower].forEach((data) => {
        if (!data || data.length < 2) return;
        const series = chart.addSeries(LineSeries, {
          color: 'rgba(250,204,21,0.5)',
          lineWidth: 1,
          lineStyle: 2,
          title: '',
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        series.setData(dedup(data.map((d) => ({ time: d.time, value: d.value }))) as any);
      });
    }

    // Volume
    if (vis.volume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      volumeSeries.setData(dedup(candles.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
      }))) as any);
    }

    chart.timeScale().fitContent();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) chart.applyOptions({ width: entry.contentRect.width });
    });
    observer.observe(container);

    return () => { observer.disconnect(); chart.remove(); };
  }, [candles, levels, indicators, chartType, vis, mounted]);

  // RSI chart (separate)
  useEffect(() => {
    if (!mounted) return;
    const container = rsiRef.current;
    if (!container || !indicators?.rsi14?.length) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 130,
      layout: {
        background: { type: ColorType.Solid, color: CHART_BG },
        textColor: CHART_TEXT,
        fontSize: 10,
      },
      grid: {
        vertLines: { color: CHART_GRID },
        horzLines: { color: CHART_GRID },
      },
      crosshair: { mode: 0 },
      rightPriceScale: {
        borderColor: CHART_BORDER,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: CHART_BORDER,
        timeVisible: false,
        visible: true,
      },
    });

    const rsiSeries = chart.addSeries(LineSeries, {
      color: '#34d399',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rsiSeries.setData(dedup(indicators.rsi14.map((d) => ({ time: d.time, value: d.value }))) as any);

    rsiSeries.createPriceLine({ price: 70, color: 'rgba(248,113,113,0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '' });
    rsiSeries.createPriceLine({ price: 30, color: 'rgba(52,211,153,0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '' });
    rsiSeries.createPriceLine({ price: 50, color: 'rgba(136,136,136,0.2)', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' });

    chart.timeScale().fitContent();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) chart.applyOptions({ width: entry.contentRect.width });
    });
    observer.observe(container);

    return () => { observer.disconnect(); chart.remove(); };
  }, [indicators, mounted]);

  // Toggle button configs
  const allToggles = [
    { key: 'ema20' as keyof IndicatorVisibility, label: 'EMA 20', color: '#f59e0b', hasData: !!indicators?.ema20?.length },
    { key: 'ema50' as keyof IndicatorVisibility, label: 'EMA 50', color: '#60a5fa', hasData: !!indicators?.ema50?.length },
    { key: 'ema100' as keyof IndicatorVisibility, label: 'EMA 100', color: '#f472b6', hasData: !!indicators?.ema100?.length },
    { key: 'ema200' as keyof IndicatorVisibility, label: 'EMA 200', color: '#c084fc', hasData: !!indicators?.ema200?.length },
    { key: 'sr' as keyof IndicatorVisibility, label: 'S/R', color: '#34d399', hasData: levels.length > 0 },
    { key: 'trendLong' as keyof IndicatorVisibility, label: 'Trend ยาว', color: '#ffffff', hasData: (indicators?.trendlines?.long?.upper?.length ?? 0) >= 2 },
    { key: 'trendShort' as keyof IndicatorVisibility, label: 'Trend สั้น', color: '#facc15', hasData: (indicators?.trendlines?.short?.upper?.length ?? 0) >= 2 },
    { key: 'volume' as keyof IndicatorVisibility, label: 'Volume', color: '#8b9a8f', hasData: true },
  ];
  const toggles = allToggles.filter((t) => t.hasData);

  return (
    <div className="space-y-0">
      {/* Indicator toggles */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {toggles.map((t) => (
          <button
            key={t.key}
            onClick={() => toggleIndicator(t.key)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border ${
              vis[t.key]
                ? 'border-opacity-30 bg-opacity-15'
                : 'border-transparent bg-transparent opacity-40 hover:opacity-70'
            }`}
            style={{
              color: t.color,
              borderColor: vis[t.key] ? t.color : 'transparent',
              backgroundColor: vis[t.key] ? `${t.color}15` : 'transparent',
            }}
          >
            <span className="inline-block w-2 h-[2px] rounded mr-1.5" style={{ backgroundColor: t.color }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Price chart */}
      <div ref={priceRef} className="w-full rounded-t-xl border border-border overflow-hidden" />

      {/* RSI chart */}
      {indicators?.rsi14 && indicators.rsi14.length > 0 && (
        <div className="relative">
          <div className="absolute top-2 left-3 z-10 text-[10px] font-semibold text-green uppercase tracking-wider">
            RSI (14)
          </div>
          <div ref={rsiRef} className="w-full rounded-b-xl border border-t-0 border-border overflow-hidden" />
        </div>
      )}
    </div>
  );
}

import type { Candle, SRLevel } from '@/types';

export function calculateSupportResistance(candles: Candle[]): SRLevel[] {
  if (candles.length < 5) return [];

  // Adaptive window: smaller for less data
  const window = candles.length < 30 ? 2 : candles.length < 60 ? 3 : 5;
  const pivots: number[] = [];

  // Find local minima and maxima using pivot window of 5
  for (let i = window; i < candles.length - window; i++) {
    let isHigh = true;
    let isLow = true;

    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;
      if (candles[j].high >= candles[i].high) isHigh = false;
      if (candles[j].low <= candles[i].low) isLow = false;
    }

    if (isHigh) pivots.push(candles[i].high);
    if (isLow) pivots.push(candles[i].low);
  }

  if (pivots.length === 0) return [];

  // Cluster nearby pivots — wider threshold for less data
  const clusterThreshold = candles.length < 30 ? 0.025 : candles.length < 60 ? 0.02 : 0.015;
  const sorted = [...pivots].sort((a, b) => a - b);
  const clusters: number[][] = [];
  let currentCluster: number[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const clusterAvg =
      currentCluster.reduce((sum, p) => sum + p, 0) / currentCluster.length;
    if (Math.abs(sorted[i] - clusterAvg) / clusterAvg <= clusterThreshold) {
      currentCluster.push(sorted[i]);
    } else {
      clusters.push(currentCluster);
      currentCluster = [sorted[i]];
    }
  }
  clusters.push(currentCluster);

  // Current price is the last candle's close
  const currentPrice = candles[candles.length - 1].close;

  // Map clusters to S/R levels
  const levels: SRLevel[] = clusters.map((cluster) => {
    const price = cluster.reduce((sum, p) => sum + p, 0) / cluster.length;
    return {
      price: Math.round(price * 100) / 100,
      type: price < currentPrice ? 'support' : 'resistance',
      strength: cluster.length,
    };
  });

  // Return top 3 support + top 3 resistance (sorted by strength)
  const supports = levels.filter((l) => l.type === 'support').sort((a, b) => b.strength - a.strength).slice(0, 3);
  const resistances = levels.filter((l) => l.type === 'resistance').sort((a, b) => b.strength - a.strength).slice(0, 3);
  return [...supports, ...resistances];
}

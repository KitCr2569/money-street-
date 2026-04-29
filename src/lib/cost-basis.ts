import type { HoldingLot, WhatIfResult } from '@/types';

export function calculateCostBasis(lots: HoldingLot[]) {
  if (lots.length === 0) {
    return { avgCost: 0, totalShares: 0, totalInvestment: 0 };
  }

  const totalInvestment = lots.reduce((sum, lot) => sum + lot.shares * lot.price, 0);
  const totalShares = lots.reduce((sum, lot) => sum + lot.shares, 0);
  const avgCost = totalShares > 0 ? totalInvestment / totalShares : 0;

  return {
    avgCost: Math.round(avgCost * 100) / 100,
    totalShares,
    totalInvestment: Math.round(totalInvestment * 100) / 100,
  };
}

export function calculateWhatIf(
  lots: HoldingLot[],
  newShares: number,
  newPrice: number
): WhatIfResult {
  const current = calculateCostBasis(lots);

  const newTotalInvestment = current.totalInvestment + newShares * newPrice;
  const newTotalShares = current.totalShares + newShares;
  const newAvgCost = newTotalShares > 0 ? newTotalInvestment / newTotalShares : 0;

  return {
    currentAvgCost: current.avgCost,
    currentShares: current.totalShares,
    currentInvestment: current.totalInvestment,
    newAvgCost: Math.round(newAvgCost * 100) / 100,
    newShares: newTotalShares,
    newInvestment: Math.round(newTotalInvestment * 100) / 100,
  };
}

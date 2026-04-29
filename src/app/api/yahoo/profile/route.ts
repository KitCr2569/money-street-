import { NextRequest, NextResponse } from 'next/server';
import { getProfile, getQuotes } from '@/lib/yahoo';
import { validateSymbol } from '@/lib/validate';

export async function GET(req: NextRequest) {
  const symbol = validateSymbol(req.nextUrl.searchParams.get('symbol'));
  if (!symbol) {
    return NextResponse.json({ error: 'Invalid or missing symbol' }, { status: 400 });
  }

  const [profile, quotes] = await Promise.all([
    getProfile(symbol),
    getQuotes([symbol]),
  ]);

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const quote = quotes[0] ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ap = (profile as any).assetProfile ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fd = (profile as any).financialData ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ks = (profile as any).defaultKeyStatistics ?? {};

  return NextResponse.json({
    symbol,
    shortName: quote?.shortName ?? symbol,
    // Company info
    sector: ap.sector ?? null,
    industry: ap.industry ?? null,
    country: ap.country ?? null,
    website: ap.website ?? null,
    fullTimeEmployees: ap.fullTimeEmployees ?? null,
    longBusinessSummary: ap.longBusinessSummary ?? null,
    // Financial data
    marketCap: quote?.marketCap ?? null,
    currency: quote?.currency ?? 'USD',
    currentPrice: fd.currentPrice ?? quote?.regularMarketPrice ?? null,
    targetHighPrice: fd.targetHighPrice ?? null,
    targetLowPrice: fd.targetLowPrice ?? null,
    targetMeanPrice: fd.targetMeanPrice ?? null,
    recommendationKey: fd.recommendationKey ?? null,
    numberOfAnalystOpinions: fd.numberOfAnalystOpinions ?? null,
    totalRevenue: fd.totalRevenue ?? null,
    revenueGrowth: fd.revenueGrowth ?? null,
    grossMargins: fd.grossMargins ?? null,
    operatingMargins: fd.operatingMargins ?? null,
    profitMargins: fd.profitMargins ?? null,
    totalCash: fd.totalCash ?? null,
    totalDebt: fd.totalDebt ?? null,
    returnOnEquity: fd.returnOnEquity ?? null,
    freeCashflow: fd.freeCashflow ?? null,
    // Key statistics
    trailingPE: ks.trailingPE ?? null,
    forwardPE: ks.forwardPE ?? null,
    priceToBook: ks.priceToBook ?? null,
    enterpriseValue: ks.enterpriseValue ?? null,
    beta: ks.beta ?? null,
    sharesOutstanding: ks.sharesOutstanding ?? null,
    // Quote data
    fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: quote?.fiftyTwoWeekLow ?? null,
    regularMarketChangePercent: quote?.regularMarketChangePercent ?? null,
    dividendYield: quote?.dividendYield ?? null,
    exchange: quote?.exchange ?? null,
  });
}

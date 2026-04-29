import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    maxWatchlists: 0,
    maxStocksPerList: 0,
    maxPortfolios: 0,
    quotePollSec: 15,
    quoteCacheSec: 60,
    historyCacheMin: 5,
  });
}

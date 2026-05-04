/**
 * Alpaca Markets API Client
 * For real-time stock prices and paper trading
 */

const ALPACA_BASE_URL = process.env.ALPACA_PAPER === 'true' 
  ? 'https://paper-api.alpaca.markets/v2'
  : 'https://api.alpaca.markets/v2';

const API_KEY = process.env.ALPACA_API_KEY;
const SECRET_KEY = process.env.ALPACA_SECRET_KEY;

interface AlpacaBar {
  t: string;  // timestamp
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
  n: number;  // trade count
  vw: number; // volume weighted average price
}

interface AlpacaQuote {
  ap: number; // ask price
  as: number; // ask size
  bp: number; // bid price
  bs: number; // bid size
  t: string;  // timestamp
}

/**
 * Get latest prices for multiple symbols
 */
export async function getLatestPrices(symbols: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  
  if (!API_KEY || !SECRET_KEY) {
    console.warn('Alpaca API keys not configured, using mock prices');
    return prices;
  }

  try {
    // Alpaca allows up to 50 symbols per request
    const chunkSize = 50;
    for (let i = 0; i < symbols.length; i += chunkSize) {
      const chunk = symbols.slice(i, i + chunkSize);
      const symbolsParam = chunk.join(',');
      
      const response = await fetch(
        `${ALPACA_BASE_URL}/stocks/snapshots?symbols=${symbolsParam}`,
        {
          headers: {
            'APCA-API-KEY-ID': API_KEY,
            'APCA-API-SECRET-KEY': SECRET_KEY,
          },
        }
      );

      if (!response.ok) {
        console.error('Alpaca API error:', response.status, await response.text());
        continue;
      }

      const data = await response.json();
      
      for (const [symbol, snapshot] of Object.entries(data)) {
        const s = snapshot as { dailyBar?: AlpacaBar; latestQuote?: AlpacaQuote };
        // Use daily bar close price or latest quote mid price
        const price = s.dailyBar?.c || 
          (s.latestQuote ? (s.latestQuote.ap + s.latestQuote.bp) / 2 : null);
        
        if (price) {
          prices.set(symbol, price);
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch Alpaca prices:', error);
  }

  return prices;
}

/**
 * Get single stock price
 */
export async function getStockPrice(symbol: string): Promise<number | null> {
  const prices = await getLatestPrices([symbol]);
  return prices.get(symbol) || null;
}

/**
 * Get account info from Alpaca
 */
export async function getAlpacaAccount() {
  if (!API_KEY || !SECRET_KEY) {
    return null;
  }

  try {
    const response = await fetch(`${ALPACA_BASE_URL}/account`, {
      headers: {
        'APCA-API-KEY-ID': API_KEY,
        'APCA-API-SECRET-KEY': SECRET_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get Alpaca account:', error);
    return null;
  }
}

/**
 * Check if Alpaca is configured
 */
export function isAlpacaConfigured(): boolean {
  return !!(API_KEY && SECRET_KEY);
}

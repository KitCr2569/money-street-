/**
 * Alpaca Paper Trading Execution
 * Execute real trades through Alpaca API
 */

import { getLatestPrices } from './client';

// Trading API URL (for orders, positions, account)
function getTradingBaseUrl(): string {
  return process.env.ALPACA_PAPER === 'true' 
    ? 'https://paper-api.alpaca.markets/v2'
    : 'https://api.alpaca.markets/v2';
}

function getApiKey(): string | undefined {
  return process.env.ALPACA_API_KEY;
}

function getSecretKey(): string | undefined {
  return process.env.ALPACA_SECRET_KEY;
}

interface AlpacaOrder {
  id: string;
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  time_in_force: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok';
  status: string;
  filled_qty: number;
  filled_avg_price: number | null;
  created_at: string;
}

/**
 * Check if Alpaca trading is available
 */
export function isAlpacaTradingEnabled(): boolean {
  return !!(getApiKey() && getSecretKey());
}

/**
 * Execute buy order through Alpaca
 */
export async function executeAlpacaBuy(
  symbol: string, 
  qty: number,
  stopLoss?: number,
  takeProfit?: number
): Promise<{ success: boolean; order?: AlpacaOrder; error?: string }> {
  const apiKey = getApiKey();
  const secretKey = getSecretKey();
  
  // Debug logging
  console.log('[Alpaca Trading Debug] API Key loaded:', apiKey ? 'Yes' : 'No');
  console.log('[Alpaca Trading Debug] Secret Key loaded:', secretKey ? 'Yes' : 'No');
  console.log('[Alpaca Trading Debug] Trading URL:', getTradingBaseUrl());
  
  if (!apiKey || !secretKey) {
    return { success: false, error: 'Alpaca API not configured' };
  }

  try {
    // Submit market order
    const response = await fetch(`${getTradingBaseUrl()}/orders`, {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol,
        qty,
        side: 'buy',
        type: 'market',
        time_in_force: 'day',
        // Add stop loss if provided
        ...(stopLoss && {
          stop_loss: {
            stop_price: stopLoss,
            limit_price: stopLoss * 0.99, // 1% below stop
          },
        }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Alpaca API error: ${response.status} - ${errorText}` };
    }

    const order = await response.json() as AlpacaOrder;
    console.log(`✅ Alpaca buy order submitted: ${symbol} x${qty}, Order ID: ${order.id}`);
    
    return { success: true, order };
  } catch (error) {
    console.error('Alpaca buy failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Execute sell order through Alpaca
 */
export async function executeAlpacaSell(
  symbol: string, 
  qty: number
): Promise<{ success: boolean; order?: AlpacaOrder; error?: string }> {
  const apiKey = getApiKey();
  const secretKey = getSecretKey();
  
  if (!apiKey || !secretKey) {
    return { success: false, error: 'Alpaca API not configured' };
  }

  try {
    const response = await fetch(`${getTradingBaseUrl()}/orders`, {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol,
        qty,
        side: 'sell',
        type: 'market',
        time_in_force: 'day',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Alpaca API error: ${response.status} - ${errorText}` };
    }

    const order = await response.json() as AlpacaOrder;
    console.log(`✅ Alpaca sell order submitted: ${symbol} x${qty}, Order ID: ${order.id}`);
    
    return { success: true, order };
  } catch (error) {
    console.error('Alpaca sell failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get current positions from Alpaca
 */
export async function getAlpacaPositions(): Promise<Array<{ symbol: string; qty: number; avgPrice: number }>> {
  const apiKey = getApiKey();
  const secretKey = getSecretKey();
  
  if (!apiKey || !secretKey) {
    return [];
  }

  try {
    const response = await fetch(`${getTradingBaseUrl()}/positions`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return []; // No positions
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const positions = await response.json() as Array<{
      symbol: string;
      qty: string;
      avg_entry_price: string;
    }>;

    return positions.map(p => ({
      symbol: p.symbol,
      qty: parseFloat(p.qty),
      avgPrice: parseFloat(p.avg_entry_price),
    }));
  } catch (error) {
    console.error('Failed to get Alpaca positions:', error);
    return [];
  }
}

/**
 * Get buying power from Alpaca
 */
export async function getAlpacaBuyingPower(): Promise<number> {
  const apiKey = getApiKey();
  const secretKey = getSecretKey();
  
  if (!apiKey || !secretKey) {
    return 0;
  }

  try {
    const response = await fetch(`${getTradingBaseUrl()}/account`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const account = await response.json() as { buying_power: string };
    return parseFloat(account.buying_power);
  } catch (error) {
    console.error('Failed to get Alpaca buying power:', error);
    return 0;
  }
}

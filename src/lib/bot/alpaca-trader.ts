import Alpaca from '@alpacahq/alpaca-trade-api';
import { BotSignal } from './bot-engine';
import { RiskConfig, DEFAULT_RISK_CONFIG } from './risk-manager';
import { notifyTradeExecution } from './notifications';

/**
 * Initialize Alpaca Client
 */
export function getAlpacaClient() {
  const keyId = process.env.ALPACA_API_KEY;
  const secretKey = process.env.ALPACA_API_SECRET;
  const paper = process.env.ALPACA_PAPER === 'true';

  if (!keyId || !secretKey || keyId === 'your_alpaca_key_here') {
    return null;
  }

  return new Alpaca({
    keyId,
    secretKey,
    paper,
  });
}

/**
 * Execute a real buy order on Alpaca
 */
export async function executeAlpacaBuy(
  signal: BotSignal,
  config: RiskConfig = DEFAULT_RISK_CONFIG
) {
  const alpaca = getAlpacaClient();
  if (!alpaca) {
    return { success: false, reason: 'Alpaca API keys not configured' };
  }

  try {
    // 1. Get Account Info
    const account = await alpaca.getAccount();
    const buyingPower = parseFloat(account.buying_power);

    // 2. Calculate Sizing (Simplified for now)
    // We aim for approx 5% of equity per position as per default risk config
    const equity = parseFloat(account.equity);
    const targetInvestment = equity * config.maxPositionPct;
    const shares = Math.floor(targetInvestment / signal.price);

    if (shares <= 0) {
      return { success: false, reason: `Insufficient equity for position size: ${targetInvestment}` };
    }

    if (buyingPower < targetInvestment) {
      return { success: false, reason: 'Insufficient buying power' };
    }

    // 3. Place Order (Bracket Order with SL and TP)
    console.log(`📡 Sending Alpaca Bracket Order for ${signal.symbol}: ${shares} shares @ ${signal.price}`);
    
    const order = await alpaca.createOrder({
      symbol: signal.symbol,
      qty: shares,
      side: 'buy',
      type: 'market',
      time_in_force: 'gtc',
      order_class: 'bracket',
      take_profit: {
        limit_price: signal.takeProfit1, // Using TP1 for now
      },
      stop_loss: {
        stop_price: signal.stopLoss,
      }
    });

    // 4. Notify
    await notifyTradeExecution('buy', signal.symbol, shares, signal.price);


    return { success: true, orderId: order.id, shares };
  } catch (err) {
    console.error('❌ Alpaca trade error:', err);
    return { success: false, reason: err instanceof Error ? err.message : 'Unknown Alpaca error' };
  }
}

/**
 * Get Account Info from Alpaca for Dashboard
 */
export async function getAlpacaPortfolioState() {
  const alpaca = getAlpacaClient();
  if (!alpaca) return null;

  try {
    const account = await alpaca.getAccount();
    return {
      cash: parseFloat(account.cash),
      totalValue: parseFloat(account.equity),
      peakValue: parseFloat(account.last_equity), // approximation
      initialCapital: 100000, // assuming default for paper
      totalPnl: parseFloat(account.equity) - 100000,
    };
  } catch (err) {
    console.error('❌ Failed to fetch Alpaca account:', err);
    return null;
  }
}

/**
 * Get Positions from Alpaca formatted for Dashboard
 */
export async function getAlpacaHoldings() {
  const alpaca = getAlpacaClient();
  if (!alpaca) return [];

  try {
    const positions = await alpaca.getPositions();
    return positions.map((p: any) => ({
      id: p.asset_id,
      symbol: p.symbol,
      side: p.side,
      shares: parseFloat(p.qty),
      entryPrice: parseFloat(p.avg_entry_price),
      currentPrice: parseFloat(p.current_price),
      unrealizedPnl: parseFloat(p.unrealized_pl),
      unrealizedPnlPct: parseFloat(p.unrealized_plpc) * 100,
      stopLoss: 0, // Alpaca doesn't return this in positions easily
      takeProfit1: 0,
      status: 'open',
      strategy: 'alpaca',
      entryAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('❌ Failed to fetch Alpaca positions:', err);
    return [];
  }
}

/**
 * Update an existing Stop Loss order on Alpaca
 */
export async function updateAlpacaStopLoss(symbol: string, newStopPrice: number) {
  const alpaca = getAlpacaClient();
  if (!alpaca) return;

  try {
    // 1. Find the open stop-loss order for this symbol
    const orders = await alpaca.getOrders({
      status: 'open',
      symbols: [symbol],
    } as any);

    const stopOrder = orders.find((o: any) => o.type === 'stop');
    if (!stopOrder) return;

    // 2. Check if the new stop price is actually higher
    const currentStop = parseFloat(stopOrder.stop_price);
    if (newStopPrice <= currentStop) return;

    // 3. Update the order
    console.log(`🆙 Updating Stop Loss for ${symbol} to $${newStopPrice.toFixed(2)}`);
    await alpaca.replaceOrder(stopOrder.id, {
      stop_price: newStopPrice.toFixed(2),
    } as any);
  } catch (err) {
    console.error(`❌ Failed to update Stop Loss for ${symbol}:`, err);
  }
}

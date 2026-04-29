import { getHistory } from './src/lib/yahoo';
import { runBacktest } from './src/lib/bot/backtester';

async function testBacktest() {
  const symbol = 'NVDA';
  const range = '2y';
  console.log(`📊 Running backtest for ${symbol} over ${range}...`);
  
  try {
    const candles = await getHistory(symbol, range);
    if (candles.length < 220) {
      console.log(`❌ Not enough data for ${symbol}: ${candles.length} candles`);
      return;
    }

    const result = runBacktest(symbol, candles);
    
    console.log('\n--- 📈 Backtest Results ---');
    console.log(`Symbol: ${result.symbol}`);
    console.log(`Period: ${result.period}`);
    console.log(`Total Return: $${result.totalReturn.toLocaleString()} (${result.totalReturnPct.toFixed(2)}%)`);
    console.log(`Buy & Hold:  (${result.buyHoldReturnPct.toFixed(2)}%)`);
    console.log(`Win Rate:    ${result.winRate.toFixed(1)}% (${result.winTrades}W / ${result.lossTrades}L)`);
    console.log(`Profit Factor: ${result.profitFactor.toFixed(2)}`);
    console.log(`Sharpe Ratio:  ${result.sharpeRatio.toFixed(2)}`);
    console.log(`Max Drawdown:  ${result.maxDrawdown.toFixed(2)}%`);
    console.log(`Total Trades:  ${result.totalTrades}`);
    console.log('---------------------------\n');

    if (result.totalReturnPct > result.buyHoldReturnPct) {
      console.log('🏆 Bot outperformed Buy & Hold!');
    } else {
      console.log('📉 Buy & Hold performed better in this period.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Backtest failed:', err);
    process.exit(1);
  }
}

testBacktest();

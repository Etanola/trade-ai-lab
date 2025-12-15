import fs from 'fs';
import { getCandles } from '../src/data.js';
import { runBacktestDetailed } from '../src/backtestCore.js';
import { createATRBreakoutStrategy } from '../src/strategy_atr.js';
import { createImprovedStrategy } from '../src/strategy_improved.js';

async function runOne(pair, interval, count) {
  console.log(`\n--- Fetch ${pair} ${interval} ${count} bars ---`);
  const candles = await getCandles(pair, interval, count);
  console.log(`got ${candles.length} bars`);

  const atrStrat = createATRBreakoutStrategy({ atrMultiplier: 1.5, volatilityMax: 0.1, stopAtr: 1.5, positionFraction: 0.2 });
  const impStrat = createImprovedStrategy({ maShort: 7, maLong: 50, rsiLow: 35, rsiHigh: 70, stopLoss: 0.05, takeProfit: 0.08, positionFraction: 0.2 });

  console.log('\nRunning ATR breakout backtest...');
  const r1 = runBacktestDetailed(candles, 200000, atrStrat);
  console.log('ATR result:', { strategy: r1.strategyName, final: r1.finalEquity, trades: r1.trades });

  console.log('\nRunning Improved strategy backtest...');
  const r2 = runBacktestDetailed(candles, 200000, impStrat);
  console.log('Improved result:', { strategy: r2.strategyName, final: r2.finalEquity, trades: r2.trades });

  return { pair, interval, count, atr: r1, improved: r2 };
}

async function main(){
  // quick smoke tests: 1m and 5m
  const results = [];
  results.push(await runOne('BTCJPY','1m', 5000));
  results.push(await runOne('BTCJPY','5m', 5000));

  fs.writeFileSync('./tmp/smoke_backtests.json', JSON.stringify(results, null, 2));
  console.log('\nSaved smoke results to tmp/smoke_backtests.json');
}

main().catch(e=>{ console.error(e); process.exit(1); });

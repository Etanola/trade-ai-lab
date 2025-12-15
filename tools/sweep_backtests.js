import fs from 'fs';
import { getCandles } from '../src/data.js';
import { runBacktestDetailed } from '../src/backtestCore.js';
import { createImprovedStrategy } from '../src/strategy_improved.js';
import { calcMetrics, summarizeMetrics } from '../src/metrics.js';

async function main() {
  const backtestCfg = JSON.parse(fs.readFileSync('./config/backtest.json','utf8'));
  const test = backtestCfg.tests[0];
  console.log('Running sweep on', test.label, test.pair, test.interval, 'count', test.count);

  const candles = await getCandles(test.pair === 'BTCJPY' ? 'BTCUSDT' : test.pair, test.interval, Math.min(5000, test.count));

  const results = [];

  const maShortList = [5,7,20];
  const maLongList = [20,50];
  const rsiLowList = [30,35,40];
  const stopList = [0.03,0.05];
  const tpList = [0.03,0.05,0.08];

  for (const maShort of maShortList) {
    for (const maLong of maLongList) {
      if (maShort >= maLong) continue;
      for (const rsiLow of rsiLowList) {
        for (const stopLoss of stopList) {
          for (const takeProfit of tpList) {
            const strat = createImprovedStrategy({ maShort, maLong, rsiLow, rsiHigh: 70, stopLoss, takeProfit, positionFraction: 1 });
            const res = runBacktestDetailed(candles, backtestCfg.initialCapital, strat);
            const metrics = calcMetrics(res.equitySeries, res.tradesLog, backtestCfg.initialCapital);
            results.push({ strat: strat.name, res, metrics });
            console.log('Done', strat.name, 'Final', res.finalEquity, 'Trades', res.trades);
          }
        }
      }
    }
  }

  results.sort((a,b)=> (b.metrics.CAGR || 0) - (a.metrics.CAGR || 0));

  console.log('\nTop 5 results:');
  for (let i=0;i<Math.min(5,results.length);i++){
    const r = results[i];
    console.log(`\nRank ${i+1}: ${r.strat} Final=${r.res.finalEquity}`);
    console.log(summarizeMetrics(r.metrics));
  }

  fs.writeFileSync('./tmp/sweep_results.json', JSON.stringify(results.map(r=>({strat:r.strat,final:r.res.finalEquity,metrics:r.metrics})),null,2));
  console.log('\nSaved results to tmp/sweep_results.json');
}

main().catch(e=>{console.error(e); process.exit(1)});

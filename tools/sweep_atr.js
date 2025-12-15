import fs from 'fs';
import { getCandles } from '../src/data.js';
import { runBacktestDetailed } from '../src/backtestCore.js';
import { createATRBreakoutStrategy } from '../src/strategy_atr.js';
import { calcMetrics, summarizeMetrics } from '../src/metrics.js';

async function main(){
  const backtestCfg = JSON.parse(fs.readFileSync('./config/backtest.json','utf8'));
  const test = backtestCfg.tests[0];
  const candles = await getCandles(test.pair === 'BTCJPY' ? 'BTCUSDT' : test.pair, test.interval, Math.min(10000, test.count));

  const results = [];
  const atrMults = [1.0, 1.5, 2.0];
  const volMaxList = [0.05, 0.1];
  const stopAtrList = [1.0, 1.5];

  for(const k of atrMults){
    for(const vol of volMaxList){
      for(const stopAtr of stopAtrList){
        const strat = createATRBreakoutStrategy({ atrMultiplier: k, volatilityMax: vol, stopAtr, positionFraction: 0.2 });
        const res = runBacktestDetailed(candles, backtestCfg.initialCapital, strat);
        const metrics = calcMetrics(res.equitySeries, res.tradesLog, backtestCfg.initialCapital);
        results.push({strat: strat.name, res, metrics});
        console.log('Done', strat.name, 'Final', res.finalEquity, 'Trades', res.trades);
      }
    }
  }

  results.sort((a,b)=> (b.metrics.CAGR || 0) - (a.metrics.CAGR || 0));
  console.log('\nTop results:');
  for(let i=0;i<results.length;i++){
    const r = results[i];
    console.log('\n', r.strat, 'Final', r.res.finalEquity);
    console.log(summarizeMetrics(r.metrics));
  }
  fs.writeFileSync('./tmp/atr_sweep.json', JSON.stringify(results.map(r=>({strat:r.strat,final:r.res.finalEquity,metrics:r.metrics})),null,2));
  console.log('\nSaved to tmp/atr_sweep.json');
}

main().catch(e=>{console.error(e); process.exit(1)});

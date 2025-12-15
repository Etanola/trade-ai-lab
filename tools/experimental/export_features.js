import fs from 'fs';
import { getCandles } from '../src/data.js';
import { calculateAllIndicators } from '../src/indicators.js';

// Export features and labels for ML training
// Label: 1 if next N bars return > threshold, else 0

async function main(){
  const pair = 'BTCUSDT';
  const interval = '5m';
  const count = 5000;
  console.log('Fetching candles', pair, interval, count);
  const candles = await getCandles(pair, interval, count);
  console.log('Got', candles.length, 'candles');

  const indicators = calculateAllIndicators(candles);
  const features = [];
  const N = 12; // lookahead 12 bars (~1 hour on 5m)
  const thr = 0.002; // 0.2% return

  for(let i=60;i<candles.length - N;i++){
    const ind = indicators[i];
    if(!ind) continue;
    const row = { timestamp: candles[i].timestamp, close: candles[i].close };
    // basic features
    row.ma5 = ind.ma5; row.ma7 = ind.ma7; row.ma20 = ind.ma20; row.ma50 = ind.ma50;
    row.rsi = ind.rsi; row.atr = ind.atr; row.adx = ind.adx; row.bb_width = ind.bb ? ind.bb.width : null;
    row.vol20 = ind.avgVol20; row.volume = ind.volume;
    row.macd = ind.macd ? ind.macd.macd : null; row.macd_signal = ind.macd ? ind.macd.signal : null;

    // label
    const futureClose = candles[i+N].close;
    const ret = (futureClose - candles[i].close) / candles[i].close;
    row.label = ret > thr ? 1 : 0;

    features.push(row);
  }

  fs.writeFileSync('./tmp/features.json', JSON.stringify(features));
  console.log('Saved', features.length, 'feature rows to tmp/features.json');
}

main().catch(e=>{console.error(e); process.exit(1)});

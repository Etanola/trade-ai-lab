import { getCandles } from '../src/data.js';
import { calculateAllIndicators } from '../src/indicators.js';

(async()=>{
  const candles = await getCandles('BTCUSDT','5m',2000);
  const indicators = calculateAllIndicators(candles);
  const closes = candles.map(c=>c.close);
  let cnt=0; let cntHas=0;
  for(let i=50;i<closes.length;i++){
    const ind = indicators[i];
    if(!ind) continue;
    if(ind.atr != null && ind.hh20 != null) cntHas++;
    const k=1.5;
    if(ind.atr != null && ind.hh20 != null){
      const thresh = ind.hh20 + k*ind.atr;
      if(closes[i] > thresh) cnt++;
    }
  }
  console.log('has atr+hh20:',cntHas,'entries where price > hh+k*atr:',cnt);
  // show first few non-null indicators
  let shown = 0;
  for(let i=50;i<closes.length && shown<5;i++){
    const ind = indicators[i];
    if(!ind) continue;
    console.log('i',i, Object.keys(ind));
    console.log(ind);
    shown++;
  }
})();

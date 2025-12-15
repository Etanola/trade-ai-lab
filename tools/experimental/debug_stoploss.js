import { getCandles } from "../src/data.js";
import { createOriginalStrategy } from "../src/strategy.js";
import { calculateAllIndicators } from "../src/indicators.js";

(async function(){
  try {
    const candles = await getCandles('BTCUSDT','5m',2000);
    const closes = candles.map(c=>c.close);
    const indicators = calculateAllIndicators(candles);
    const strat = createOriginalStrategy({stopLoss:0.05});
    const buys = [];
    for(let i=50;i<closes.length;i++){
      const ind = indicators[i];
      if(!ind) continue;
      if(strat.shouldBuy(ind)) buys.push({i, price: closes[i]});
    }
    console.log('Buys count', buys.length);
    const stops = [0.02,0.05,0.1,0.5];
    for(const b of buys.slice(0,10)){
      console.log('\nBuy at idx', b.i, 'price', b.price);
      for(const s of stops){
        let triggered = -1;
        for(let j=b.i+1;j<closes.length;j++){
          if(closes[j] <= b.price * (1 - s)) { triggered = j; break; }
        }
        console.log(' stop', s, 'triggeredIdx', triggered);
      }
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

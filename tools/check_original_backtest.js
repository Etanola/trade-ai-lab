import { getCandles } from "../src/data.js";
import { runBacktest } from "../src/backtestCore.js";
import { createOriginalStrategy } from "../src/strategy.js";

async function main() {
  try {
    console.log('Fetching candles BTCUSDT 5m (5000) ...');
    const candles = await getCandles('BTCUSDT', '5m', 5000);
    console.log(`Got ${candles.length} candles`);

    const paramsList = [{ stopLoss: 0.05 }, { stopLoss: 0.08 }];

    for (const p of paramsList) {
      const strat = createOriginalStrategy(p);
      console.log('\n=== Running strategy:', strat.name, '===');
      const res = runBacktest(candles, 200000, strat);
      console.log(JSON.stringify(res, null, 2));
    }
  } catch (e) {
    console.error('Error:', e.message || e);
    process.exit(1);
  }
}

main();

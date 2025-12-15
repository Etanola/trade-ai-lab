import { getCandles } from "../src/data.js";
import { runBacktest } from "../src/backtestCore.js";

const cases = [
  { interval: "1m", count: 43200, label: "1m / 約30日" },
  { interval: "5m", count: 50000, label: "5m / 約6ヶ月" }
];

async function runAll() {
  const results = [];

  console.log("===== Backtest Start =====");

  const totalStart = performance.now();

  for (const c of cases) {
    console.log(`\n==== Running: ${c.label} ====`);
    
    // ---- 1. キャンドル取得タイム計測 ----
    const t0 = performance.now();
    const candles = await getCandles("BTCJPY", c.interval, c.count);
    const t1 = performance.now();

    console.log(`getCandles(): ${(t1 - t0).toFixed(1)} ms`);

    // ---- 2. バックテスト時間を計測 ----
    const t2 = performance.now();
    const result = runBacktest(candles);
    const t3 = performance.now();

    console.log(`runBacktest(): ${(t3 - t2).toFixed(1)} ms`);
    console.log(`TOTAL for case: ${(t3 - t0).toFixed(1)} ms`);

    results.push({ label: c.label, ...result });
  }

  const totalEnd = performance.now();

  console.log("\n===== バックテスト結果まとめ =====");
  for (const r of results) {
    console.log(`
Case: ${r.label}
  Final Equity: ${r.finalEquity}
  Win Rate: ${r.winRate}%
  Trades: ${r.trades}
  Max DD: ${r.dd}%
    `);
  }

  console.log(`===== Total Time: ${(totalEnd - totalStart).toFixed(1)} ms =====`);
}

runAll();

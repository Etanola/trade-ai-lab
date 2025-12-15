import { getCandles } from "../lib/data.js";
import { runBacktest } from "../lib/backtestCore.js";

// バックテストケース定義
const cases = [
  { interval: "1m", count: 4320, label: "1m / 約30日" },
  { interval: "5m", count: 5000, label: "5m / 約6ヶ月" }
];

async function runAll() {
  const results = [];

  for (const c of cases) {
    console.log(`==== Running: ${c.label} ====`);
    const candles = await getCandles("BTCJPY", c.interval, c.count);

    const result = runBacktest(candles);
    results.push({ label: c.label, ...result });
  }

  console.log("===== バックテスト結果まとめ =====");
  for (const r of results) {
    console.log(`
Case: ${r.label}
  Final Equity: ${r.finalEquity}
  Win Rate: ${r.winRate}%
  Trades: ${r.trades}
  Max DD: ${r.dd}%
    `);
  }
}

runAll();

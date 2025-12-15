import fs from "fs";
import { getCandles } from "../src/data.js";
import { runBacktest } from "../src/backtestCore.js";
import { STRATEGY_FACTORY } from "../src/strategy.js";

async function runAll() {
  const backtestCfg = JSON.parse(fs.readFileSync("./config/backtest.json", "utf8"));
  const strategyCfg = JSON.parse(fs.readFileSync("./config/strategies.json", "utf8"));

  const results = [];
  const totalStart = performance.now();

  console.log("===== Backtest Start =====");

  for (const test of backtestCfg.tests) {
    console.log(`\n#### TestCase: ${test.label} ####`);

    const candles = await getCandles(test.pair, test.interval, test.count);

    // --- strategyCfg の全ストラテジーを回す ---
    for (const strategyName of Object.keys(strategyCfg)) {
      const paramList = strategyCfg[strategyName];

      for (const params of paramList) {
        const factory = STRATEGY_FACTORY[strategyName];
        const strategy = factory(params);

        const result = runBacktest(
          candles,
          backtestCfg.initialCapital,
          strategy
        );

        results.push({
          test: test.label,
          strategy: strategy.name,
          ...result
        });

        console.log(
          `Done: ${strategy.name} | Equity=${result.finalEquity}`
        );
      }
    }
  }

  console.log("\n===== Summary =====");
  for (const r of results) {
    console.log(`
Test: ${r.test}
Strategy: ${r.strategy}
Final: ${r.finalEquity}
Win Rate: ${r.winRate}%
Trades: ${r.trades}
DD: ${r.dd}%
`);
  }

  console.log(`===== Total Time: ${(performance.now() - totalStart).toFixed(1)} ms =====`);
}

runAll();

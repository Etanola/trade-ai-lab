// tools/backtest.js
import { getCandlesFromBinance, getAllCandles } from "../lib/data.js";
import { calculateIndicators } from "../lib/indicators.js";
import { shouldBuy, shouldSell } from "../lib/strategy.js";

// ==========================
// バックテスト本体
// ==========================
async function runBacktest() {
  // Binance から過去ローソク足取得
  const candles = await getAllCandles("BTCJPY", "1m", 1000);
  console.log(`取得ローソク足本数: ${candles.length}`);

  // 初期資金（JPY）
  let firstJpy = 200000;
  let jpy = firstJpy;
  let position = 0;      // BTC保有量
  let entryPrice = 0;

  // バックテスト成績
  let maxEquity = jpy;
  let maxDD = 0;
  let win = 0, lose = 0;

  // 50本目くらいまでは指標計算できないためスキップ
  for (let i = 50; i < candles.length; i++) {
    console.log(`Processing candle ${i + 1} / ${candles.length}`);
    // 過去のローソク足で指標を計算
    const slice = candles.slice(0, i);
    const ind = calculateIndicators(slice);

    const price = candles[i].close;

    // ---------------------
    // 売買ロジック判定
    // ---------------------
    if (position === 0 && shouldBuy(ind)) {
      // BUY
      position = jpy / price;
      entryPrice = price;
      jpy = 0;

      // console.log(`BUY @ ${price}`);
    }
    else if (position > 0 && shouldSell(ind)) {
      // SELL
      const sellValue = position * price;
      const profit = sellValue - entryPrice * position;

      if (profit > 0) win++;
      else lose++;

      jpy = sellValue;
      position = 0;

      // console.log(`SELL @ ${price} (P/L = ${profit})`);
    }

    // ---------------------
    // ドローダウン計算
    // ---------------------
    const equity = jpy + position * price;

    if (equity > maxEquity) maxEquity = equity;

    const dd = (maxEquity - equity) / maxEquity;
    if (dd > maxDD) maxDD = dd;
  }

  // 最終評価額
  const finalEquity =
    jpy + position * candles[candles.length - 1].close;

  console.log("===== バックテスト結果 =====");
  console.log("初期資金:", firstJpy);
  console.log("最終資金:", Math.round(finalEquity));
  console.log("勝ち:", win, "負け:", lose);
  console.log("勝率:", (win / (win + lose) * 100).toFixed(2), "%");
  console.log("最大ドローダウン:", (maxDD * 100).toFixed(2), "%");
}

runBacktest();

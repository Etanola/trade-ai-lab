import { calculateIndicators } from "./indicators.js";
import { shouldBuy, shouldSell } from "./strategy.js";

export function runBacktest(candles, initial = 200000) {
  let jpy = initial;
  let position = 0;
  let entry = 0;

  let win = 0, lose = 0;
  let maxEquity = jpy;
  let maxDD = 0;
  let trades = 0;

  for (let i = 50; i < candles.length; i++) {
    const slice = candles.slice(0, i);
    const ind = calculateIndicators(slice);
    const price = slice[slice.length - 1].close;

    // --- エントリー ---
    if (position === 0 && shouldBuy(ind)) {
      position = jpy / price;
      entry = price;
      jpy = 0;
      trades++;
    }

    // --- エグジット（利確 or 損切り） ---
    else if (position > 0) {
      // 損切り＋売りシグナル
      if (shouldSell(ind, price, entry)) {

        const value = position * price;
        const profit = value - entry * position;

        if (profit > 0) win++;
        else lose++;

        jpy = value;
        position = 0;
        entry = 0; // ←忘れずにリセット
      }
    }

    // --- エクイティ計算 ---
    const equity = jpy + position * price;
    maxEquity = Math.max(maxEquity, equity);
    maxDD = Math.max(maxDD, (maxEquity - equity) / maxEquity);
  }

  // --- 最終エクイティ ---
  const finalEquity = jpy + position * candles[candles.length - 1].close;

  return {
    finalEquity: Math.round(finalEquity),
    trades,
    win,
    lose,
    winRate: ((win / (win + lose)) * 100).toFixed(2),
    dd: (maxDD * 100).toFixed(2)
  };
}
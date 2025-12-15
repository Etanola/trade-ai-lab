import { calculateAllIndicators } from "./indicators.js";

export function runBacktest(candles, initial = 200000, strategy) {
  let jpy = initial;
  let position = 0;
  let entry = 0;
  let peak = 0;

  let win = 0, lose = 0;
  let maxEquity = jpy;
  let maxDD = 0;
  let trades = 0;
  
  const indicators = calculateAllIndicators(candles);
  const len = candles.length;

  for (let i = 50; i < len; i++) {
    const ind = indicators[i];
    if (!ind) continue;
    const price = candles[i].close;

    if (position === 0) {
      if (strategy.shouldBuy(ind)) {
        position = jpy / price;
        entry = price;
        peak = price;
        jpy = 0;
        trades++;
      }
    } else {
      if (price > peak) peak = price;

      if (strategy.shouldSell(ind, price, entry, peak)) {
        const value = position * price;
        const profit = value - entry * position;

        if (profit > 0) win++;
        else lose++;

        jpy = value;
        position = 0;
        entry = 0;
        peak = 0;
      }
    }

    const equity = jpy + position * price;
    if (equity > maxEquity) maxEquity = equity;
    const dd = (maxEquity - equity) / maxEquity;
    if (dd > maxDD) maxDD = dd;
  }

  const lastClose = candles[len - 1].close;
  const finalEquity = jpy + position * lastClose;
  const strategyName = strategy && strategy.name ? strategy.name : "(unknown)";

  const totalTrades = win + lose;

  return {
    strategyName,
    finalEquity: Math.round(finalEquity),
    trades,
    win,
    lose,
    winRate: totalTrades > 0 ? ((win / totalTrades) * 100).toFixed(2) : "0.00",
    dd: (maxDD * 100).toFixed(2)
  };
}

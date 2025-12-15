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

  for (let i = 50; i < candles.length; i++) {
    const ind = indicators[i];
    const price = candles[i].close;

    if (position === 0) {
      if (strategy.shouldBuy(ind)) {
        position = jpy / price;
        entry = price;
        peak = price;  // Peakリセット
        jpy = 0;
        trades++;
      }
    } else {
      peak = Math.max(peak, price);

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
    maxEquity = Math.max(maxEquity, equity);
    maxDD = Math.max(maxDD, (maxEquity - equity) / maxEquity);
  }

  const finalEquity = jpy + position * candles[candles.length - 1].close;

  return {
    strategyName,
    finalEquity: Math.round(finalEquity),
    trades,
    win,
    lose,
    winRate: ((win / (win + lose)) * 100).toFixed(2),
    dd: (maxDD * 100).toFixed(2)
  };
}

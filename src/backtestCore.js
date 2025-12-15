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
      if (strategy.shouldBuy(ind, price, i)) {
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

export function runBacktestDetailed(candles, initial = 200000, strategy) {
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

  const tradesLog = [];
  const equitySeries = [];

  for (let i = 50; i < len; i++) {
    const ind = indicators[i];
    if (!ind) continue;
    const price = candles[i].close;

    // record equity at start of bar
    equitySeries.push({ t: candles[i].timestamp, equity: jpy + position * price });

      if (position === 0) {
      if (strategy.shouldBuy(ind, price, i)) {
        position = (jpy * (strategy.positionFraction || 1)) / price;
        entry = price;
        peak = price;
        jpy = jpy - position * price;
        trades++;
        tradesLog.push({ entryIndex: i, entryPrice: price, exitIndex: null, exitPrice: null, profit: null, reason: 'entry' });
      }
    } else {
      if (price > peak) peak = price;

      const lastTrade = tradesLog[tradesLog.length - 1];

      if (strategy.shouldSell(ind, price, entry, peak)) {
        const value = position * price;
        const profit = value - entry * position;

        if (profit > 0) win++;
        else lose++;

        jpy += value;
        position = 0;
        lastTrade.exitIndex = i;
        lastTrade.exitPrice = price;
        lastTrade.profit = profit;
        lastTrade.reason = 'signal';
      }
    }

    const equity = jpy + position * price;
    if (equity > maxEquity) maxEquity = equity;
    const dd = (maxEquity - equity) / maxEquity;
    if (dd > maxDD) maxDD = dd;
  }

  // final equity point
  const lastClose = candles[len - 1].close;
  equitySeries.push({ t: candles[len - 1].timestamp, equity: jpy + position * lastClose });

  // finalize any open position (market close)
  if (position !== 0) {
    const value = position * lastClose;
    const profit = value - entry * position;
    if (profit > 0) win++; else lose++;
    jpy += value;
    const lastTrade = tradesLog[tradesLog.length - 1];
    lastTrade.exitIndex = len - 1;
    lastTrade.exitPrice = lastClose;
    lastTrade.profit = profit;
    lastTrade.reason = 'eod';
    position = 0;
  }

  const finalEquity = jpy;
  const totalTrades = win + lose;
  return {
    strategyName: strategy && strategy.name ? strategy.name : '(unknown)',
    finalEquity: Math.round(finalEquity),
    trades,
    win,
    lose,
    winRate: totalTrades > 0 ? ((win / totalTrades) * 100).toFixed(2) : '0.00',
    dd: (maxDD * 100).toFixed(2),
    tradesLog,
    equitySeries
  };
}

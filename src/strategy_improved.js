export function createImprovedStrategy(params) {
  const {
    maShort = 7,
    maLong = 50,
    rsiLow = 35,
    rsiHigh = 70,
    stopLoss = 0.05,
    takeProfit = 0.08,
    positionFraction = 0.2
  } = params;

  return {
    name: `improved(ma${maShort}-${maLong},rsi${rsiLow}-${rsiHigh},sl${stopLoss},tp${takeProfit})`,
    positionFraction,

    shouldBuy(ind) {
      if (!ind) return false;
      // resolve available MA keys (indicators provide ma5, ma7, ma20, ma50)
      const resolveMA = (m) => {
        if (m <= 5) return 'ma5';
        if (m <= 7) return 'ma7';
        if (m <= 20) return 'ma20';
        return 'ma50';
      };
      const shortKey = resolveMA(maShort);
      const longKey = resolveMA(maLong);

      if (ind[shortKey] == null || ind[longKey] == null) return false;
      if (ind.rsi == null) return false;

      // momentum + RSI band + MACD improving
      const macdOk = ind.macd && ind.macd.macd != null && ind.macd.signal != null && ind.macd.macd > ind.macd.signal;
      const macdRising = ind.macd && ind.macd.macdPrev != null ? ind.macd.macd > ind.macd.macdPrev : true;

      return ind[shortKey] > ind[longKey] && ind.rsi > rsiLow && ind.rsi < rsiHigh && macdOk && macdRising;
    },

    shouldSell(ind, price, entry, peak) {
      // stop loss
      if (price <= entry * (1 - stopLoss)) return true;
      // take profit
      if (price >= entry * (1 + takeProfit)) return true;
      // trailing based on peak
      if (peak && price <= peak * (1 - 0.03)) return true;
      // signal-based exit
      if (ind && ind.macd && ind.macd.macd < ind.macd.signal) return true;
      if (ind && ind.rsi !== null && ind.rsi >= rsiHigh) return true;
      return false;
    }
  };
}

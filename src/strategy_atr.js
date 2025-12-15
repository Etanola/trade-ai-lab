export function createATRBreakoutStrategy(params) {
  const {
    breakoutPeriod = 20,
    atrMultiplier = 1.5,
    volatilityMax = 0.05,
    stopAtr = 1.0,
    minAdx = 0,
    minAvgVol = 0,
    positionFraction = 0.2
  } = params;

  return {
    name: `atr_breakout(p${breakoutPeriod},k${atrMultiplier},vol${volatilityMax})`,
    positionFraction,

    shouldBuy(ind, price, index) {
      if (!ind) return false;
      if (ind.atr == null) return false;
      const hh = ind.hh20; // previous 20-high
      if (hh == null) return false;
      // ADX filter (apply only when minAdx > 0)
      if (minAdx > 0 && (ind.adx == null || ind.adx < minAdx)) return false;
      // volume filter (average 20)
      if (minAvgVol > 0 && (ind.avgVol20 == null || ind.avgVol20 < minAvgVol)) return false;
      const entryThresh = hh + atrMultiplier * ind.atr;
      // volatility filter using bollinger width if available
      if (ind.bb && ind.bb.width && ind.bb.width > volatilityMax) return false;
      return price > entryThresh;
    },

    shouldSell(ind, price, entry, peak) {
      if (!ind) return false;
      // stop loss/take profit based on ATR multiples
      if (price <= entry - stopAtr * (ind.atr || 0)) return true;
      if (price >= entry + stopAtr * (ind.atr || 0) * 2) return true;
      // exit on MACD cross
      if (ind.macd && ind.macd.macd < ind.macd.signal) return true;
      return false;
    }
  };
}

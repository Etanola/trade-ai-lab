export function createTrendStrategy(params) {
  const { maShort, maLong, rsiMin, trail } = params;

  return {
    name: `trend(ma${maShort}-${maLong},rsi>${rsiMin},trail${trail})`,

    shouldBuy(ind) {
      return (
        ind[`ma${maShort}`] > ind[`ma${maLong}`] &&
        ind.rsi > rsiMin &&
        ind.macd.macd > 0
      );
    },

    shouldSell(ind, price, entry, peak) {
      if (price <= entry * (1 - 0.05)) return true;
      if (price <= peak * (1 - trail)) return true;
      return ind[`ma${maShort}`] < ind[`ma${maLong}`];
    }
  };
}

export function createOriginalStrategy(params) {
  const { stopLoss } = params;

  return {
    name: `original(stop${stopLoss})`,

    shouldBuy(ind) {
      return (
        ind.ma5 > ind.ma20 &&
        ind.rsi > 30 && ind.rsi < 70 &&
        ind.macd.macd > ind.macd.signal &&
        ind.macd.macdPrev <= ind.macd.signalPrev
      );
    },

    shouldSell(ind, price, entry) {
      if (price <= entry * (1 - stopLoss)) return true;
      return (
        ind.macd.macd < ind.macd.signal ||
        ind.rsi >= 70 ||
        ind.ma5 < ind.ma20
      );
    }
  };
}

export const STRATEGY_FACTORY = {
  trend: createTrendStrategy,
  original: createOriginalStrategy
};

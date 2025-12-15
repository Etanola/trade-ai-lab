export const STOP_LOSS_PCT = 0.05; // 5%損切り

export function shouldBuy(ind) {
  return (
    ind.ma5 > ind.ma20 &&
    ind.rsi > 30 && ind.rsi < 70 &&
    ind.macd.macd > ind.macd.signal &&
    ind.macd.macdPrev <= ind.macd.signalPrev
  );
}

export function shouldSell(ind, price, entry) {
  // --- 追加: ストップロス判定 ---
  if (entry > 0) {
    const stopPrice = entry * (1 - STOP_LOSS_PCT);
    if (price <= stopPrice) {
      return true; // 強制損切り
    }
  }

  // --- 元の売りロジック ---
  return (
    ind.macd.macd < ind.macd.signal ||
    ind.rsi >= 70 ||
    ind.ma5 < ind.ma20
  );
}
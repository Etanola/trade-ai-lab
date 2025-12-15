// ========= インジケータ計算 =========

// ---- SMA ----
function sma(values, period) {
  if (!Array.isArray(values) || values.length < period) return null;
  const slice = values.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

// ---- RSI ----
function calcRSI(closes, period = 14) {
  const len = closes.length;
  if (len < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = len - period; i < len; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ---- EMA ----
function ema(values, period) {
  if (!Array.isArray(values) || values.length < period) return null;

  const k = 2 / (period + 1);

  // period 本での SMA が初期値
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
  }

  return prev;
}

// ---- MACD ----
function calcMACD(closes) {
  if (closes.length < 26) return null;

  // 最新値の MACD
  const macdValue = ema(closes, 12) - ema(closes, 26);

  // 過去 MACD シリーズ
  const macdSeries = [];
  for (let i = 26; i <= closes.length; i++) {
    const slice = closes.slice(0, i);
    const e12 = ema(slice, 12);
    const e26 = ema(slice, 26);
    if (e12 !== null && e26 !== null) {
      macdSeries.push(e12 - e26);
    }
  }

  const signal = ema(macdSeries, 9);
  const histogram = macdValue - signal;

  // クロス判定用（1本前）
  const macdPrev =
    macdSeries.length >= 2 ? macdSeries[macdSeries.length - 2] : null;

  const signalPrev =
    macdSeries.length >= 2
      ? ema(macdSeries.slice(0, macdSeries.length - 1), 9)
      : null;

  return {
    macd: macdValue,
    signal: signal,
    histogram: histogram,
    macdPrev,
    signalPrev
  };
}

// ---- ボリンジャーバンド ----
function calcBollingerBands(closes, period = 20, multiplier = 2) {
  if (closes.length < period) return null;

  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;

  const variance =
    slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;

  const std = Math.sqrt(variance);

  return {
    middle: mean,
    upper: mean + multiplier * std,
    lower: mean - multiplier * std,
    width: (multiplier * std * 2) / mean
  };
}

// ========= まとめて計算 =========
export function calculateIndicators(candles) {
  const closes = candles.map(c => c.close);

  const ma5 = sma(closes, 5);
  const ma20 = sma(closes, 20);
  const rsi = calcRSI(closes, 14);
  const macd = calcMACD(closes);
  const bb = calcBollingerBands(closes, 20, 2);

  return {
    closes,
    ma5,
    ma20,
    rsi,
    macd,
    bb
  };
}

// 新しい関数：全ての足に対して一度だけインジケータを計算
export function calculateAllIndicators(candles) {
  return candles.map((_, i) => {
    if (i < 50) return null;  // インジ計算できない足はスキップ
    const slice = candles.slice(0, i + 1);
    return calculateIndicators(slice);
  });
}

// ========= 高速インジケータ計算（単一パス） =========

export function calculateAllIndicators(candles) {
  const n = candles.length;
  const closes = new Array(n);
  const highs = new Array(n);
  const lows = new Array(n);
  for (let i = 0; i < n; i++) {
    closes[i] = candles[i].close;
    highs[i] = candles[i].high;
    lows[i] = candles[i].low;
  }

  const out = new Array(n).fill(null);

  // SMA 用スライディング和
  let sum5 = 0, sum7 = 0, sum20 = 0, sum50 = 0;

  // EMA 用の前値
  let ema12 = null, ema26 = null, signal = null;
  const k12 = 2 / (12 + 1);
  const k26 = 2 / (26 + 1);
  const k9 = 2 / (9 + 1);

  // MACD バッファ（初期シグナル算出用）
  const macdBuffer = [];
  let prevMacd = null, prevSignal = null;

  // RSI 用（Wilder の平滑化）
  const rsiPeriod = 14;
  let avgGain = null, avgLoss = null;

  // Bollinger 用
  let sum20sq = 0;
  // ATR 用
  const atrPeriod = 14;
  let atr = null;
  let prevCloseForTR = null;

  for (let i = 0; i < n; i++) {
    const close = closes[i];

    // スライディング和の更新
    sum5 += close; if (i - 5 >= 0) sum5 -= closes[i - 5];
    sum7 += close; if (i - 7 >= 0) sum7 -= closes[i - 7];
    sum20 += close; if (i - 20 >= 0) sum20 -= closes[i - 20];
    sum50 += close; if (i - 50 >= 0) sum50 -= closes[i - 50];

    if (i - 20 >= 0) {
      // sum20sq 更新
      sum20sq += close * close;
      if (i - 20 >= 0) sum20sq -= closes[i - 20] * closes[i - 20];
    } else if (i === 19) {
      // 初回で全体を計算
      sum20sq = 0;
      for (let j = 0; j <= 19; j++) sum20sq += closes[j] * closes[j];
    }

    let ma5 = i >= 4 ? sum5 / 5 : null;
    let ma7 = i >= 6 ? sum7 / 7 : null;
    let ma20 = i >= 19 ? sum20 / 20 : null;
    let ma50 = i >= 49 ? sum50 / 50 : null;

    // EMA12 初期値は最初の 12 本の SMA
    if (ema12 === null && i >= 11) {
      let s = 0; for (let j = i - 11; j <= i; j++) s += closes[j];
      ema12 = s / 12;
    } else if (ema12 !== null) {
      ema12 = close * k12 + ema12 * (1 - k12);
    }

    if (ema26 === null && i >= 25) {
      let s = 0; for (let j = i - 25; j <= i; j++) s += closes[j];
      ema26 = s / 26;
    } else if (ema26 !== null) {
      ema26 = close * k26 + ema26 * (1 - k26);
    }

    let macd = null;
    if (ema12 !== null && ema26 !== null) {
      macd = ema12 - ema26;
      // macdBuffer はシグナル初期値算出用
      macdBuffer.push(macd);
      if (macdBuffer.length < 9) {
        // シグナル未確定
      } else if (macdBuffer.length === 9 && signal === null) {
        // 初期シグナルは直近 9 本の平均
        let s = 0; for (let j = 0; j < 9; j++) s += macdBuffer[j];
        signal = s / 9;
      } else if (signal !== null) {
        prevSignal = signal;
        signal = macd * k9 + signal * (1 - k9);
      }
    }

    let macdPrev = null, signalPrev = null;
    if (macd !== null) {
      macdPrev = prevMacd;
      prevMacd = macd;
    }
    if (signal !== null) {
      signalPrev = prevSignal;
    }

    // RSI
    let rsi = null;
    if (i >= 1) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;

      if (avgGain === null && i >= rsiPeriod) {
        // 初期 avgGain/avgLoss の計算
        let g = 0, l = 0;
        for (let j = 1; j <= rsiPeriod; j++) {
          const d = closes[j] - closes[j - 1];
          if (d > 0) g += d; else l += -d;
        }
        avgGain = g / rsiPeriod;
        avgLoss = l / rsiPeriod;
      } else if (avgGain !== null) {
        avgGain = (avgGain * (rsiPeriod - 1) + gain) / rsiPeriod;
        avgLoss = (avgLoss * (rsiPeriod - 1) + loss) / rsiPeriod;
      }

      if (avgGain !== null) {
        if (avgLoss === 0) rsi = 100;
        else {
          const rs = avgGain / avgLoss;
          rsi = 100 - 100 / (1 + rs);
        }
      }
    }

    // Bollinger
    let bb = null;
    if (i >= 19) {
      const mean = ma20; // already computed
      const variance = sum20sq / 20 - mean * mean;
      const std = Math.sqrt(Math.max(0, variance));
      bb = {
        middle: mean,
        upper: mean + 2 * std,
        lower: mean - 2 * std,
        width: (2 * std * 2) / mean
      };
    }

    // ATR (Wilder smoothing)
    let atrVal = null;
    if (i >= 1) {
      const high = highs[i];
      const low = lows[i];
      const prevClose = prevCloseForTR !== null ? prevCloseForTR : closes[i - 1];
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));

      if (atr === null && i >= atrPeriod) {
        // initial ATR = average TR over period
        let sumTR = 0;
        for (let j = i - atrPeriod + 1; j <= i; j++) {
          const ph = highs[j];
          const pl = lows[j];
          const pc = j - 1 >= 0 ? closes[j - 1] : closes[j];
          const trj = Math.max(ph - pl, Math.abs(ph - pc), Math.abs(pl - pc));
          sumTR += trj;
        }
        atr = sumTR / atrPeriod;
      } else if (atr !== null) {
        atr = (atr * (atrPeriod - 1) + tr) / atrPeriod;
      }

      prevCloseForTR = closes[i];
      atrVal = atr;
    }

    // highest / lowest lookback (for breakout)
    const hh20 = i >= 19 ? (() => { let m = -Infinity; for (let j = i - 19; j <= i - 1; j++) { if (highs[j] > m) m = highs[j]; } return m; })() : null;
    const ll20 = i >= 19 ? (() => { let m = Infinity; for (let j = i - 19; j <= i - 1; j++) { if (lows[j] < m) m = lows[j]; } return m; })() : null;

    // 出力インジケータ（十分な情報が揃うまで null を返す）
    if (i >= 50) {
      out[i] = {
        ma5,
        ma7,
        ma20,
        ma50,
        rsi,
        macd: macd !== null ? { macd, signal, histogram: signal !== null ? macd - signal : null, macdPrev, signalPrev } : null,
        bb,
        atr: atrVal,
        hh20,
        ll20
      };
    } else {
      out[i] = null;
    }
  }

  return out;
}

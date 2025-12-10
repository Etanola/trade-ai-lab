import YahooFinance from "yahoo-finance2"; 
const yahooFinance = new YahooFinance({suppressNotices: ["yahooSurvey"]});
import { RSI } from "technicalindicators";

const tickers = [
  "8918.T", "6740.T", "3681.T",
  "4344.T", "3315.T", "2930.T", "3912.T"
];

// ----------------------------------------------------
// ★ 移動平均（MA）を計算
// ----------------------------------------------------
function calcMA(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const sum = slice.reduce((acc, v) => acc + v, 0);
  return sum / period;
}
// ----------------------------------------------------
// ★ RSI 計算（あなたの改良版）
// ----------------------------------------------------
async function getRSI(ticker) {
  try {
    const data = await yahooFinance.chart(ticker, {
      period1: "2024-01-01",
      interval: "1d",
    });

    const history = data.quotes || [];
    if (!Array.isArray(history) || history.length === 0) {
      console.error(`⚠ データなし: ${ticker}`);
      return null;
    }

    const closes = history
      .filter((d) => typeof d.close === "number")
      .map((d) => d.close);

    if (closes.length < 15) {
      console.error(`⚠ データ不足: ${ticker}`);
      return null;
    }

    const rsi = RSI.calculate({ values: closes, period: 14 });
    return rsi.at(-1) || null;
  } catch (e) {
    console.error(`RSI error: ${ticker}`, e.message);
    return null;
  }
}

function calcRSI(prices, period = 14) {
  if (!Array.isArray(prices) || prices.length < period + 1) {
    return null;
  }

  let gains = 0, losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function ema(values, period) {
    if (!Array.isArray(values) || values.length < period) return null;

    const k = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((a, b) => a + b) / period;

    for (let i = period; i < values.length; i++) {
        ema = values[i] * k + ema * (1 - k);
    }

    return ema;
}

function calcMACD(prices) {
    if (prices.length < 35) return null;

    const ema12 = ema(prices, 12);
    const ema26 = ema(prices, 26);

    const macd = ema12 - ema26;

    // シグナル（9EMA）
    const macdList = [];

    for (let i = 0; i < prices.length; i++) {
        const e12 = ema(prices.slice(0, i + 1), 12);
        const e26 = ema(prices.slice(0, i + 1), 26);
        if (e12 && e26) macdList.push(e12 - e26);
    }

    const signal = ema(macdList, 9);

    return { macd, signal, histogram: macd - signal };
}

function calcBollingerBands(prices, period = 20, multiplier = 2) {
    if (prices.length < period) return null;

    const slice = prices.slice(-period);
    const mean = slice.reduce((a, b) => a + b) / period;

    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const std = Math.sqrt(variance);

    return {
        middle: mean,
        upper: mean + multiplier * std,
        lower: mean - multiplier * std,
        width: (multiplier * std * 2) / mean // バンド幅（トレンド判断に有効）
    };
}

function calcIndicators(prices) {
    return {
        rsi: calcRSI(prices),
        macd: calcMACD(prices),
        bb: calcBollingerBands(prices)
    };
}

// ----------------------------------------------------
// ★ MA と出来高増加率も取得
async function getTrendInfo(ticker) {
  try {
    const data = await yahooFinance.chart(ticker, {
      period1: "2024-01-01",
      interval: "1d",
    });

    const history = data.quotes || [];
    if (!Array.isArray(history) || history.length < 30) {
      console.error(`⚠ データ不足(MA): ${ticker}`);
      return null;
    }

    const closes = history.map((d) => d.close);
    const volumes = history.map((d) => d.volume);

    const ma5 = calcMA(closes, 5);
    const ma25 = calcMA(closes, 25);

    // 出来高前日比（％）
    const volToday = volumes.at(-1);
    const volYesterday = volumes.at(-2);
    const volumeChange = volYesterday
      ? ((volToday - volYesterday) / volYesterday) * 100
      : null;

    return { closes, ma5, ma25, volumeChange };
  } catch (e) {
    console.error(`Trend error: ${ticker}`, e.message);
    return null;
  }
}

// ----------------------------------------------------
// ★ トレードシグナル生成
// ----------------------------------------------------
function getSignal({ rsi, ma5, ma25, volumeChange }) {
  if (!rsi) return "データ不足";

  // 逆張り + 順張りハイブリッド
  if (rsi < 30 && ma5 > ma25 && volumeChange > 20)
    return "🔥 強い買い（リバ＋短期上昇＋出来高）";

  if (rsi < 30) return "買い候補（売られすぎ）";
  if (rsi > 70) return "売り注意（変わりすぎ）";
  if (ma5 > ma25) return "上昇トレンド（押し目買い）";

  return "弱い（ノートレ推奨）";
}

// ----------------------------------------------------
// ★ メイン処理
// ----------------------------------------------------
async function main() {
  console.log("\n===== 📈 今日のトレードシグナル =====\n");

  for (const ticker of tickers) {
    const rsi = await getRSI(ticker);
    const trend = await getTrendInfo(ticker);

    if (!trend) {
      console.log(`${ticker} → データ不足`);
      continue;
    }

    const { closes, ma5, ma25, volumeChange } = trend;

    const signal = getSignal({ rsi, ma5, ma25, volumeChange });

    console.log(
      `${ticker}\n` +
        `  現在値: ${closes.at(-1)?.toFixed(2) ?? "N/A"}\n` +
        `  RSI: ${rsi?.toFixed(2) ?? "N/A"}\n` +
        `  MA5: ${ma5?.toFixed(2) ?? "N/A"}\n` +
        `  MA25: ${ma25?.toFixed(2) ?? "N/A"}\n` +
        `  出来高変化: ${volumeChange?.toFixed(1) ?? "N/A"}%\n` +
        `→ シグナル: ${signal}\n`
    );

    console.log(calcIndicators(closes));
  }
}

main();
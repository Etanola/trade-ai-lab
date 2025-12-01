import YahooFinance from "yahoo-finance2"; 
const yahooFinance = new YahooFinance({suppressNotices: ["yahooSurvey"]});
import { RSI } from "technicalindicators";

const tickers = [
  "6920.T", "8035.T", "4751.T",
  "3994.T", "4165.T", "3681.T", "4382.T"
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

    return { ma5, ma25, volumeChange };
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

    const { ma5, ma25, volumeChange } = trend;

    const signal = getSignal({ rsi, ma5, ma25, volumeChange });

    console.log(
      `${ticker}\n` +
        `  RSI: ${rsi?.toFixed(2) ?? "N/A"}\n` +
        `  MA5: ${ma5?.toFixed(2) ?? "N/A"}\n` +
        `  MA25: ${ma25?.toFixed(2) ?? "N/A"}\n` +
        `  出来高変化: ${volumeChange?.toFixed(1) ?? "N/A"}%\n` +
        `→ シグナル: ${signal}\n`
    );
  }
}

main();
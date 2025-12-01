import YahooFinance from "yahoo-finance2"; 
const yahooFinance = new YahooFinance({suppressNotices: ["yahooSurvey"]});
import { RSI } from "technicalindicators";

const tickers = [
  "6920.T", "8035.T", "4751.T",
  "3994.T", "4165.T", "3681.T", "4382.T"
];

async function getRSI(ticker) {
  try {
    // 過去データを取得（14日分以上）
    const history = await yahooFinance.chart(ticker, {
      period1: "2024-01-01",
      interval: "1d"
    });

    let closingPrices = [];
    if (Array.isArray(history?.quotes)) {
      closingPrices = history.quotes.map(d => d.close);
    } else if (Array.isArray(history)) {
      closingPrices = history.map(d => d.close);
    } else {
      console.error("Unexpected history format for", ticker, history);
      return null;
    }

    const rsiValues = RSI.calculate({
      values: closingPrices,
      period: 14
    });

    const latest = rsiValues[rsiValues.length - 1];
    return latest;
  } catch (e) {
    console.error("RSI error:", ticker, e);
    return null;
  }
}

function getSignal(rsi) {
  if (rsi === null) return "ERROR";

  if (rsi < 30) return "💹 BUY（売られすぎ）";
  if (rsi > 70) return "🔻 SELL（買われすぎ）";
  return "HOLD";
}

async function main() {
  console.log("📈 今日の売買シグナル\n");

  for (const ticker of tickers) {
    const rsi = await getRSI(ticker);
    const signal = getSignal(rsi);
    console.log(`${ticker} → RSI ${rsi?.toFixed(2)} → ${signal}`);
  }
}

main();
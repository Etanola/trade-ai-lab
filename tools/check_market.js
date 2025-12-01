import YahooFinance from "yahoo-finance2"; 
const yahooFinance = new YahooFinance({suppressNotices: ["yahooSurvey"]});

const WATCH = [
  "6920.T", "8035.T", "4751.T",
  "3994.T", "4165.T", "3681.T", "4382.T"
];

async function checkMarket() {
  console.log("=== Market Check (Node.js) ===");

  for (const code of WATCH) {
    try {
      const quote = await yahooFinance.quote(code);

      const price = quote.regularMarketPrice;
      const change = quote.regularMarketChangePercent;

      console.log(
        `${code}: ${price} JPY (${change?.toFixed(2)}%)`
      );
    } catch (err) {
      console.error(code, "→ 取得エラー:", err.message);
    }
  }
}

checkMarket();

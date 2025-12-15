// bot.js
// CoincheckでBTC/JPYを自動売買する超シンプルBot（テストモード付き）

import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import crypto from "crypto";

// ========= 設定 =========
const CONFIG = {
  pair: "btc_jpy",
  // 1回の注文額（JPY）
  orderSizeJpy: 3000,
  // 総ポジション上限（JPY）
  maxPositionJpy: 10000,
  // ポジションとみなす最小額
  minPositionJpy: 2000,
  // 最小注文額
  minOrderJpy: 2000,
  // ループ間隔（ミリ秒）: ここでは1分おき
  loopIntervalMs: 60_000,
  // テストモード true: 発注せずログだけ、false: 実際に発注
  testMode: true,
  // インジケータ用に使うローソク足の設定（BinanceのBTCUSDTを利用）
  binanceSymbol: "BTCJPY",
  binanceInterval: "1m",
  binanceLimit: 200
};

// ========= Coincheck APIクライアント =========

const API_KEY = process.env.COINCHECK_API_KEY;
const API_SECRET = process.env.COINCHECK_API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error("ERROR: COINCHECK_API_KEY / COINCHECK_API_SECRET が .env に設定されていません。");
  process.exit(1);
}

function coincheckRequest(method, path, body = {}) {
  const nonce = Date.now().toString();

  const bodyString = method.toUpperCase() === "GET"
    ? ""
    : JSON.stringify(body);

  const message = nonce + "https://coincheck.com" + path + bodyString; // ← 順番が重要！

  const signature = crypto
    .createHmac("sha256", API_SECRET)
    .update(message)
    .digest("hex");

  return axios({
    method,
    url: "https://coincheck.com" + path,
    headers: {
      "ACCESS-KEY": API_KEY,
      "ACCESS-NONCE": nonce,
      "ACCESS-SIGNATURE": signature
    },
    params: method.toUpperCase() === "GET" ? body : undefined,
    data: method.toUpperCase() === "GET" ? undefined : body
  });
}

async function getTicker() {
  const res = await axios.get("https://coincheck.com/api/ticker");
  return res.data; // last, bid, ask, high, low, volume, timestamp
}

async function getBalance() {
  const res = await coincheckRequest("GET", "/api/accounts/balance");
  // { jpy: "1234.0", btc: "0.123", ... }
  return {
    jpy: Number(res.data.jpy),
    btc: Number(res.data.btc)
  };
}

// 指値買い（rate=価格、amount=BTC数量）
async function placeBuyLimit(rate, amountBtc) {
  const body = {
    pair: CONFIG.pair,
    order_type: "buy",
    rate: String(rate),
    amount: amountBtc.toFixed(6)
  };
  return coincheckRequest("POST", "/api/exchange/orders", body);
}

// 指値売り（rate=価格、amount=BTC数量）
async function placeSellLimit(rate, amountBtc) {
  const body = {
    pair: CONFIG.pair,
    order_type: "sell",
    rate: String(rate),
    amount: amountBtc.toFixed(6)
  };
  return coincheckRequest("POST", "/api/exchange/orders", body);
}

// ========= Binance（ローソク足取得用・指標計算のための価格データ） =========

// ※ 売買はCoincheck (BTC/JPY)、指標計算はBinance (BTC/USDT) の1分足で行う簡易実装。
// 方向感はかなり近いので、最初の検証フェーズ用には十分。

async function getCandlesFromBinance(
  symbol = CONFIG.binanceSymbol,
  interval = CONFIG.binanceInterval,
  limit = CONFIG.binanceLimit
) {
  const url = "https://api.binance.com/api/v3/klines";
  const res = await axios.get(url, {
    params: { symbol, interval, limit },
    timeout: 10_000
  });

  // [ openTime, open, high, low, close, volume, ... ]
  return res.data.map(c => ({
    open: Number(c[1]),
    high: Number(c[2]),
    low: Number(c[3]),
    close: Number(c[4]),
    volume: Number(c[5])
  }));
}

// ========= インジケータ計算 =========

function sma(values, period) {
  if (!Array.isArray(values) || values.length < period) return null;
  const slice = values.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

function calcRSI(closes, period = 14) {
  const len = closes.length;
  if (len < period + 1) return null;

  let gains = 0;
  let losses = 0;
  // 直近 period 本の差分で計算
  for (let i = len - period; i < len; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff; // diff は負
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function ema(values, period) {
  if (!Array.isArray(values) || values.length < period) return null;
  const k = 2 / (period + 1);

  // 最初の period 本のSMAを初期値として使う
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
  }
  return prev;
}

function calcMACD(closes) {
  if (closes.length < 26) return null;

  // 最新値のMACD
  const macdValue = ema(closes, 12) - ema(closes, 26);

  // シグナル用に過去MACDシリーズを作る
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
  const hist = macdValue - signal;

  // 直前のMACDとシグナル（クロス判定用）
  const prevMacd = macdSeries[macdSeries.length - 2] ?? null;
  const prevSignal =
    macdSeries.length > 1
      ? ema(macdSeries.slice(0, macdSeries.length - 1), 9)
      : null;

  return {
    macd: macdValue,
    signal,
    histogram: hist,
    prevMacd,
    prevSignal
  };
}

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

export function buildIndicators(candles) {
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

// ========= 売買ロジック =========

function shouldBuy(ind) {
  if (
    !ind ||
    ind.ma5 === null ||
    ind.ma20 === null ||
    ind.rsi === null ||
    !ind.macd
  ) {
    return false;
  }

  const { macd, signal, prevMacd, prevSignal } = ind.macd;
  if (
    macd === null ||
    signal === null ||
    prevMacd === null ||
    prevSignal === null
  ) {
    return false;
  }

  const crossUp = prevMacd <= prevSignal && macd > signal;

  return ind.ma5 > ind.ma20 && ind.rsi > 30 && ind.rsi < 70 && crossUp;
}

function shouldSell(ind) {
  if (
    !ind ||
    ind.ma5 === null ||
    ind.ma20 === null ||
    ind.rsi === null ||
    !ind.macd
  ) {
    return false;
  }

  const { macd, signal, prevMacd, prevSignal } = ind.macd;
  if (
    macd === null ||
    signal === null ||
    prevMacd === null ||
    prevSignal === null
  ) {
    return false;
  }

  const crossDown = prevMacd >= prevSignal && macd < signal;

  return crossDown || ind.rsi >= 70 || ind.ma5 < ind.ma20;
}

// ========= 発注ラッパ（テストモード対応） =========

async function safeBuy(jpyBalance, price) {
  // 実際に使う注文額
  const orderJpy = Math.min(
    CONFIG.orderSizeJpy,
    jpyBalance,
    CONFIG.maxPositionJpy
  );

  if (orderJpy < CONFIG.minOrderJpy) {
    console.log("[BUY] 注文額が小さすぎるためスキップ:", orderJpy);
    return;
  }

  const amountBtc = orderJpy / price;

  if (CONFIG.testMode) {
    console.log(
      `[TEST BUY] 約 ${orderJpy} JPY 分のBTCを購入 (${amountBtc.toFixed(
        6
      )} BTC @ ${price})`
    );
    return;
  }

  console.log(
    `[BUY] 約 ${orderJpy} JPY 分のBTCを購入 (${amountBtc.toFixed(
      6
    )} BTC @ ${price})`
  );
  await sendDiscord(`[BUY] 約 ${orderJpy} JPY 分のBTCを購入 (${amountBtc.toFixed(
    6
  )} BTC @ ${price})`);
  const res = await placeBuyLimit(price, amountBtc);
  console.log("BUY result:", res.data);
}

async function safeSell(btcBalance, price) {
  // 全額ではなく、上限をかけてもOK。ここでは全ポジションを売る
  if (btcBalance <= 0) {
    console.log("[SELL] BTC残高がないためスキップ");
    return;
  }

  const jpyValue = btcBalance * price;
  if (jpyValue < CONFIG.minPositionJpy) {
    console.log("[SELL] ポジション額が小さすぎるためスキップ:", jpyValue);
    return;
  }

  if (CONFIG.testMode) {
    console.log(
      `[TEST SELL] 全ポジション売却: ${btcBalance.toFixed(
        6
      )} BTC @ ${price} (約 ${jpyValue} JPY)`
    );
    return;
  }

  console.log(
    `[SELL] 全ポジション売却: ${btcBalance.toFixed(
      6
    )} BTC @ ${price} (約 ${jpyValue} JPY)`
  );
  await sendDiscord(`[SELL] 全ポジション売却: ${btcBalance.toFixed(
    6
  )} BTC @ ${price} (約 ${jpyValue} JPY)`);
  const res = await placeSellLimit(price, btcBalance);
  console.log("SELL result:", res.data);
}

async function sendDiscord(message) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    console.error("DISCORD_WEBHOOK_URL が設定されていません");
    return;
  }

  try {
    await axios.post(url, {
      content: message
    });
  } catch (err) {
    console.error("Discord通知エラー:", err.message);
  }
}

// ========= メインループ =========

async function runOnce() {
  try {
    console.log("===== Bot tick =====", new Date().toISOString());

    const [ticker, candles, balance] = await Promise.all([
      getTicker(),
      getCandlesFromBinance(),
      getBalance()
    ]);

    const price = Number(ticker.last); // BTC/JPY 現在値
    const indicators = buildIndicators(candles);

    console.log(
      `現在価格: ${price} JPY, 残高: JPY=${balance.jpy}, BTC=${balance.btc}`
    );
    console.log(
      `MA5=${indicators.ma5?.toFixed(2)}, MA20=${indicators.ma20?.toFixed(
        2
      )}, RSI=${indicators.rsi?.toFixed(2)}`
    );

    if (indicators.macd) {
      console.log(
        `MACD=${indicators.macd.macd?.toFixed(
          4
        )}, SIGNAL=${indicators.macd.signal?.toFixed(4)}`
      );
    }

    const positionJpy = balance.btc * price;
    console.log(`推定ポジション評価額: 約 ${positionJpy.toFixed(0)} JPY`);

    const buySignal = shouldBuy(indicators);
    const sellSignal = shouldSell(indicators);
    
    if (buySignal) {
      await sendDiscord(`🟢 Buy signal detected ${price}`);
    }
    if (sellSignal) {
      await sendDiscord(`🔴 Sell signal detected ${price}`);
    }

    console.log(`buySignal=${buySignal}, sellSignal=${sellSignal}`);

    if (positionJpy < CONFIG.minPositionJpy && buySignal) {
      await safeBuy(balance.jpy, price);
    } else if (positionJpy >= CONFIG.minPositionJpy && sellSignal) {
      await safeSell(balance.btc, price);
    } else {
      console.log("→ 今回はノートレード");
    }
  } catch (err) {
    console.error("runOnce error:", err.message || err);
  }
}

// 一定間隔でループ
async function main() {
  console.log("=== Coincheck BTC/JPY Bot 起動 ===");
  console.log("テストモード:", CONFIG.testMode);
  await runOnce();
  setInterval(runOnce, CONFIG.loopIntervalMs);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

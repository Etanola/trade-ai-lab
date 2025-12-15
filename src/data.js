import { safeFetch } from "./safeApi.js";
import 'dotenv/config';

const BASE_URL = "https://api.binance.com/api/v3/klines";
const COINCHECK_TRADES = "https://coincheck.com/api/trades";

const intervalMs = {
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000
};

const EXCHANGE = (process.env.EXCHANGE || "binance").toLowerCase();

function normalizePairForCoincheck(symbol) {
  // Accept BTC/JPY, BTCJPY, btc_jpy etc.
  let s = String(symbol).toLowerCase();
  s = s.replace(/\s+/g, "");
  if (s.includes('/')) s = s.replace('/', '_');
  if (!s.includes('_')) s = s.replace(/(btc)(jpy)/, '$1_$2');
  return s;
}

function aggregateTradesToCandles(trades, interval) {
  const ms = intervalMs[interval];
  const buckets = new Map();

  for (const t of trades) {
    const ts = Math.floor(new Date(t.created_at).getTime());
    const bucket = Math.floor(ts / ms) * ms;
    const price = Number(t.rate);
    const vol = Number(t.amount);

    if (!buckets.has(bucket)) {
      buckets.set(bucket, { timestamp: bucket, open: price, high: price, low: price, close: price, volume: vol });
    } else {
      const b = buckets.get(bucket);
      b.high = Math.max(b.high, price);
      b.low = Math.min(b.low, price);
      b.close = price;
      b.volume += vol;
    }
  }

  const sorted = Array.from(buckets.values()).sort((a, b) => a.timestamp - b.timestamp);
  return sorted;
}

async function getCandlesCoincheck(symbol = "btc_jpy", interval = "1m", requiredCount = 5000) {
  const pair = normalizePairForCoincheck(symbol);
  // Coincheck public trades endpoint returns recent trades; we aggregate them into candles.
  // Note: Coincheck does not provide a native OHLCV endpoint, so deep historical data may be limited.

  const res = await safeFetch(COINCHECK_TRADES, { pair });
  const data = res.data || [];

  // Expect data to be array of {id, amount, rate, order_type, created_at}
  const candles = aggregateTradesToCandles(data, interval);

  // If we don't have enough bars, pad with empty bars up to requiredCount using last known close
  if (candles.length === 0) return [];

  const lastClose = candles[candles.length - 1].close;
  const ms = intervalMs[interval];
  const result = [];
  // Build contiguous candle series ending at last candle timestamp
  const end = candles[candles.length - 1].timestamp;
  for (let i = requiredCount - 1; i >= 0; i--) {
    const ts = end - i * ms;
    const found = candles.find(c => c.timestamp === ts);
    if (found) result.push(found);
    else result.push({ timestamp: ts, open: lastClose, high: lastClose, low: lastClose, close: lastClose, volume: 0 });
  }

  return result;
}

export async function getCandles(
  symbol = "BTCJPY",
  interval = "1m",
  requiredCount = 5000
) {
  if (EXCHANGE === 'coincheck') {
    return await getCandlesCoincheck(symbol, interval, requiredCount);
  }

  const all = [];
  let endTime = Date.now();

  while (all.length < requiredCount) {
    const res = await safeFetch(BASE_URL, {
      symbol,
      interval,
      endTime,
      limit: 1000
    });

    const data = res.data;
    if (data.length === 0) break;

    all.unshift(...data);

    endTime = data[0][0] - intervalMs[interval];

    if (endTime < 0) break;
  }

  const trimmed = all.slice(-requiredCount);

  return trimmed.map(c => ({
    timestamp: c[0],
    open: Number(c[1]),
    high: Number(c[2]),
    low: Number(c[3]),
    close: Number(c[4]),
    volume: Number(c[5])
  }));
}

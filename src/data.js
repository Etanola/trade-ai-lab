import { safeFetch } from "./safeApi.js";

const BASE_URL = "https://api.binance.com/api/v3/klines";

const intervalMs = {
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000
};

export async function getCandles(
  symbol = "BTCJPY",
  interval = "1m",
  requiredCount = 5000
) {
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

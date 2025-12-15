import axios from "axios";

// Binance limit: 6000 requests / min ≒ 100 req/sec
// → 10ms に 1回のペースなら安全
const MIN_INTERVAL = 15; // 15ms間隔（約66 req/sec）

let lastCall = 0;

export async function safeFetch(url, params = {}) {
  const now = Date.now();
  const diff = now - lastCall;

  if (diff < MIN_INTERVAL) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL - diff));
  }

  lastCall = Date.now();

  return axios.get(url, { params });
}

import { getCandles } from "../src/data.js";

async function main() {
  const interval = process.argv[2] || "1m";
  const count = Number(process.argv[3] || 200);

  console.log(`EXCHANGE=${process.env.EXCHANGE || 'binance'} | fetching ${count} ${interval} bars for BTC/JPY`);

  const candles = await getCandles("BTCJPY", interval, count);
  console.log(`received ${candles.length} candles`);
  if (candles.length > 0) {
    console.log('first:', candles[0]);
    console.log('last :', candles[candles.length - 1]);
  }
}

main().catch(e => {
  console.error('error', e.message || e);
  process.exit(1);
});

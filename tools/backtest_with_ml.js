import fs from 'fs';
import { getCandles } from '../src/data.js';
import { calculateAllIndicators } from '../src/indicators.js';
import { runBacktestDetailed } from '../src/backtestCore.js';

// This script loads predictions from tmp/predictions.json and runs backtest using them as entry signals

async function main(){
	const pair = 'BTCUSDT';
	const interval = '5m';
	const count = 5000;
	const candles = await getCandles(pair, interval, count);
	const indicators = calculateAllIndicators(candles);

	// use out-of-sample predictions when available
	const predsPath = './tmp/predictions_oos.json';
	const preds = fs.existsSync(predsPath) ? JSON.parse(fs.readFileSync(predsPath,'utf8')) : JSON.parse(fs.readFileSync('./tmp/predictions.json','utf8'));
	const predMap = new Map(preds.map(p=>[p.timestamp, p]));

	// define strategy wrapper using preds
	const strategy = {
		name: 'ml_pred_strategy',
		positionFraction: 0.2,
		shouldBuy(ind, price, index){
			if(!ind) return false;
			const t = candles[index].timestamp;
			const p = predMap.get(t);
			return p && p.pred === 1;
		},
		shouldSell(ind, price, entry, peak){
			// simple exit: MACD cross or stop loss 3% or take profit 6%
			if(price <= entry * 0.97) return true;
			if(price >= entry * 1.06) return true;
			if(ind && ind.macd && ind.macd.macd < ind.macd.signal) return true;
			return false;
		}
	};

	const res = runBacktestDetailed(candles, 200000, strategy);
	fs.writeFileSync('./tmp/ml_backtest.json', JSON.stringify(res, null, 2));
	console.log('ML backtest done. Final Equity', res.finalEquity, 'Trades', res.trades);
}

main().catch(e=>{console.error(e); process.exit(1)});

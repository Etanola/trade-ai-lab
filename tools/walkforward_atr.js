import fs from 'fs';
import { getCandles } from '../src/data.js';
import { runBacktestDetailed } from '../src/backtestCore.js';
import { createATRBreakoutStrategy } from '../src/strategy_atr.js';
import { calcMetrics, summarizeMetrics } from '../src/metrics.js';

async function main(){
	const backtestCfg = JSON.parse(fs.readFileSync('./config/backtest.json','utf8'));
	const testCfg = backtestCfg.tests[0];
	console.log('Walk-forward on', testCfg.label, testCfg.pair, testCfg.interval);

	const candles = await getCandles(testCfg.pair === 'BTCJPY' ? 'BTCUSDT' : testCfg.pair, testCfg.interval, Math.min(15000, testCfg.count));
	const n = candles.length;
	if (n < 500) { console.error('Not enough candles for walk-forward'); process.exit(1); }

	const trainRatio = 0.6;
	const testRatio = 0.2;
	const trainLen = Math.floor(n * trainRatio);
	const testLen = Math.floor(n * testRatio);
	const step = testLen;

	const atrMults = [1.0, 1.5, 2.0];
	const volMaxList = [0.05, 0.1];
	const stopAtrList = [1.0, 1.5];

	const folds = [];

	for (let start = 0; start + trainLen + testLen <= n; start += step) {
		const trainStart = start;
		const trainEnd = start + trainLen; // exclusive
		const testStart = trainEnd;
		const testEnd = trainEnd + testLen; // exclusive

		console.log(`\nFold: train [${trainStart},${trainEnd}) test [${testStart},${testEnd})`);

		const trainCandles = candles.slice(trainStart, trainEnd);
		const testCandles = candles.slice(testStart, testEnd);

		// grid search on training
		const trainResults = [];
		for (const k of atrMults) {
			for (const vol of volMaxList) {
				for (const stopAtr of stopAtrList) {
					const strat = createATRBreakoutStrategy({ atrMultiplier: k, volatilityMax: vol, stopAtr, positionFraction: 0.2 });
					const res = runBacktestDetailed(trainCandles, backtestCfg.initialCapital, strat);
					const metrics = calcMetrics(res.equitySeries, res.tradesLog, backtestCfg.initialCapital) || { CAGR: -Infinity };
					trainResults.push({ params: {k,vol,stopAtr}, stratName: strat.name, res, metrics });
				}
			}
		}

		// choose best by CAGR (fallback to final equity)
		trainResults.sort((a,b)=> (b.metrics.CAGR || -Infinity) - (a.metrics.CAGR || -Infinity));
		const best = trainResults[0];
		console.log(' Best on train:', best.stratName, 'CAGR', best.metrics.CAGR, 'Final', best.res.finalEquity, 'Trades', best.res.trades);

		// evaluate on test
		const bestStrat = createATRBreakoutStrategy({ atrMultiplier: best.params.k, volatilityMax: best.params.vol, stopAtr: best.params.stopAtr, positionFraction: 0.2 });
		const testRes = runBacktestDetailed(testCandles, backtestCfg.initialCapital, bestStrat);
		const testMetrics = calcMetrics(testRes.equitySeries, testRes.tradesLog, backtestCfg.initialCapital) || {};

		console.log(' Test result Final', testRes.finalEquity, 'Trades', testRes.trades);
		console.log(summarizeMetrics(testMetrics));

		folds.push({ trainRange: [trainStart, trainEnd], testRange: [testStart, testEnd], bestParams: best.params, trainMetrics: best.metrics, testMetrics, trainRes: best.res, testRes });
	}

	fs.writeFileSync('./tmp/walkforward_atr.json', JSON.stringify(folds, null, 2));
	console.log('\nSaved walkforward results to tmp/walkforward_atr.json');
}

main().catch(e=>{console.error(e); process.exit(1)});

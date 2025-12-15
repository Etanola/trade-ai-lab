// simple performance metric helpers

export function calcMetrics(equitySeries, tradesLog, initialCapital) {
  if (!equitySeries || equitySeries.length === 0) return null;

  const startEq = equitySeries[0].equity;
  const endEq = equitySeries[equitySeries.length - 1].equity;
  const totalReturn = endEq / startEq - 1;

  const startT = equitySeries[0].t;
  const endT = equitySeries[equitySeries.length - 1].t;
  const years = Math.max(1e-9, (endT - startT) / (1000 * 60 * 60 * 24 * 365));

  const CAGR = Math.pow(endEq / startEq, 1 / years) - 1;

  // max drawdown
  let peak = -Infinity;
  let maxDD = 0;
  for (const p of equitySeries) {
    if (p.equity > peak) peak = p.equity;
    const dd = (peak - p.equity) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  // returns per period for sharpe
  const rets = [];
  for (let i = 1; i < equitySeries.length; i++) {
    rets.push(equitySeries[i].equity / equitySeries[i - 1].equity - 1);
  }

  const avgRet = rets.reduce((a, b) => a + b, 0) / Math.max(1, rets.length);
  const sd = Math.sqrt(rets.reduce((a, b) => a + Math.pow(b - avgRet, 2), 0) / Math.max(1, rets.length));

  // estimate periods per year from timestamps
  let meanDt = 0;
  if (equitySeries.length >= 2) {
    let sumDt = 0;
    for (let i = 1; i < equitySeries.length; i++) sumDt += equitySeries[i].t - equitySeries[i - 1].t;
    meanDt = sumDt / (equitySeries.length - 1) / 1000; // seconds
  } else meanDt = 60;

  const periodsPerYear = (365 * 24 * 3600) / Math.max(1, meanDt);

  const sharpe = sd > 0 ? (avgRet * Math.sqrt(periodsPerYear)) / sd : 0;

  // trade-level stats
  const wins = tradesLog.filter(t => t.profit > 0);
  const losses = tradesLog.filter(t => t.profit <= 0);
  const grossProfit = wins.reduce((a, b) => a + b.profit, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + (b.profit || 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? (losses.reduce((a, b) => a + (b.profit || 0), 0) / losses.length) : 0;
  const winRate = tradesLog.length ? (wins.length / tradesLog.length) : 0;
  const expectancy = avgWin * winRate + Math.abs(avgLoss) * (1 - winRate) * -1;

  return {
    totalReturn,
    CAGR,
    maxDrawdown: maxDD,
    sharpe,
    profitFactor,
    trades: tradesLog.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    avgWin,
    avgLoss,
    expectancy
  };
}

export function summarizeMetrics(m) {
  return {
    CAGR: (m.CAGR * 100).toFixed(2) + '%',
    TotalReturn: (m.totalReturn * 100).toFixed(2) + '%',
    MaxDD: (m.maxDrawdown * 100).toFixed(2) + '%',
    Sharpe: m.sharpe.toFixed(2),
    ProfitFactor: m.profitFactor === Infinity ? 'Inf' : m.profitFactor.toFixed(2),
    Trades: m.trades,
    WinRate: (m.winRate * 100).toFixed(2) + '%',
    Expectancy: m.expectancy.toFixed(2)
  };
}

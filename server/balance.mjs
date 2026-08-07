/**
 * Aggregate KO/win runs for balance monitoring (admin).
 * @param {Array<{ monthsPlayed: number, peakCash?: number, peakDebt?: number, finalCash?: number, difficulty?: string, outcome?: string, sector?: string }>} runs
 */
export function computeBalance(runs) {
  const n = runs.length;
  if (n === 0) {
    return {
      n: 0,
      avgMonths: 0,
      medianMonths: 0,
      pctGe12: 0,
      pctGe24: 0,
      wins: 0,
      losses: 0,
      unknownOutcome: 0,
      buckets: { "1-3": 0, "4-6": 0, "7-12": 0, "13-23": 0, "24+": 0 },
      avgPeakCash: 0,
      avgPeakDebt: 0,
      avgFinalCash: 0,
      byDifficulty: {},
      bySector: {},
    };
  }

  const months = runs.map((r) => r.monthsPlayed).sort((a, b) => a - b);
  const sum = months.reduce((s, m) => s + m, 0);
  const mid = Math.floor(months.length / 2);
  const medianMonths =
    months.length % 2 === 1
      ? months[mid]
      : Math.round(((months[mid - 1] + months[mid]) / 2) * 10) / 10;

  const buckets = { "1-3": 0, "4-6": 0, "7-12": 0, "13-23": 0, "24+": 0 };
  for (const m of months) {
    if (m <= 3) buckets["1-3"] += 1;
    else if (m <= 6) buckets["4-6"] += 1;
    else if (m <= 12) buckets["7-12"] += 1;
    else if (m <= 23) buckets["13-23"] += 1;
    else buckets["24+"] += 1;
  }

  let wins = 0;
  let losses = 0;
  let unknownOutcome = 0;
  for (const r of runs) {
    if (r.outcome === "won") wins += 1;
    else if (r.outcome === "lost") losses += 1;
    else unknownOutcome += 1;
  }

  const avg = (key) => {
    const vals = runs.map((r) => Number(r[key])).filter((v) => Number.isFinite(v));
    if (!vals.length) return 0;
    return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100;
  };

  /** @type {Record<string, { n: number, avgMonths: number, pctGe12: number }>} */
  const byDifficulty = {};
  /** @type {Record<string, { n: number, avgMonths: number }>} */
  const bySector = {};

  const bump = (map, key, monthsPlayed) => {
    if (!key) return;
    const cur = map[key] ?? { n: 0, sum: 0, ge12: 0 };
    cur.n += 1;
    cur.sum += monthsPlayed;
    if (monthsPlayed >= 12) cur.ge12 += 1;
    map[key] = cur;
  };

  /** @type {Record<string, { n: number, sum: number, ge12: number }>} */
  const diffAcc = {};
  /** @type {Record<string, { n: number, sum: number, ge12: number }>} */
  const sectorAcc = {};
  for (const r of runs) {
    bump(diffAcc, r.difficulty || "unknown", r.monthsPlayed);
    bump(sectorAcc, r.sector || "unknown", r.monthsPlayed);
  }
  for (const [k, v] of Object.entries(diffAcc)) {
    byDifficulty[k] = {
      n: v.n,
      avgMonths: Math.round((v.sum / v.n) * 10) / 10,
      pctGe12: Math.round((1000 * v.ge12) / v.n) / 10,
    };
  }
  for (const [k, v] of Object.entries(sectorAcc)) {
    bySector[k] = {
      n: v.n,
      avgMonths: Math.round((v.sum / v.n) * 10) / 10,
    };
  }

  return {
    n,
    avgMonths: Math.round((sum / n) * 10) / 10,
    medianMonths,
    pctGe12: Math.round((1000 * months.filter((m) => m >= 12).length) / n) / 10,
    pctGe24: Math.round((1000 * months.filter((m) => m >= 24).length) / n) / 10,
    wins,
    losses: losses + unknownOutcome,
    unknownOutcome,
    buckets,
    avgPeakCash: avg("peakCash"),
    avgPeakDebt: avg("peakDebt"),
    avgFinalCash: avg("finalCash"),
    byDifficulty,
    bySector,
  };
}

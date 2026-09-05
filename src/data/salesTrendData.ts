import { Store, DailySalesRecord } from '../types';

/**
 * Generates deterministic 30-day sales history leading up to the current date,
 * capturing realistic seasonal cycles, marketing campaign bumps, and clear store growth.
 */
export function generate30DaySalesHistory(store: Store, currentProductsTotalRevenue?: number): {
  records: DailySalesRecord[];
  total30dRevenue: number;
  total30dOrders: number;
  avgDailyRevenue: number;
  growthRatePercent: number; // e.g. +31.4%
  peakRecord: DailySalesRecord;
  lowestRecord: DailySalesRecord;
} {
  const baseRevenue = currentProductsTotalRevenue && currentProductsTotalRevenue > 0 
    ? currentProductsTotalRevenue 
    : (store.dailyRevenue || 300000);
  
  const baseOrders = store.dailyOrders || Math.round(baseRevenue / 1850);
  const currencyMultiplier = store.currency === '€' || store.currency === '$' ? 1 : 1;

  // Multipliers for each of the 30 days (day 1 = 30 days ago, day 30 = today)
  // Reflects an upward growth trend with natural fluctuations, weekend lifts, and promo spikes
  const growthCurve = [
    0.68, 0.71, 0.70, 0.74, 0.79, 0.83, 0.77, // Week 1 (Base lift)
    0.75, 0.78, 0.81, 0.86, 0.91, 0.94, 0.87, // Week 2 (Promo launch)
    0.85, 0.88, 0.92, 0.90, 0.96, 1.02, 0.93, // Week 3 (Organic rank improvement)
    0.91, 0.94, 0.98, 1.01, 1.05, 1.08, 0.99, 1.03, 1.00 // Week 4 & final days (Peak growth)
  ];

  const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const fullMonthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  // Current anchor date (e.g. Sept 4, 2026)
  const anchorDate = new Date(2026, 8, 4); // Sept 4, 2026

  const rawRecords: DailySalesRecord[] = [];
  let peakIndex = -1;
  let maxRev = -1;

  for (let i = 0; i < 30; i++) {
    const daysAgo = 29 - i;
    const targetDate = new Date(anchorDate);
    targetDate.setDate(targetDate.getDate() - daysAgo);

    const dayNum = targetDate.getDate();
    const monthIndex = targetDate.getMonth();
    const dayLabel = `${dayNum} ${monthNames[monthIndex]}`;
    const fullDate = `${dayNum} ${fullMonthNames[monthIndex]} 2026`;
    const dateFormatted = `${String(dayNum).padStart(2, '0')}.${String(monthIndex + 1).padStart(2, '0')}`;

    const multiplier = growthCurve[i];
    const dailyRev = Math.round(baseRevenue * multiplier);
    const dailyOrd = Math.max(1, Math.round(baseOrders * multiplier));
    const dailyUnits = Math.round(dailyOrd * 1.15);
    const marginRate = 0.32 + (i * 0.001); // Slight margin improvement as scale grows
    const dailyProfit = Math.round(dailyRev * marginRate);
    const adSpend = Math.round(dailyRev * (0.075 + (i % 3 === 0 ? 0.02 : 0)));
    const drr = Number(((adSpend / dailyRev) * 100).toFixed(1));

    if (dailyRev > maxRev) {
      maxRev = dailyRev;
      peakIndex = i;
    }

    rawRecords.push({
      date: dateFormatted,
      dayLabel,
      fullDate,
      revenue: dailyRev,
      orders: dailyOrd,
      units: dailyUnits,
      profit: dailyProfit,
      adSpend,
      drr,
      growthVsAvg: 0, // Calculated below
    });
  }

  // Mark peak
  if (peakIndex >= 0) {
    rawRecords[peakIndex].isPeak = true;
  }

  // Calculate totals and averages
  const total30dRevenue = rawRecords.reduce((sum, r) => sum + r.revenue, 0);
  const total30dOrders = rawRecords.reduce((sum, r) => sum + r.orders, 0);
  const avgDailyRevenue = Math.round(total30dRevenue / rawRecords.length);

  // Growth rate: compare first 5 days avg to last 5 days avg
  const first5Avg = rawRecords.slice(0, 5).reduce((s, r) => s + r.revenue, 0) / 5;
  const last5Avg = rawRecords.slice(-5).reduce((s, r) => s + r.revenue, 0) / 5;
  const growthRatePercent = Number((((last5Avg - first5Avg) / first5Avg) * 100).toFixed(1));

  // Compute growthVsAvg for each point
  const records = rawRecords.map((r) => ({
    ...r,
    growthVsAvg: Number((((r.revenue - avgDailyRevenue) / avgDailyRevenue) * 100).toFixed(1)),
  }));

  const sortedByRev = [...records].sort((a, b) => b.revenue - a.revenue);
  const peakRecord = sortedByRev[0];
  const lowestRecord = sortedByRev[sortedByRev.length - 1];

  return {
    records,
    total30dRevenue,
    total30dOrders,
    avgDailyRevenue,
    growthRatePercent,
    peakRecord,
    lowestRecord,
  };
}

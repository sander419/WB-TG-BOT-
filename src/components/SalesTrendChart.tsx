import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  ShoppingBag,
  Sparkles,
  ArrowUpRight,
  Target,
  Zap,
  Layers,
  Activity,
  BarChart3,
  SlidersHorizontal,
} from 'lucide-react';
import { Store, DailySalesRecord } from '../types';
import { generate30DaySalesHistory } from '../data/salesTrendData';

interface Props {
  currentStore: Store;
  productsTotalRevenue?: number;
}

type TimeframeOption = '7d' | '14d' | '30d';
type MetricView = 'revenue' | 'profit' | 'orders' | 'drr';
type ChartStyle = 'line' | 'area';

interface EnhancedSalesRecord extends DailySalesRecord {
  sma7Revenue?: number;
  sma7Profit?: number;
}

export const SalesTrendChart: React.FC<Props> = ({ currentStore, productsTotalRevenue }) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');
  const [metricView, setMetricView] = useState<MetricView>('revenue');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('line');
  const [showAverageLine, setShowAverageLine] = useState<boolean>(true);
  const [showTrendLine, setShowTrendLine] = useState<boolean>(true);

  // Generate 30-day sales history based on store data and active catalog revenue
  const salesHistory = useMemo(() => {
    return generate30DaySalesHistory(currentStore, productsTotalRevenue);
  }, [currentStore, productsTotalRevenue]);

  // Compute 7-day Simple Moving Average (SMA-7) for trend visualization
  const recordsWithSMA: EnhancedSalesRecord[] = useMemo(() => {
    const records = salesHistory.records;
    return records.map((record, index) => {
      // Calculate 7-day moving window
      const startIdx = Math.max(0, index - 6);
      const windowSlice = records.slice(startIdx, index + 1);
      const smaRev = Math.round(
        windowSlice.reduce((sum, item) => sum + item.revenue, 0) / windowSlice.length
      );
      const smaProf = Math.round(
        windowSlice.reduce((sum, item) => sum + item.profit, 0) / windowSlice.length
      );

      return {
        ...record,
        sma7Revenue: smaRev,
        sma7Profit: smaProf,
      };
    });
  }, [salesHistory]);

  // Filter records by selected timeframe
  const displayRecords = useMemo(() => {
    if (timeframe === '7d') return recordsWithSMA.slice(-7);
    if (timeframe === '14d') return recordsWithSMA.slice(-14);
    return recordsWithSMA;
  }, [recordsWithSMA, timeframe]);

  // Dynamic statistics for active timeframe
  const timeframeStats = useMemo(() => {
    const totalRev = displayRecords.reduce((sum, r) => sum + r.revenue, 0);
    const totalOrd = displayRecords.reduce((sum, r) => sum + r.orders, 0);
    const totalProfit = displayRecords.reduce((sum, r) => sum + r.profit, 0);
    const avgRev = Math.round(totalRev / displayRecords.length);
    const avgOrd = Math.round(totalOrd / displayRecords.length);
    const avgDrr = (
      displayRecords.reduce((sum, r) => sum + r.drr, 0) / displayRecords.length
    ).toFixed(1);

    const firstVal = displayRecords[0]?.revenue || 1;
    const lastVal = displayRecords[displayRecords.length - 1]?.revenue || 1;
    const growthPercent = Number((((lastVal - firstVal) / firstVal) * 100).toFixed(1));

    const peak = [...displayRecords].sort((a, b) => b.revenue - a.revenue)[0];
    const lowest = [...displayRecords].sort((a, b) => a.revenue - b.revenue)[0];

    return {
      totalRev,
      totalOrd,
      totalProfit,
      avgRev,
      avgOrd,
      avgDrr,
      growthPercent,
      peak,
      lowest,
    };
  }, [displayRecords]);

  // Format currency value
  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) {
      return `${(val / 1_000_000).toFixed(2)} млн ${currentStore.currency}`;
    }
    return `${val.toLocaleString('ru-RU')} ${currentStore.currency}`;
  };

  // Format compact Y-axis tick
  const formatYAxis = (val: number) => {
    if (metricView === 'drr') return `${val}%`;
    if (metricView === 'orders') return `${val} зак`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${Math.round(val / 1_000)}k`;
    return `${val}`;
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: EnhancedSalesRecord = payload[0].payload;
      const aov = Math.round(data.revenue / (data.orders || 1));

      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 shadow-xl text-white text-xs space-y-2 min-w-[220px] z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              {data.fullDate}
            </span>
            {data.isPeak && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500 text-slate-950 uppercase tracking-wider">
                🏆 Пик 30д
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Выручка за день:</span>
              <span className="font-bold text-indigo-300 text-sm">
                {data.revenue.toLocaleString('ru-RU')} {currentStore.currency}
              </span>
            </div>

            {data.sma7Revenue && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Тренд (SMA-7):</span>
                <span className="font-semibold text-indigo-200">
                  {data.sma7Revenue.toLocaleString('ru-RU')} {currentStore.currency}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Оформлено заказов:</span>
              <span className="font-semibold text-white">
                {data.orders} ({data.units} шт)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Средний чек (AOV):</span>
              <span className="font-semibold text-slate-300">
                {aov.toLocaleString('ru-RU')} {currentStore.currency}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Чистая прибыль:</span>
              <span className="font-bold text-emerald-400">
                +{data.profit.toLocaleString('ru-RU')} {currentStore.currency}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">ДРР (Реклама):</span>
              <span className={`font-semibold ${data.drr > 10 ? 'text-amber-400' : 'text-slate-300'}`}>
                {data.drr}% ({data.adSpend.toLocaleString('ru-RU')} {currentStore.currency})
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>К средней за 30 дней:</span>
            <span
              className={`font-bold flex items-center ${
                data.growthVsAvg >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {data.growthVsAvg >= 0 ? `+${data.growthVsAvg}%` : `${data.growthVsAvg}%`}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Color configurations based on selected metric
  const metricConfigs = {
    revenue: {
      dataKey: 'revenue',
      trendKey: 'sma7Revenue',
      stroke: '#6366f1', // Indigo 600
      trendStroke: '#818cf8', // Indigo 400
      fillStart: '#6366f1',
      fillEnd: '#a5b4fc',
      label: 'Выручка',
      unit: currentStore.currency,
    },
    profit: {
      dataKey: 'profit',
      trendKey: 'sma7Profit',
      stroke: '#10b981', // Emerald 500
      trendStroke: '#34d399', // Emerald 400
      fillStart: '#10b981',
      fillEnd: '#6ee7b7',
      label: 'Прибыль',
      unit: currentStore.currency,
    },
    orders: {
      dataKey: 'orders',
      trendKey: undefined,
      stroke: '#0284c7', // Sky 600
      trendStroke: '#38bdf8', // Sky 400
      fillStart: '#0284c7',
      fillEnd: '#7dd3fc',
      label: 'Заказы',
      unit: 'зак.',
    },
    drr: {
      dataKey: 'drr',
      trendKey: undefined,
      stroke: '#f59e0b', // Amber 500
      trendStroke: '#fbbf24', // Amber 400
      fillStart: '#f59e0b',
      fillEnd: '#fde68a',
      label: 'ДРР рекламы',
      unit: '%',
    },
  };

  const activeConfig = metricConfigs[metricView];

  return (
    <div
      id="sales-trend-chart-module"
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4"
    >
      {/* Top Header: Title, Growth Tag & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Динамика выручки и тренд продаж (Line Chart)
            </h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+{timeframeStats.growthPercent}% за 30 дней</span>
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Ежедневный срез выручки магазина <strong className="text-slate-700">{currentStore.name}</strong> за последние {timeframe === '7d' ? '7 дней' : timeframe === '14d' ? '14 дней' : '30 дней'}
          </p>
        </div>

        {/* Action Controls: Chart Style, Metrics & Timeframe */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Style Toggle: Line vs Area */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-2xs">
            <button
              id="chart-style-line"
              onClick={() => setChartStyle('line')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                chartStyle === 'line'
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Линия</span>
            </button>
            <button
              id="chart-style-area"
              onClick={() => setChartStyle('area')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                chartStyle === 'area'
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Область</span>
            </button>
          </div>

          {/* Metric Selector Pills */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-2xs">
            <button
              id="chart-metric-revenue"
              onClick={() => setMetricView('revenue')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                metricView === 'revenue'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Выручка
            </button>
            <button
              id="chart-metric-profit"
              onClick={() => setMetricView('profit')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                metricView === 'profit'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Прибыль
            </button>
            <button
              id="chart-metric-orders"
              onClick={() => setMetricView('orders')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                metricView === 'orders'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-sky-700'
              }`}
            >
              Заказы
            </button>
            <button
              id="chart-metric-drr"
              onClick={() => setMetricView('drr')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                metricView === 'drr'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-amber-800'
              }`}
            >
              ДРР %
            </button>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-2xs">
            <button
              id="chart-timeframe-7d"
              onClick={() => setTimeframe('7d')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timeframe === '7d'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 дн.
            </button>
            <button
              id="chart-timeframe-14d"
              onClick={() => setTimeframe('14d')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timeframe === '14d'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              14 дн.
            </button>
            <button
              id="chart-timeframe-30d"
              onClick={() => setTimeframe('30d')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timeframe === '30d'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 дней
            </button>
          </div>

          {/* SMA Trend Line Toggle */}
          {activeConfig.trendKey && (
            <button
              onClick={() => setShowTrendLine(!showTrendLine)}
              className={`px-2 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                showTrendLine
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
              title="Показать/скрыть скользящую среднюю тренда SMA-7"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Тренд SMA-7</span>
            </button>
          )}

          {/* Average Baseline Reference Line Toggle */}
          <button
            onClick={() => setShowAverageLine(!showAverageLine)}
            className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
              showAverageLine
                ? 'bg-slate-100 border-slate-300 text-slate-800'
                : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
            }`}
            title="Показать/скрыть среднюю линию"
          >
            <Target className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ср. линия</span>
          </button>
        </div>
      </div>

      {/* Snapshot Summary Cards (30-Day Store Growth Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block mb-0.5">
            Суммарная выручка ({timeframe === '30d' ? '30 дн.' : timeframe}):
          </span>
          <div className="text-base font-extrabold text-slate-900 tracking-tight">
            {formatCurrency(timeframeStats.totalRev)}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
            <ArrowUpRight className="w-3 h-3" /> +{timeframeStats.growthPercent}% за период
          </span>
        </div>

        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block mb-0.5">
            Среднедневная выручка:
          </span>
          <div className="text-base font-extrabold text-indigo-700 tracking-tight">
            {timeframeStats.avgRev.toLocaleString('ru-RU')} {currentStore.currency}/день
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            ~{timeframeStats.avgOrd} заказов в сутки
          </span>
        </div>

        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block mb-0.5">
            Рекордный день:
          </span>
          <div className="text-base font-extrabold text-slate-900 tracking-tight truncate">
            {timeframeStats.peak?.revenue.toLocaleString('ru-RU')} {currentStore.currency}
          </div>
          <span className="text-[10px] text-amber-800 font-semibold block mt-0.5">
            🏆 {timeframeStats.peak?.fullDate}
          </span>
        </div>

        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block mb-0.5">
            Чистая прибыль за период:
          </span>
          <div className="text-base font-extrabold text-emerald-600 tracking-tight">
            {formatCurrency(timeframeStats.totalProfit)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            ДРР: <strong className="text-slate-700">{timeframeStats.avgDrr}%</strong>
          </span>
        </div>
      </div>

      {/* Main Recharts LineChart / AreaChart Container */}
      <div className="h-76 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartStyle === 'line' ? (
            <LineChart
              data={displayRecords}
              margin={{ top: 12, right: 16, left: -10, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

              <XAxis
                dataKey="dayLabel"
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fontSize: 11, fill: '#64748b' }}
                interval={timeframe === '30d' ? 4 : timeframe === '14d' ? 1 : 0}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={formatYAxis}
                domain={['auto', 'auto']}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Baseline Average Reference Line */}
              {showAverageLine && metricView === 'revenue' && (
                <ReferenceLine
                  y={timeframeStats.avgRev}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{
                    value: `Ср. ${Math.round(timeframeStats.avgRev / 1000)}k`,
                    fill: '#64748b',
                    fontSize: 10,
                    position: 'insideTopLeft',
                  }}
                />
              )}

              {/* 7-Day Moving Average Trend Line (Smoothed trajectory) */}
              {showTrendLine && activeConfig.trendKey && (
                <Line
                  type="monotone"
                  dataKey={activeConfig.trendKey}
                  name="Тренд (SMA-7)"
                  stroke={activeConfig.trendStroke}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                />
              )}

              {/* Primary Daily Metric Line */}
              <Line
                type="monotone"
                dataKey={activeConfig.dataKey}
                name={activeConfig.label}
                stroke={activeConfig.stroke}
                strokeWidth={3}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.isPeak) {
                    return (
                      <circle
                        key={`peak-${payload.date}`}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="#f59e0b"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    );
                  }
                  return (
                    <circle
                      key={`dot-${payload.date}`}
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill={activeConfig.stroke}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  );
                }}
                activeDot={{
                  r: 7,
                  fill: activeConfig.stroke,
                  stroke: '#ffffff',
                  strokeWidth: 2.5,
                }}
              />
            </LineChart>
          ) : (
            <AreaChart
              data={displayRecords}
              margin={{ top: 12, right: 16, left: -10, bottom: 4 }}
            >
              <defs>
                <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeConfig.fillStart} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={activeConfig.fillEnd} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

              <XAxis
                dataKey="dayLabel"
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fontSize: 11, fill: '#64748b' }}
                interval={timeframe === '30d' ? 4 : timeframe === '14d' ? 1 : 0}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={formatYAxis}
                domain={['auto', 'auto']}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Baseline Average Reference Line */}
              {showAverageLine && metricView === 'revenue' && (
                <ReferenceLine
                  y={timeframeStats.avgRev}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{
                    value: `Ср. ${Math.round(timeframeStats.avgRev / 1000)}k`,
                    fill: '#64748b',
                    fontSize: 10,
                    position: 'insideTopLeft',
                  }}
                />
              )}

              <Area
                type="monotone"
                dataKey={activeConfig.dataKey}
                stroke={activeConfig.stroke}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#metricGradient)"
                activeDot={{
                  r: 6,
                  fill: activeConfig.stroke,
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Dynamic AI Summary & Legend Footer */}
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-indigo-900 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="truncate">
            <strong className="font-bold">AI Тренд-анализ:</strong> Выручка демонстрирует устойчивый подъем (+{timeframeStats.growthPercent}% за 30 дней) за счет органического продвижения в ТОП и автоматической балансировки цен.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> Дневная выручка
          </span>
          {showTrendLine && activeConfig.trendKey && (
            <span className="flex items-center gap-1 text-[11px] text-indigo-600 font-medium">
              <span className="w-2 h-0.5 bg-indigo-400 border-t border-dashed border-indigo-600"></span> Тренд SMA-7
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

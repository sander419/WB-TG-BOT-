import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Sparkles, 
  Zap, 
  Package, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Layers, 
  DollarSign, 
  Percent, 
  HelpCircle,
  Play,
  Activity,
  BarChart2,
  Gauge,
  Sliders,
  Check
} from 'lucide-react';
import { Product, StoreAlert, Store, OpportunityItem, StoreHealthScore } from '../types';
import { SalesTrendChart } from './SalesTrendChart';
import { AiPulseWidget } from './AiPulseWidget';
import { CardHoverAnimation } from './CardHoverAnimation';

interface Props {
  currentStore: Store;
  stores?: Store[];
  onSelectStore?: (store: Store) => void;
  products: Product[];
  alerts: StoreAlert[];
  opportunities: OpportunityItem[];
  onOpenAuditModal: () => void;
  onOpenDigest: () => void;
  onSelectProduct: (p: Product) => void;
  onApplyOpportunity: (opp: OpportunityItem) => void;
  onSwitchTab: (tab: 'telegram' | 'catalog' | 'seo' | 'repricer' | 'launch' | 'alerts' | 'architecture' | 'reviews') => void;
  onInspectContentHealth?: (p: Product) => void;
}

export const MainDashboard: React.FC<Props> = ({
  currentStore,
  stores,
  onSelectStore,
  products,
  alerts,
  opportunities,
  onOpenAuditModal,
  onOpenDigest,
  onSelectProduct,
  onApplyOpportunity,
  onSwitchTab,
  onInspectContentHealth,
}) => {
  // Compute deterministic Business Engine KPIs
  const totalRevenue = products.reduce((sum, p) => sum + p.dailyRevenue, 0);
  const totalOrders = products.reduce((sum, p) => sum + p.dailyOrders, 0);
  const avgMargin = products.length 
    ? Math.round(products.reduce((sum, p) => sum + p.margin, 0) / products.length) 
    : 32;
  const estimatedProfit = Math.round(totalRevenue * (avgMargin / 100));
  const avgDrr = products.length 
    ? (products.reduce((sum, p) => sum + p.drr, 0) / products.length).toFixed(1) 
    : '8.4';

  // Deterministic Store Health Score Breakdown (Section 47)
  const healthScore: StoreHealthScore = {
    overall: 78,
    status: 'stable',
    metrics: {
      salesTrend: { score: 84, label: 'Динамика продаж', trend: 'up', note: '+14.2% к вчерашнему дню' },
      profitability: { score: 88, label: 'Маржинальность', trend: 'up', note: 'Средняя маржа 32%' },
      adEfficiency: { score: 62, label: 'Эффективность рекламы', trend: 'down', note: 'ДРР по платью 14.8% выше нормы' },
      inventoryHealth: { score: 75, label: 'Здоровье остатков', trend: 'down', note: '3 товара закончатся через 3-5 дней' },
      searchVisibility: { score: 68, label: 'Позиции в поиске', trend: 'down', note: 'Товар №7 выпал с #7 на #26' },
      customerReputation: { score: 94, label: 'Рейтинг и отзывы', trend: 'up', note: '4.86 звёзд (91% 5★)' },
    },
    positives: [
      'Выручка растет 4-й день подряд за счет шелковых платьев и ножей',
      'Высокая лояльность покупателей и 91% пятизвездочных отзывов',
      'Стабильная юнит-экономика с маржинальностью выше 30%',
    ],
    negatives: [
      'Потеря позиций рюкзака из-за демпинга конкурента (-240 ₽)',
      'Риск out-of-stock по увлажнителям на складе Коледино (хватит на 2 дня)',
      '18 мусорных минус-фраз в авторекламе раздувают рекламный бюджет',
    ],
  };

  const criticalIssues = [
    {
      id: 'issue-1',
      title: 'Товар №7 (Рюкзак городской) теряет позиции',
      detail: 'Снизился с #7 до #26 (-19 позиций) в выдаче WB из-за демпинга конкурента UrbanPacker (-240 ₽)',
      badge: 'Критично',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      actionText: 'Выровнять цену до 1 990 ₽',
      productId: 'prod-7',
    },
    {
      id: 'issue-2',
      title: 'Товар №3 (Увлажнитель воздуха) заканчивается',
      detail: 'Остаток на Коледино всего 14 шт (хватит на 2 дня). Риск потери ранжирования',
      badge: 'Out-of-Stock',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      actionText: 'Забронировать поставку 100 шт',
      productId: 'prod-3',
    },
    {
      id: 'issue-3',
      title: 'Кампания АРК «Платье» расходует бюджет выше нормы',
      detail: 'Фактический ДРР 14.8% при норме 10.0%. Обнаружено 18 нерелевантных минус-фраз',
      badge: 'Реклама / ДРР',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      actionText: 'Исключить нерелевантные фразы',
      productId: 'prod-1',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner: Store Status + Quick WOW Audit Button */}
      <CardHoverAnimation 
        scale={1.01}
        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-slate-900">
                МОЙ МАГАЗИН:
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Всё под контролем
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">•</span>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                {currentStore.name} ({currentStore.warehouseFbo})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              AI Orchestrator непрерывно мониторит API {currentStore.marketplace.toUpperCase()}, анализирует позиции, демпинг и остатки.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <button
            id="main-dash-audit-btn"
            onClick={onOpenAuditModal}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>⚡ WOW-Аудит первого подключения</span>
          </button>

          <button
            id="main-dash-digest-btn"
            onClick={onOpenDigest}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            title="Утренняя сводка"
          >
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Сводка утра</span>
          </button>
        </div>
      </CardHoverAnimation>

      {/* AI Pulse & Orchestrator Activity Widget */}
      <CardHoverAnimation scale={1.01}>
        <AiPulseWidget 
          storeName={currentStore.name}
          currentStore={currentStore}
          stores={stores}
          onSelectStore={onSelectStore}
          onOpenAudit={onOpenAuditModal} 
        />
      </CardHoverAnimation>

      {/* KPI Stats Grid (Computed by Business Engine) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Revenue */}
        <CardHoverAnimation scale={1.02} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Продажи сегодня</span>
            <span className="text-emerald-600 font-bold flex items-center text-[11px]">
              <ArrowUpRight className="w-3.5 h-3.5" /> +14.2%
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {totalRevenue.toLocaleString('ru-RU')} {currentStore.currency}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalOrders} оформленных заказов
          </p>
        </CardHoverAnimation>

        {/* Profit */}
        <CardHoverAnimation scale={1.02} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Чистая прибыль</span>
            <span className="text-emerald-600 font-bold flex items-center text-[11px]">
              <ArrowUpRight className="w-3.5 h-3.5" /> +9.1%
            </span>
          </div>
          <div className="text-xl font-extrabold text-emerald-600 tracking-tight">
            {estimatedProfit.toLocaleString('ru-RU')} {currentStore.currency}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            После логистики и комиссий
          </p>
        </CardHoverAnimation>

        {/* Avg Margin */}
        <CardHoverAnimation scale={1.02} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Средняя маржа</span>
            <span className="text-slate-600 font-medium text-[11px]">цель: 30%</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {avgMargin}%
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            ✓ Выше целевого порога
          </p>
        </CardHoverAnimation>

        {/* DRR */}
        <CardHoverAnimation scale={1.02} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>ДРР (Реклама)</span>
            <span className="text-amber-600 font-bold text-[11px]">норма: ≤10%</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {avgDrr}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Расход рекламы в доле чека
          </p>
        </CardHoverAnimation>

        {/* Attention items count */}
        <CardHoverAnimation scale={1.02} className="col-span-2 md:col-span-1 bg-amber-50/70 border border-amber-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold mb-1">
            <span>Требуют внимания</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-amber-900 tracking-tight">
            3 сигнала
          </div>
          <p className="text-[11px] text-amber-700 mt-1">
            Подготовлены решения
          </p>
        </CardHoverAnimation>
      </div>

      {/* 30-Day Daily Sales Revenue Trend Chart (Recharts) */}
      <CardHoverAnimation scale={1.01}>
        <SalesTrendChart 
          currentStore={currentStore} 
          productsTotalRevenue={totalRevenue} 
        />
      </CardHoverAnimation>

      {/* Store Health Score Breakdown (Section 47: 78 / 100 with Reasons) */}
      <CardHoverAnimation scale={1.01} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex flex-col items-center justify-center font-extrabold">
              <span className="text-lg leading-none">{healthScore.overall}</span>
              <span className="text-[9px] text-indigo-500">из 100</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Store Health Score: {healthScore.overall} / 100
                </h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Стабильно
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Агрегированный показатель операционного здоровья магазина на основе 6 независимых метрик
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>3 сильных фактора</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>3 точки коррекции</span>
            </div>
          </div>
        </div>

        {/* Health dimensions grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
          {Object.entries(healthScore.metrics).map(([key, item]) => {
            const isContentMetric = key === 'content';
            return (
              <CardHoverAnimation 
                key={key} 
                scale={1.03}
                onClick={() => {
                  if (isContentMetric && onInspectContentHealth) {
                    const target = products.find(p => p.id === 'prod-7') || products[0];
                    if (target) onInspectContentHealth(target);
                  }
                }}
                className={`p-3 rounded-xl bg-slate-50 border border-slate-200 transition-all ${
                  isContentMetric ? 'cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 hover:shadow-2xs group' : ''
                }`}
                title={isContentMetric ? 'Нажмите, чтобы запустить автоматический Content Health аудит' : undefined}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={`font-medium text-[11px] truncate ${isContentMetric ? 'text-indigo-700 group-hover:text-indigo-900 font-bold' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                  <span className={`font-bold text-xs flex items-center ${item.trend === 'up' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {item.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {item.score}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                  <div 
                    className={`h-full rounded-full ${item.score >= 80 ? 'bg-emerald-500' : item.score >= 65 ? 'bg-indigo-500' : 'bg-amber-500'}`} 
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-tight flex items-center justify-between">
                  <span>{item.note}</span>
                  {isContentMetric && <span className="text-indigo-600 text-[9px] font-bold">Аудит →</span>}
                </p>
              </CardHoverAnimation>
            );
          })}
        </div>
      </CardHoverAnimation>

      {/* Two Columns: 3 Attention Items + Opportunity Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Attention Items (Section 18) */}
        <CardHoverAnimation scale={1.01} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <h3 className="font-bold text-slate-900 text-sm">
                  ⚠️ Требуют внимания прямо сейчас (3)
                </h3>
              </div>
              <button
                onClick={() => onSwitchTab('architecture')}
                className="text-xs text-purple-700 font-bold bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                title="Перейти к Diagnostics Engine & Audit Log"
              >
                <Activity className="w-3.5 h-3.5 text-purple-600" />
                <span>Diagnostics Engine</span>
              </button>
            </div>

            <div className="space-y-3">
              {criticalIssues.map((issue) => {
                const targetProduct = products.find((p) => p.id === issue.productId);
                return (
                  <CardHoverAnimation
                    key={issue.id}
                    scale={1.02}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {issue.title}
                      </h4>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border shrink-0 ${issue.badgeColor}`}>
                        {issue.badge}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                      {issue.detail}
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                      <span className="text-[11px] text-indigo-700 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI решение готово
                      </span>

                      <button
                        onClick={() => {
                          if (targetProduct) onSelectProduct(targetProduct);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <span>{issue.actionText}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </CardHoverAnimation>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Правила защиты: <strong className="text-slate-700">Цена не ниже 1 500 ₽</strong></span>
            <button
              onClick={() => onSwitchTab('alerts')}
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Все алерты магазина</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </CardHoverAnimation>

        {/* Column 2: Opportunity Engine (Section 25 - What can we do to make more money?) */}
        <CardHoverAnimation scale={1.01} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h3 className="font-bold text-slate-900 text-sm">
                  💡 Opportunity Engine: Как заработать больше денег?
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                +302 800 ₽ потенциал
              </span>
            </div>

            <div className="space-y-3">
              {opportunities.map((opp) => (
                <CardHoverAnimation
                  key={opp.id}
                  scale={1.02}
                  className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50/60 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-xs font-bold text-slate-900">
                      {opp.title}
                    </h4>
                    <span className="text-xs font-extrabold text-emerald-700 shrink-0">
                      {opp.potentialImpact}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    {opp.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-emerald-100">
                    <span className="text-[11px] text-slate-500">
                      Прогноз окупаемости: <strong className="text-slate-800">3-5 дней</strong>
                    </span>

                    <button
                      onClick={() => onApplyOpportunity(opp)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{opp.actionTitle}</span>
                    </button>
                  </div>
                </CardHoverAnimation>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>LLM не выдумывает цифры — расчеты ведет <strong className="text-slate-700">Business Engine</strong></span>
            <button
              onClick={() => onSwitchTab('architecture')}
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Архитектурный инспектор</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </CardHoverAnimation>
      </div>

      {/* Quick Access to Specialized Operations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <CardHoverAnimation
          scale={1.03}
          onClick={() => onSwitchTab('telegram')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-all text-left group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            AI-Менеджер в Telegram
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Управление магазином обычным языком без таблиц
          </p>
        </CardHoverAnimation>

        <CardHoverAnimation
          scale={1.03}
          onClick={() => onSwitchTab('reviews')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-all text-left group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <HelpCircle className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            Review Intelligence
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Кластеризация брака и улучшение продукта по отзывам
          </p>
        </CardHoverAnimation>

        <CardHoverAnimation
          scale={1.03}
          onClick={() => onSwitchTab('launch')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-all text-left group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Play className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            Product Launch Workflow
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            16 шагов вывода новинки в ТОП за 30 дней
          </p>
        </CardHoverAnimation>

        <CardHoverAnimation
          scale={1.03}
          onClick={() => onSwitchTab('architecture')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-all text-left group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Layers className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            Системная архитектура
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Оркестратор, коннекторы, правила и аудит-лог
          </p>
        </CardHoverAnimation>
      </div>
    </div>
  );
};

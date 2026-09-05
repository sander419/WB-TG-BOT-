import React, { useState, useMemo } from 'react';
import { 
  Radar, 
  ShieldAlert, 
  TrendingDown, 
  TrendingUp, 
  Star, 
  Sparkles, 
  Zap, 
  AlertTriangle, 
  ArrowRight, 
  Check, 
  RefreshCw, 
  Sliders, 
  Eye, 
  Clock, 
  DollarSign, 
  Flame, 
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  BellRing,
  Bot,
  Layers,
  History,
  Info
} from 'lucide-react';
import { Product, CompetitorIntelRecord, CompetitorIntelItem, CompetitorEventLog } from '../types';
import { 
  getCompetitorIntelForProduct, 
  getAllCompetitorIntelRecords, 
  getCompetitorIntelSummary, 
  getCompetitorLiveEvents 
} from '../data/competitorIntelligenceData';

interface Props {
  products: Product[];
  onUpdateProductPrice?: (productId: string, newPrice: number) => void;
  onAskAi?: (product: Product, customPrompt?: string) => void;
  onApplyBatchPriceFix?: (updates: { productId: string; newPrice: number }[]) => void;
}

export const CompetitorIntelligenceWidget: React.FC<Props> = ({
  products,
  onUpdateProductPrice,
  onAskAi,
  onApplyBatchPriceFix,
}) => {
  // Settings & Threshold state
  const [criticalThreshold, setCriticalThreshold] = useState<number>(12); // %
  const [autoNotifyEnabled, setAutoNotifyEnabled] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'single' | 'matrix' | 'events'>('single');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'safe'>('all');
  const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);

  // Compute all records dynamically based on current products and threshold
  const intelRecords = useMemo(() => {
    return getAllCompetitorIntelRecords(products, criticalThreshold);
  }, [products, criticalThreshold]);

  const summary = useMemo(() => {
    return getCompetitorIntelSummary(intelRecords);
  }, [intelRecords]);

  const liveEvents = useMemo(() => {
    return getCompetitorLiveEvents(products);
  }, [products]);

  // Currently selected record
  const currentRecord = useMemo(() => {
    return intelRecords.find(r => r.productId === selectedProductId) || intelRecords[0];
  }, [intelRecords, selectedProductId]);

  const currentProduct = useMemo(() => {
    return products.find(p => p.id === currentRecord?.productId) || products[0];
  }, [products, currentRecord]);

  // Filtered records for matrix view
  const filteredRecords = useMemo(() => {
    if (filterSeverity === 'all') return intelRecords;
    return intelRecords.filter(r => r.dumpingSeverity === filterSeverity);
  }, [intelRecords, filterSeverity]);

  const handleRefreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleApplySinglePrice = (productId: string, newPrice: number) => {
    if (onUpdateProductPrice) {
      onUpdateProductPrice(productId, newPrice);
      setAppliedActions(prev => ({ ...prev, [productId]: true }));
    }
  };

  const handleApplyAllCriticalFixes = () => {
    const criticalList = intelRecords
      .filter(r => r.dumpingSeverity === 'critical')
      .map(r => ({
        productId: r.productId,
        newPrice: r.maxDumpingCompetitor.suggestedActionPrice,
      }));

    if (onApplyBatchPriceFix && criticalList.length > 0) {
      onApplyBatchPriceFix(criticalList);
      const newApplied: Record<string, boolean> = {};
      criticalList.forEach(c => { newApplied[c.productId] = true; });
      setAppliedActions(prev => ({ ...prev, ...newApplied }));
    } else if (onUpdateProductPrice && criticalList.length > 0) {
      criticalList.forEach(c => onUpdateProductPrice(c.productId, c.newPrice));
      const newApplied: Record<string, boolean> = {};
      criticalList.forEach(c => { newApplied[c.productId] = true; });
      setAppliedActions(prev => ({ ...prev, ...newApplied }));
    }
  };

  const handleAskAiAboutIntel = (record: CompetitorIntelRecord) => {
    if (onAskAi && currentProduct) {
      const comp1 = record.topCompetitors[0];
      const comp2 = record.topCompetitors[1];
      const comp3 = record.topCompetitors[2];

      const prompt = 
        `Проведи анализ модуля Competitor Intelligence по товару «${record.productName}» (SKU: ${record.productSku}). ` +
        `Наша цена: ${record.ourPrice} ₽ (Себестоимость: ${record.costPrice} ₽, мин. маржа: ${record.minSafePrice} ₽). ` +
        `\n\nДанные 3 главных конкурентов:\n` +
        `1. ${comp1.brand} (Ранг #1): Цена ${comp1.priceShift.currentPrice} ₽ (динамика: ${comp1.priceShift.deltaRub} ₽ / ${comp1.priceShift.deltaPercent}%), Рейтинг: ${comp1.ratingShift.currentRating} ★ (${comp1.ratingShift.currentReviews} отзывов, +${comp1.ratingShift.reviewsDelta}/нед)\n` +
        `2. ${comp2.brand} (Ранг #2): Цена ${comp2.priceShift.currentPrice} ₽, Рейтинг: ${comp2.ratingShift.currentRating} ★\n` +
        `3. ${comp3.brand} (Ранг #3): Цена ${comp3.priceShift.currentPrice} ₽, Рейтинг: ${comp3.ratingShift.currentRating} ★\n\n` +
        `Статус демпинга: ${record.dumpingSeverity === 'critical' ? 'КРИТИЧЕСКИЙ ДЕМПИНГ' : 'Умеренный'}. ` +
        `Упущенная выручка в неделю: ${record.estimatedWeeklyRevenueLoss} ₽. ` +
        `Какую оптимальную стратегию ценообразования, рекламы и работы со складом выбрать, чтобы защитить маржинальность и восстановить позиции?`;

      onAskAi(currentProduct, prompt);
    }
  };

  if (!currentRecord) return null;

  return (
    <div id="competitor-intelligence-widget" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-0 transition-all">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Radar className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
                Competitor Intelligence
              </span>
              <span className="text-xs text-slate-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Live-агрегация цен и рейтингов ТОП-3</span>
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-indigo-200 font-medium">
                Отслеживается: <strong>{summary.totalCompetitorsTracked} конкурентов</strong> в нише
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Конкурентная разведка & Защита от демпинга
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Автоматический мониторинг 3 главных конкурентов по каждому товару: детекция резких просадок цен, динамика рейтинга и превентивные AI-стратегии защиты маржинальности.
            </p>
          </div>

          {/* Quick Actions & Settings Trigger */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              id="intel-refresh-btn"
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Обновить данные с парсеров"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isRefreshing ? 'Сканирование...' : 'Обновить'}</span>
            </button>

            <button
              id="intel-settings-toggle"
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showSettingsDrawer
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Порог демпинга: {criticalThreshold}%</span>
            </button>
          </div>
        </div>

        {/* Global Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-4 border-t border-indigo-900/60 text-xs">
          <div className="bg-slate-800/60 border border-rose-500/30 rounded-xl p-3">
            <span className="text-[11px] text-rose-300 font-semibold block flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Критический демпинг
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-rose-400">{summary.criticalDumpingCount} SKU</span>
              <span className="text-[10px] text-rose-300">в красной зоне</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-amber-500/30 rounded-xl p-3">
            <span className="text-[11px] text-amber-300 font-semibold block flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Умеренное давление
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-amber-300">{summary.warningDumpingCount} SKU</span>
              <span className="text-[10px] text-amber-200/80">требуют внимания</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-emerald-500/30 rounded-xl p-3">
            <span className="text-[11px] text-emerald-300 font-semibold block flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              В безопасности / Лидеры
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-emerald-400">{summary.safeCount} SKU</span>
              <span className="text-[10px] text-emerald-300">маржа защищена</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-indigo-500/30 rounded-xl p-3">
            <span className="text-[11px] text-indigo-300 font-semibold block flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-indigo-400" />
              Риск упущенной выручки
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-white font-mono">
                {summary.totalAtRiskRevenue > 0 ? `~${summary.totalAtRiskRevenue.toLocaleString('ru-RU')} ₽` : '0 ₽'}
              </span>
              <span className="text-[10px] text-indigo-200">/ нед.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Threshold Configurator Drawer (Collapsible) */}
      {showSettingsDrawer && (
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Настройки чувствительности радара демпинга
              </h4>
              <p className="text-[11px] text-slate-500">
                Задайте процентное отклонение цены конкурента вниз от вашей текущей розницы, при котором система объявляет тревогу и генерирует план контрмер.
              </p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Порог тревоги:</span>
                <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
                  {[8, 12, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setCriticalThreshold(pct)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        criticalThreshold === pct
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoNotifyEnabled}
                    onChange={(e) => setAutoNotifyEnabled(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                  <span>Push-уведомления при демпинге</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical Alert Bar if any critical dumping active */}
      {summary.criticalDumpingCount > 0 && (
        <div className="bg-rose-50 border-b border-rose-200 p-3.5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse-subtle">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                  Обнаружен критический демпинг в {summary.criticalDumpingCount} товарах!
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-bold">
                  Главный инициатор: {summary.mostAggressiveCompetitor}
                </span>
              </div>
              <p className="text-xs text-rose-700 mt-0.5">
                Конкуренты снизили цены до -{summary.avgCompetitorDiscountPercent}%. Прогноз потерь при бездействии: <strong>~{summary.totalAtRiskRevenue.toLocaleString('ru-RU')} ₽ в неделю</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="intel-fix-all-btn"
              onClick={handleApplyAllCriticalFixes}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Выровнять все цены в 1 клик ({summary.criticalDumpingCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            id="view-mode-single"
            onClick={() => setActiveView('single')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'single'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Детальный разбор ТОП-3</span>
          </button>

          <button
            id="view-mode-matrix"
            onClick={() => setActiveView('matrix')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'matrix'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Матрица каталога ({intelRecords.length})</span>
          </button>

          <button
            id="view-mode-events"
            onClick={() => setActiveView('events')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'events'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Live-лента изменений ({liveEvents.length})</span>
          </button>
        </div>

        {/* Product Selector for Single View */}
        {activeView === 'single' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Анализ товара:</span>
            <select
              id="intel-select-product"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs max-w-xs truncate"
            >
              {intelRecords.map((r) => (
                <option key={r.productId} value={r.productId}>
                  {r.dumpingSeverity === 'critical' ? '🚨 ' : r.dumpingSeverity === 'warning' ? '⚠️ ' : '✅ '}
                  {r.productName} ({r.ourPrice} ₽)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: Detailed Single Product TOP-3 Comparison */}
      {activeView === 'single' && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Active Product Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                  {currentRecord.productMarketplace.toUpperCase()} • {currentRecord.productSku}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  currentRecord.dumpingSeverity === 'critical'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : currentRecord.dumpingSeverity === 'warning'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {currentRecord.dumpingSeverity === 'critical' ? '🚨 Критический демпинг ТОП-1' : currentRecord.dumpingSeverity === 'warning' ? '⚠️ Ценовое давление' : '✅ Стабильный паритет'}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-1">
                {currentRecord.productName}
              </h3>
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                <span>Ваша цена: <strong className="text-slate-900">{currentRecord.ourPrice} ₽</strong></span>
                <span>Себестоимость: <strong className="text-slate-700">{currentRecord.costPrice} ₽</strong></span>
                <span>Безопасный порог цены: <strong className="text-emerald-700">{currentRecord.minSafePrice} ₽</strong></span>
                <span>Рейтинг: <strong className="text-amber-600">{currentRecord.ourRating} ★</strong> ({currentRecord.ourReviewsCount} отзывов)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id={`ask-ai-intel-${currentRecord.productId}`}
                onClick={() => handleAskAiAboutIntel(currentRecord)}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI-разбор в чате</span>
              </button>
            </div>
          </div>

          {/* Direct Side-by-Side Matrix: Our Product vs Top 3 Competitors */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            {/* Column 0: Our Product */}
            <div className="bg-indigo-900/5 border-2 border-indigo-400/80 rounded-2xl p-4.5 space-y-3.5 relative shadow-xs">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                  Наш товар (Вы)
                </span>
                <span className="text-xs font-bold text-indigo-900">
                  Позиция: #{currentProduct.searchRank}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm line-clamp-1" title={currentProduct.name}>
                  {currentProduct.name}
                </h4>
                <span className="text-[11px] text-slate-500 font-mono block">SKU: {currentProduct.sku}</span>
              </div>

              {/* Price Metric */}
              <div className="bg-white border border-indigo-200 rounded-xl p-3 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Розничная цена:</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-extrabold text-slate-900 font-mono">{currentRecord.ourPrice} ₽</span>
                  <span className="text-xs font-bold text-emerald-700">Маржа: {currentProduct.margin}%</span>
                </div>
                <span className="text-[10px] text-slate-500 block">Мин. порог: {currentRecord.minSafePrice} ₽</span>
              </div>

              {/* Rating & Reviews Metric */}
              <div className="bg-white border border-indigo-200 rounded-xl p-3 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Рейтинг & Отзывы:</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-1 text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {currentRecord.ourRating} ★
                  </span>
                  <span className="text-xs text-slate-600 font-medium">
                    {currentRecord.ourReviewsCount} отзывов
                  </span>
                </div>
              </div>

              {/* Fulfillment */}
              <div className="bg-white border border-indigo-200 rounded-xl p-2.5 shadow-2xs text-[11px] text-slate-600">
                <span className="font-semibold block text-slate-700">Логистика:</span>
                <span>FBO Коледино (Завтра)</span>
              </div>
            </div>

            {/* Columns 1, 2, 3: Top 3 Competitors */}
            {currentRecord.topCompetitors.map((comp) => {
              const isLead = comp.rank === 1;
              const isApplied = appliedActions[currentRecord.productId];

              return (
                <div
                  key={comp.id}
                  className={`border rounded-2xl p-4.5 space-y-3.5 relative transition-all ${
                    comp.threatLevel === 'critical'
                      ? 'bg-rose-50/60 border-rose-300 shadow-xs ring-1 ring-rose-300'
                      : comp.threatLevel === 'warning'
                      ? 'bg-amber-50/40 border-amber-200 shadow-2xs'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {/* Header Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      isLead 
                        ? 'bg-slate-900 text-white' 
                        : comp.rank === 2 
                        ? 'bg-slate-700 text-white' 
                        : 'bg-slate-500 text-white'
                    }`}>
                      ТОП-{comp.rank} {isLead ? '• Лидер ниши' : ''}
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      comp.threatLevel === 'critical'
                        ? 'bg-rose-200 text-rose-900 font-extrabold'
                        : comp.threatLevel === 'warning'
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {comp.threatLevel === 'critical' ? 'Угроза: 94%' : comp.threatLevel === 'warning' ? 'Угроза: 65%' : 'Угроза: 25%'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{comp.brand}</span>
                    <h4 className="font-bold text-slate-900 text-xs line-clamp-1" title={comp.title}>
                      {comp.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">SKU: {comp.sku}</span>
                  </div>

                  {/* Competitor Price & Delta */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-500 uppercase">Цена & Динамика:</span>
                      {comp.priceShift.direction === 'down' ? (
                        <span className="text-rose-600 font-bold flex items-center gap-0.5">
                          <TrendingDown className="w-3 h-3" />
                          {comp.priceShift.deltaRub} ₽ ({comp.priceShift.deltaPercent}%)
                        </span>
                      ) : comp.priceShift.direction === 'up' ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" />
                          +{comp.priceShift.deltaRub} ₽
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">Стабильно</span>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-extrabold text-slate-900 font-mono">
                        {comp.priceShift.currentPrice} ₽
                      </span>
                      {comp.priceShift.previousPrice !== comp.priceShift.currentPrice && (
                        <span className="text-xs text-slate-400 line-through">
                          {comp.priceShift.previousPrice} ₽
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>vs наша цена:</span>
                      <span className={`font-bold ${comp.priceShift.currentPrice < currentRecord.ourPrice ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {comp.priceShift.currentPrice < currentRecord.ourPrice 
                          ? `-${currentRecord.ourPrice - comp.priceShift.currentPrice} ₽ (Демпинг)`
                          : `+${comp.priceShift.currentPrice - currentRecord.ourPrice} ₽ (Выигрываем)`}
                      </span>
                    </div>

                    {comp.priceShift.promoTag && (
                      <span className="block text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-medium truncate">
                        🏷️ {comp.priceShift.promoTag}
                      </span>
                    )}
                  </div>

                  {/* Rating & Review Growth */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Рейтинг & Соц. вес:</span>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 flex items-center gap-1 text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        {comp.ratingShift.currentRating} ★
                        {comp.ratingShift.ratingDelta > 0 && (
                          <span className="text-[10px] text-emerald-600 font-bold">
                            (+{comp.ratingShift.ratingDelta})
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-slate-600 font-medium">
                        {comp.ratingShift.currentReviews} отзывов
                      </span>
                    </div>
                    {comp.ratingShift.reviewsDelta > 0 && (
                      <span className="text-[10px] text-emerald-700 block">
                        ▲ +{comp.ratingShift.reviewsDelta} новых отзывов за 7 дней
                      </span>
                    )}
                  </div>

                  {/* 1-Click Counter Action */}
                  <div className="pt-1">
                    {comp.threatLevel === 'critical' ? (
                      <button
                        id={`match-intel-price-${comp.id}`}
                        onClick={() => handleApplySinglePrice(currentRecord.productId, comp.suggestedActionPrice)}
                        disabled={isApplied}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${
                          isApplied
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-600 hover:bg-rose-700 text-white'
                        }`}
                      >
                        {isApplied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Цена обновлена до {comp.suggestedActionPrice} ₽</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>Срезать до {comp.suggestedActionPrice} ₽</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        id={`ask-ai-comp-${comp.id}`}
                        onClick={() => handleAskAiAboutIntel(currentRecord)}
                        className="w-full py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Bot className="w-3.5 h-3.5 text-indigo-600" />
                        <span>AI-анализ конкурента</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Threat Diagnosis & Tactical Advice */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white">
                AI Intelligence Verdict: Стратегия удержания поисковой выдачи
              </h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {currentRecord.aiCounterRecommendation}
            </p>

            <div className="pt-3 border-t border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-slate-300">
                <span>Прогноз позиции при демпинге: <strong className="text-rose-400">#{currentRecord.projectedRankDrop.from} → #{currentRecord.projectedRankDrop.to}</strong></span>
                <span>•</span>
                <span>Безопасная чистая прибыль: <strong className="text-emerald-400">+{currentRecord.minSafePrice - currentRecord.costPrice} ₽/шт</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id={`intel-smart-shield-${currentRecord.productId}`}
                  onClick={() => handleApplySinglePrice(currentRecord.productId, currentRecord.maxDumpingCompetitor.suggestedActionPrice)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Включить Smart Price Shield</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Catalog Matrix View */}
      {activeView === 'matrix' && (
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wide text-[11px]">Фильтр угрозы:</span>
              <button
                onClick={() => setFilterSeverity('all')}
                className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  filterSeverity === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Все ({intelRecords.length})
              </button>
              <button
                onClick={() => setFilterSeverity('critical')}
                className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  filterSeverity === 'critical'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-rose-700 hover:bg-rose-50'
                }`}
              >
                🚨 Критический ({summary.criticalDumpingCount})
              </button>
              <button
                onClick={() => setFilterSeverity('warning')}
                className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  filterSeverity === 'warning'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-amber-700 hover:bg-amber-50'
                }`}
              >
                ⚠️ Умеренный ({summary.warningDumpingCount})
              </button>
              <button
                onClick={() => setFilterSeverity('safe')}
                className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  filterSeverity === 'safe'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                ✅ Безопасный ({summary.safeCount})
              </button>
            </div>

            {summary.criticalDumpingCount > 0 && (
              <button
                id="matrix-fix-all-btn"
                onClick={handleApplyAllCriticalFixes}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Выровнять все критические цены ({summary.criticalDumpingCount})</span>
              </button>
            )}
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-3">Товар каталога</th>
                  <th className="py-3 px-3">Наша цена vs ТОП-1</th>
                  <th className="py-3 px-3">Разрыв цены</th>
                  <th className="py-3 px-3">Главный конкурент</th>
                  <th className="py-3 px-3">Динамика рейтинга ТОП-3</th>
                  <th className="py-3 px-3">Угроза демпинга</th>
                  <th className="py-3 px-3 text-right">Контрдействие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => {
                  const comp1 = r.topCompetitors[0];
                  const isApplied = appliedActions[r.productId];

                  return (
                    <tr 
                      key={r.productId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        r.dumpingSeverity === 'critical' ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 line-clamp-1 max-w-[220px]" title={r.productName}>
                          {r.productName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {r.productMarketplace.toUpperCase()} • {r.productSku}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="font-bold text-slate-900">{r.ourPrice} ₽</span>
                          <span className="text-slate-400">vs</span>
                          <span className="font-bold text-rose-600">{comp1.priceShift.currentPrice} ₽</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {r.priceGapToLeaderRub > 0 ? (
                          <span className="font-bold text-rose-600">
                            -{r.priceGapToLeaderRub} ₽ (-{r.priceGapToLeaderPercent}%)
                          </span>
                        ) : (
                          <span className="font-bold text-emerald-600">
                            +{Math.abs(r.priceGapToLeaderRub)} ₽ (+{Math.abs(r.priceGapToLeaderPercent)}%)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{comp1.brand}</div>
                        <div className="text-[10px] text-slate-500">{comp1.priceShift.changedAt}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-amber-600 font-bold">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>{comp1.ratingShift.currentRating} ★</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({comp1.ratingShift.currentReviews} отз.)
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          r.dumpingSeverity === 'critical'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : r.dumpingSeverity === 'warning'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {r.dumpingSeverity === 'critical' ? '🚨 Критический' : r.dumpingSeverity === 'warning' ? '⚠️ Давление' : '✅ Безопасно'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.dumpingSeverity === 'critical' ? (
                            <button
                              onClick={() => handleApplySinglePrice(r.productId, comp1.suggestedActionPrice)}
                              disabled={isApplied}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isApplied
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                              }`}
                            >
                              {isApplied ? '✓ Обновлено' : `Срезать до ${comp1.suggestedActionPrice} ₽`}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedProductId(r.productId);
                                setActiveView('single');
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                            >
                              Разбор ТОП-3
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Live Events Feed */}
      {activeView === 'events' && (
        <div className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Хронологическая лента изменений ТОП-3 конкурентов
            </h4>
            <span className="text-xs text-slate-400">Синхронизировано по API маркетплейсов</span>
          </div>

          <div className="space-y-2.5">
            {liveEvents.map((ev) => (
              <div
                key={ev.id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  ev.severity === 'critical'
                    ? 'bg-rose-50/80 border-rose-200'
                    : ev.severity === 'warning'
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">{ev.headline}</span>
                    <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                      {ev.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{ev.detail}</p>
                </div>

                {ev.suggestedAction && (
                  <div className="shrink-0">
                    {ev.suggestedAction.actionType === 'price_match' && ev.suggestedAction.newPrice ? (
                      <button
                        onClick={() => handleApplySinglePrice(ev.productId, ev.suggestedAction!.newPrice!)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <Zap className="w-3 h-3" />
                        <span>{ev.suggestedAction.label}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const target = products.find(p => p.id === ev.productId);
                          if (target && onAskAi) {
                            onAskAi(target, `Проанализируй событие конкурента: ${ev.headline}. Как нам отреагировать?`);
                          }
                        }}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Bot className="w-3 h-3" />
                        <span>Спросить AI</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

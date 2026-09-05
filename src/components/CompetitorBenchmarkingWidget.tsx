import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Star, 
  MessageSquare, 
  Truck, 
  DollarSign, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ExternalLink,
  Bot,
  Zap,
  Tag,
  Search,
  Building2,
  PackageCheck
} from 'lucide-react';
import { Product, CompetitorBenchmarkReport } from '../types';
import { getCompetitorBenchmarkForProduct } from '../data/competitorBenchmarkData';

interface Props {
  product: Product;
  onUpdatePrice?: (productId: string, newPrice: number) => void;
  onRestock?: (productId: string, amount: number) => void;
  onAskAi?: (product: Product, customPrompt?: string) => void;
  onClose?: () => void;
}

export const CompetitorBenchmarkingWidget: React.FC<Props> = ({
  product,
  onUpdatePrice,
  onRestock,
  onAskAi,
  onClose
}) => {
  const [report, setReport] = useState<CompetitorBenchmarkReport>(() => 
    getCompetitorBenchmarkForProduct(product)
  );
  const [selectedMetricTab, setSelectedMetricTab] = useState<'all' | 'price' | 'rating' | 'reviews' | 'delivery'>('all');
  const [appliedActions, setAppliedActions] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState<string>(product.mainKeyword);
  const [isEditingKeyword, setIsEditingKeyword] = useState<boolean>(false);

  const handleApplyAction = (actionTitle: string, actionType?: string, payload?: any) => {
    if (appliedActions.includes(actionTitle)) return;

    if (actionType === 'price' && payload?.newPrice && onUpdatePrice) {
      onUpdatePrice(product.id, payload.newPrice);
    } else if (actionType === 'restock' && payload?.amount && onRestock) {
      onRestock(product.id, payload.amount);
    } else if (actionType === 'ask_ai' && onAskAi) {
      onAskAi(product, `Проведи детальный сравнительный бенчмаркинг товара ${product.name} (SKU: ${product.sku}) с ТОП-3 конкурентами по запросу "${report.searchQuery}"`);
    }

    setAppliedActions((prev) => [...prev, actionTitle]);
  };

  const handleUpdateKeyword = () => {
    if (!customKeyword.trim()) return;
    const updated = getCompetitorBenchmarkForProduct({
      ...product,
      mainKeyword: customKeyword.trim()
    });
    setReport(updated);
    setIsEditingKeyword(false);
  };

  const { metricsSummary, aiAnalysis, topCompetitors, ourProduct } = report;

  return (
    <div 
      id={`competitor-benchmarking-${product.id}`}
      className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden transition-all animate-in fade-in duration-200"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                Competitor Benchmarking
              </span>
              <span className="text-xs text-slate-300">
                Маркетплейс: <strong className="text-white uppercase">{product.marketplace}</strong>
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-300">
                SKU: <code className="text-indigo-200 font-mono">{product.sku}</code>
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-xs text-slate-300 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-indigo-400" />
                Поисковый кластер:
              </span>
              {isEditingKeyword ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    className="px-2 py-0.5 bg-slate-800 border border-indigo-400 rounded text-xs text-white focus:outline-hidden"
                    autoFocus
                  />
                  <button
                    onClick={handleUpdateKeyword}
                    className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold cursor-pointer"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => setIsEditingKeyword(false)}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingKeyword(true)}
                  className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white transition-colors cursor-pointer"
                  title="Нажмите, чтобы изменить поисковый запрос для сравнения"
                >
                  <span>"{report.searchQuery}"</span>
                  <span className="text-[10px] text-indigo-300 font-normal">
                    ({report.searchVolume.toLocaleString('ru-RU')} запр/мес)
                  </span>
                  <span className="text-[10px] opacity-0 group-hover:opacity-100 text-indigo-300">✏️</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Delta Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onAskAi?.(product, `Подробно сравни товар ${product.name} с ТОП-3 конкурентами в выдаче по запросу "${report.searchQuery}"`)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-200" />
              <span>AI-Анализ в чате</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Закрыть виджет"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 4 Core Pillars Scoreboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-white/10 text-xs">
          {/* 1. Price Pillar */}
          <div className={`p-2.5 rounded-xl border ${
            metricsSummary.priceComparison.position === 'more_expensive'
              ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
              : metricsSummary.priceComparison.position === 'cheaper'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
              : 'bg-slate-800/60 border-slate-700 text-slate-200'
          }`}>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-semibold">
                <DollarSign className="w-3 h-3" /> Цена vs ТОП-1
              </span>
              {metricsSummary.priceComparison.position === 'more_expensive' ? (
                <span className="text-rose-400 font-bold flex items-center text-[10px]">
                  <TrendingUp className="w-3 h-3" /> +{metricsSummary.priceComparison.diff} ₽
                </span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center text-[10px]">
                  <TrendingDown className="w-3 h-3" /> {metricsSummary.priceComparison.diff} ₽
                </span>
              )}
            </div>
            <div className="text-sm font-extrabold text-white">
              {product.price.toLocaleString('ru-RU')} ₽ 
              <span className="text-[11px] font-normal text-slate-300 ml-1.5">
                (конкур.: {metricsSummary.priceComparison.topCompetitorPrice.toLocaleString('ru-RU')} ₽)
              </span>
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              {metricsSummary.priceComparison.position === 'more_expensive' 
                ? `Демпинг лидера (-${metricsSummary.priceComparison.diffPercent}%)` 
                : 'Выгодное ценовое позиционирование'}
            </div>
          </div>

          {/* 2. Rating Pillar */}
          <div className={`p-2.5 rounded-xl border ${
            metricsSummary.ratingComparison.status === 'higher'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
              : metricsSummary.ratingComparison.status === 'lower'
              ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
              : 'bg-slate-800/60 border-slate-700 text-slate-200'
          }`}>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-semibold">
                <Star className="w-3 h-3 text-amber-400" /> Рейтинг
              </span>
              <span className="text-white font-bold text-[10px]">
                ТОП ср: {metricsSummary.ratingComparison.avgTopRating} ★
              </span>
            </div>
            <div className="text-sm font-extrabold text-white flex items-center gap-1">
              <span className="text-amber-300 font-bold">{product.rating} ★</span>
              <span className="text-[10px] font-normal text-slate-300">
                ({metricsSummary.ratingComparison.diff > 0 ? `+${metricsSummary.ratingComparison.diff}` : metricsSummary.ratingComparison.diff} vs ТОП-3)
              </span>
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              {product.rating >= 4.8 ? 'Высокое качество, топ-выкуп' : 'Требуется отработка негатива'}
            </div>
          </div>

          {/* 3. Reviews Pillar */}
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-200">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-semibold">
                <MessageSquare className="w-3 h-3" /> Число отзывов
              </span>
              <span className="text-slate-300 font-medium text-[10px]">
                ТОП ср: {metricsSummary.reviewsComparison.avgTopReviews}
              </span>
            </div>
            <div className="text-sm font-extrabold text-white">
              {product.reviewsCount} отзывов
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              {metricsSummary.reviewsComparison.gap < 0 
                ? `Отставание: ${Math.abs(metricsSummary.reviewsComparison.gap)} шт от #1`
                : 'Социальное доверие в норме'}
            </div>
          </div>

          {/* 4. Delivery Speed Pillar */}
          <div className={`p-2.5 rounded-xl border ${
            metricsSummary.deliveryComparison.status === 'slower'
              ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
          }`}>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-semibold">
                <Truck className="w-3 h-3" /> Скорость доставки
              </span>
              <span className="text-white font-bold text-[10px]">
                ТОП-1: 1 день
              </span>
            </div>
            <div className="text-sm font-extrabold text-white">
              {ourProduct.deliveryDays === 1 ? 'Завтра (1 дн.)' : `${ourProduct.deliveryDays} дн. (FBO)`}
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              {metricsSummary.deliveryComparison.status === 'slower'
                ? 'Конкурент доставляет быстрее'
                : 'Максимальная скорость (FBO)'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs for Direct Comparison */}
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-slate-600 mr-1 text-[11px] uppercase tracking-wider">
            Срез сравнения:
          </span>
          <button
            onClick={() => setSelectedMetricTab('all')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              selectedMetricTab === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Все метрики
          </button>
          <button
            onClick={() => setSelectedMetricTab('price')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              selectedMetricTab === 'price'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-3 h-3" /> Цена
          </button>
          <button
            onClick={() => setSelectedMetricTab('rating')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              selectedMetricTab === 'rating'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Star className="w-3 h-3 text-amber-500" /> Рейтинг & Отзывы
          </button>
          <button
            onClick={() => setSelectedMetricTab('delivery')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              selectedMetricTab === 'delivery'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-3 h-3 text-blue-600" /> Скорость доставки
          </button>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Парсинг актуален: <strong>Сегодня, 08:30</strong></span>
        </div>
      </div>

      {/* DIRECT COMPARISON MATRIX TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
              <th className="py-3 px-3 w-40">Параметр сравнения</th>
              
              {/* OUR PRODUCT COLUMN */}
              <th className="py-3 px-3.5 bg-indigo-50/70 border-x-2 border-indigo-300 text-indigo-950 w-64">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-indigo-700">★ НАШ ТОВАР (ВЫ)</span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-bold">
                    Позиция #{product.searchRank}
                  </span>
                </div>
              </th>

              {/* TOP 3 COMPETITORS COLUMNS */}
              {topCompetitors.map((comp) => (
                <th key={comp.id} className="py-3 px-3.5 text-slate-800 w-60 border-r border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1 text-slate-900">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white font-black ${
                        comp.rank === 1 ? 'bg-amber-500' : comp.rank === 2 ? 'bg-slate-500' : 'bg-amber-700'
                      }`}>
                        {comp.rank}
                      </span>
                      {comp.rank === 1 ? 'ТОП-1 Лидер' : comp.rank === 2 ? 'ТОП-2 Конкурент' : 'ТОП-3 Конкурент'}
                    </span>
                    {comp.isSponsored && (
                      <span className="text-[9px] font-bold px-1 rounded bg-purple-100 text-purple-700">
                        АРК
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200/80 text-slate-800">
            {/* Row 1: Product Basic Info & SKU */}
            <tr className="hover:bg-slate-50/60 transition-colors">
              <td className="py-3 px-3 font-semibold text-slate-600 bg-slate-50/50">
                Карточка & SKU
              </td>
              
              {/* Our Product */}
              <td className="py-3 px-3.5 bg-indigo-50/30 border-x-2 border-indigo-300 font-medium">
                <div className="flex items-center gap-2.5">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-10 h-10 rounded-lg object-cover border border-indigo-200 shrink-0" 
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate" title={product.name}>
                      {product.name}
                    </div>
                    <div className="text-[10px] text-indigo-700 font-mono">
                      {product.sku}
                    </div>
                  </div>
                </div>
              </td>

              {/* Competitors */}
              {topCompetitors.map((comp) => (
                <td key={comp.id} className="py-3 px-3.5 border-r border-slate-200">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-800 truncate" title={comp.name}>
                      {comp.name}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between">
                      <span className="font-semibold text-slate-700">{comp.brand}</span>
                      <span className="font-mono text-slate-400">{comp.sku}</span>
                    </div>
                  </div>
                </td>
              ))}
            </tr>

            {/* Row 2: ЦЕНА (Price) */}
            {(selectedMetricTab === 'all' || selectedMetricTab === 'price') && (
              <tr className="hover:bg-slate-50/60 transition-colors bg-amber-50/20">
                <td className="py-3.5 px-3 font-semibold text-slate-700 bg-slate-50/50 flex flex-col justify-center">
                  <span className="flex items-center gap-1 font-bold text-slate-900">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Цена розничная
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (со скидкой продавца)
                  </span>
                </td>

                {/* Our Price */}
                <td className="py-3.5 px-3.5 bg-indigo-50/40 border-x-2 border-indigo-300">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-indigo-950">
                        {product.price.toLocaleString('ru-RU')} ₽
                      </span>
                      {product.oldPrice && (
                        <span className="text-[11px] text-slate-400 line-through">
                          {product.oldPrice} ₽
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-600 flex items-center gap-1">
                      <span>Себестоимость: <strong>{product.costPrice} ₽</strong></span>
                      <span>• Маржа: <strong className="text-emerald-700">{product.margin}%</strong></span>
                    </div>
                  </div>
                </td>

                {/* Competitors Price */}
                {topCompetitors.map((comp) => {
                  const diffVsOur = comp.price - product.price;
                  return (
                    <td key={comp.id} className="py-3.5 px-3.5 border-r border-slate-200">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {comp.price.toLocaleString('ru-RU')} ₽
                          </span>
                          {comp.oldPrice && (
                            <span className="text-[10px] text-slate-400 line-through">
                              {comp.oldPrice} ₽
                            </span>
                          )}
                        </div>
                        <div className="text-[10px]">
                          {diffVsOur < 0 ? (
                            <span className="text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 inline-block">
                              Дешевле на {Math.abs(diffVsOur)} ₽ (-{Math.round(Math.abs(diffVsOur) / product.price * 100)}%)
                            </span>
                          ) : diffVsOur > 0 ? (
                            <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block">
                              Дороже на +{diffVsOur} ₽ (+{Math.round(diffVsOur / product.price * 100)}%)
                            </span>
                          ) : (
                            <span className="text-slate-500 font-semibold">
                              Цена одинаковая
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            )}

            {/* Row 3: РЕЙТИНГ (Rating) */}
            {(selectedMetricTab === 'all' || selectedMetricTab === 'rating') && (
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-3 font-semibold text-slate-600 bg-slate-50/50">
                  <span className="flex items-center gap-1 font-bold text-slate-900">
                    <Star className="w-3.5 h-3.5 text-amber-500" /> Рейтинг
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (на основе отзывов покупателей)
                  </span>
                </td>

                {/* Our Rating */}
                <td className="py-3 px-3.5 bg-indigo-50/30 border-x-2 border-indigo-300">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-amber-500 font-black text-sm">
                      <span>{product.rating}</span>
                      <span>★</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                      {product.rating >= 4.8 ? 'Топ качество' : 'Стандарт'}
                    </span>
                  </div>
                </td>

                {/* Competitors Rating */}
                {topCompetitors.map((comp) => (
                  <td key={comp.id} className="py-3 px-3.5 border-r border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 flex items-center text-sm text-amber-600">
                        {comp.rating} ★
                      </span>
                      <span className="text-[10px] text-slate-500">
                        ({comp.rating > product.rating ? `+${(comp.rating - product.rating).toFixed(1)} к нашему` : comp.rating < product.rating ? `-${(product.rating - comp.rating).toFixed(1)}` : 'как у нас'})
                      </span>
                    </div>
                  </td>
                ))}
              </tr>
            )}

            {/* Row 4: КОЛИЧЕСТВО ОТЗЫВОВ (Reviews Count) */}
            {(selectedMetricTab === 'all' || selectedMetricTab === 'rating') && (
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-3 font-semibold text-slate-600 bg-slate-50/50">
                  <span className="flex items-center gap-1 font-bold text-slate-900">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> Число отзывов
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (социальный вес карточки)
                  </span>
                </td>

                {/* Our Reviews */}
                <td className="py-3 px-3.5 bg-indigo-50/30 border-x-2 border-indigo-300">
                  <div className="font-bold text-slate-900 text-sm">
                    {product.reviewsCount.toLocaleString('ru-RU')} шт
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Выкуп: ~94%
                  </div>
                </td>

                {/* Competitors Reviews */}
                {topCompetitors.map((comp) => (
                  <td key={comp.id} className="py-3 px-3.5 border-r border-slate-200">
                    <div className="font-bold text-slate-900 text-sm">
                      {comp.reviewsCount.toLocaleString('ru-RU')} шт
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {comp.reviewsCount > product.reviewsCount 
                        ? `Преимущество +${comp.reviewsCount - product.reviewsCount} отзывов`
                        : `Меньше на ${product.reviewsCount - comp.reviewsCount} отзывов`}
                    </div>
                  </td>
                ))}
              </tr>
            )}

            {/* Row 5: СКОРОСТЬ ДОСТАВКИ (Delivery Speed & Warehouse) */}
            {(selectedMetricTab === 'all' || selectedMetricTab === 'delivery') && (
              <tr className="hover:bg-slate-50/60 transition-colors bg-blue-50/20">
                <td className="py-3.5 px-3 font-semibold text-slate-700 bg-slate-50/50">
                  <span className="flex items-center gap-1 font-bold text-slate-900">
                    <Truck className="w-3.5 h-3.5 text-blue-600" /> Скорость доставки
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (склад FBO / SLA доставки)
                  </span>
                </td>

                {/* Our Delivery */}
                <td className="py-3.5 px-3.5 bg-indigo-50/40 border-x-2 border-indigo-300">
                  <div className="space-y-0.5">
                    <div className={`font-bold flex items-center gap-1 text-xs ${
                      ourProduct.deliveryDays === 1 ? 'text-emerald-700' : 'text-amber-800'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{ourProduct.deliverySpeed}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Остаток FBO: <strong>{product.stockFbo} шт</strong> ({product.daysLeft} дн. запаса)
                    </div>
                  </div>
                </td>

                {/* Competitors Delivery */}
                {topCompetitors.map((comp) => (
                  <td key={comp.id} className="py-3.5 px-3.5 border-r border-slate-200">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1 text-xs">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>{comp.deliverySpeed}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Склад: <span className="font-semibold text-slate-700">{comp.warehouse}</span>
                      </div>
                    </div>
                  </td>
                ))}
              </tr>
            )}

            {/* Row 6: Дневные продажи & Оборот */}
            {selectedMetricTab === 'all' && (
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-3 font-semibold text-slate-600 bg-slate-50/50">
                  Продажи & Выручка
                  <div className="text-[10px] text-slate-400 font-normal">(оценка в день)</div>
                </td>

                {/* Our Sales */}
                <td className="py-3 px-3.5 bg-indigo-50/30 border-x-2 border-indigo-300">
                  <div className="font-bold text-slate-900">
                    {product.dailyOrders} заказов / день
                  </div>
                  <div className="text-[10px] text-emerald-700 font-bold">
                    {product.dailyRevenue.toLocaleString('ru-RU')} ₽ / день
                  </div>
                </td>

                {/* Competitors Sales */}
                {topCompetitors.map((comp) => (
                  <td key={comp.id} className="py-3 px-3.5 border-r border-slate-200">
                    <div className="font-bold text-slate-800">
                      ~{comp.dailyOrders} заказов / день
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      ~{comp.dailyRevenue.toLocaleString('ru-RU')} ₽ / день
                    </div>
                  </td>
                ))}
              </tr>
            )}

            {/* Row 7: Сильные и слабые стороны (SWOT) */}
            {selectedMetricTab === 'all' && (
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-3 font-semibold text-slate-600 bg-slate-50/50">
                  Плюсы и минусы
                  <div className="text-[10px] text-slate-400 font-normal">(AI-разбор)</div>
                </td>

                {/* Our SWOT */}
                <td className="py-3 px-3.5 bg-indigo-50/30 border-x-2 border-indigo-300">
                  <div className="space-y-1 text-[11px]">
                    <div className="text-emerald-800 font-semibold flex items-center gap-1">
                      <span className="text-emerald-600">✓</span>
                      <span>Маржа {product.margin}%</span>
                    </div>
                    <div className="text-emerald-800 font-semibold flex items-center gap-1">
                      <span className="text-emerald-600">✓</span>
                      <span>Рейтинг {product.rating} ★</span>
                    </div>
                    {product.daysLeft <= 5 && (
                      <div className="text-rose-700 font-semibold flex items-center gap-1">
                        <span className="text-rose-600">⚠</span>
                        <span>Риск дефицита ({product.daysLeft} дн.)</span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Competitors SWOT */}
                {topCompetitors.map((comp) => (
                  <td key={comp.id} className="py-3 px-3.5 border-r border-slate-200">
                    <div className="space-y-1 text-[11px]">
                      {comp.strengths.slice(0, 2).map((s, idx) => (
                        <div key={idx} className="text-slate-700 flex items-start gap-1">
                          <span className="text-emerald-600 shrink-0 font-bold">+</span>
                          <span className="text-[10px] leading-tight">{s}</span>
                        </div>
                      ))}
                      {comp.weaknesses.slice(0, 1).map((w, idx) => (
                        <div key={idx} className="text-slate-500 flex items-start gap-1">
                          <span className="text-rose-500 shrink-0 font-bold">-</span>
                          <span className="text-[10px] leading-tight">{w}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* AI STRATEGIC RECOMMENDATIONS & 1-CLICK ACTIONS */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 border-t border-slate-200 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>AI-Стратегия победы над ТОП-3 конкурентами:</span>
          </div>

          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
            CommerceOS Intelligence
          </span>
        </div>

        {/* Verdict & Root Cause Analysis */}
        <div className="p-3 bg-white border border-indigo-200/80 rounded-xl space-y-2 shadow-2xs">
          <p className="text-xs text-slate-800 leading-relaxed">
            <strong>Диагноз:</strong> {aiAnalysis.verdict}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="text-amber-800 bg-amber-50/70 p-2 rounded-lg border border-amber-200/60">
              <span className="font-bold flex items-center gap-1 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Главный фактор риска:
              </span>
              <p className="text-[11px] text-slate-700 mt-0.5">{aiAnalysis.keyRisk}</p>
            </div>

            <div className="text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/60">
              <span className="font-bold flex items-center gap-1 text-[11px]">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Точка взрывного роста:
              </span>
              <p className="text-[11px] text-slate-700 mt-0.5">{aiAnalysis.growthOpportunity}</p>
            </div>
          </div>
        </div>

        {/* Recommended Action Steps */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Рекомендуемые действия (1-Click Execution):
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {aiAnalysis.actionSteps.map((step, idx) => {
              const isApplied = appliedActions.includes(step.title);
              return (
                <div 
                  key={idx}
                  className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between space-y-2 shadow-2xs hover:border-indigo-300 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                      <span>{step.title}</span>
                      {isApplied && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Применено
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      {step.desc}
                    </p>
                  </div>

                  {step.buttonLabel && (
                    <button
                      id={`apply-comp-action-${idx}`}
                      onClick={() => handleApplyAction(step.title, step.actionType, step.payload)}
                      disabled={isApplied}
                      className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isApplied
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : step.actionType === 'price'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          : step.actionType === 'restock'
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                          : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Успешно выполнено</span>
                        </>
                      ) : (
                        <>
                          <span>{step.buttonLabel}</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

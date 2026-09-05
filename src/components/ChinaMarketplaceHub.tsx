import React, { useState } from 'react';
import {
  Factory,
  Globe2,
  TrendingUp,
  Search,
  ArrowRight,
  Sparkles,
  DollarSign,
  Package,
  Truck,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Sliders,
  Calculator,
  Layers,
  ChevronRight,
  Info,
  AlertCircle,
  Copy,
  Zap,
  MessageSquare,
  Award,
  RefreshCw,
  FileText,
  SlidersHorizontal,
  TrendingDown
} from 'lucide-react';
import { ChinaFactorySource, Product, Store, MarketplaceConfig } from '../types';
import {
  INITIAL_CHINA_FACTORIES,
  INITIAL_CHINA_SOURCING_OPPORTUNITIES,
  CHINA_NEGOTIATION_SCRIPTS,
  CHINA_LOGISTICS_TIERS,
  ChinaSourcingOpportunity,
  ChinaNegotiationScript
} from '../data/chinaMarketplaceData';
import { ChinaPurchaseOrderModal } from './ChinaPurchaseOrderModal';
import { ChinaFactoryAuditModal } from './ChinaFactoryAuditModal';

interface Props {
  currentStore: Store;
  products: Product[];
  config?: MarketplaceConfig;
  onSendMessageToChat?: (text: string) => void;
  onOpenSettings?: () => void;
}

export const ChinaMarketplaceHub: React.FC<Props> = ({
  currentStore,
  products,
  config,
  onSendMessageToChat,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'sourcing' | 'factories' | 'arbitrage' | 'scripts' | 'hedging'>('sourcing');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [activePoOpportunity, setActivePoOpportunity] = useState<ChinaSourcingOpportunity | null>(null);
  const [activeAuditFactory, setActiveAuditFactory] = useState<ChinaFactorySource | null>(null);
  
  // Dynamic Calculator state
  const [selectedOpportunity, setSelectedOpportunity] = useState<ChinaSourcingOpportunity>(
    INITIAL_CHINA_SOURCING_OPPORTUNITIES[0]
  );
  const [customMoq, setCustomMoq] = useState<number>(selectedOpportunity.recommendedBatchMoq);
  
  // Currency Hedging Simulation state
  const [simulatedCnyRate, setSimulatedCnyRate] = useState<number>(config?.cnyExchangeRate || 13.45);
  
  // UI interaction states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionDone, setActionDone] = useState<string | null>(null);

  const baseCnyRate = config?.cnyExchangeRate || 13.45;

  const filteredFactories = INITIAL_CHINA_FACTORIES.filter((f) => {
    const matchPlatform = selectedPlatform === 'all' || f.platform === selectedPlatform;
    const matchQuery =
      searchQuery === '' ||
      f.productTitleRu.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.factoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchPlatform && matchQuery;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendAiAnalysis = (opp: ChinaSourcingOpportunity) => {
    if (onSendMessageToChat) {
      onSendMessageToChat(
        `Рассчитай полную юнит-экономику закупки на 1688 для артикула "${opp.russianMarketItem.productName}" (SKU: ${opp.russianMarketItem.sku}) у фабрики "${opp.sourceItem.factoryName}". Заводская цена: ¥${opp.sourceItem.factoryPriceCny} (${opp.arbitrage.unitFactoryPriceRub} ₽). Текущая себестоимость в РФ: ${opp.russianMarketItem.currentWbCostPrice} ₽. Какой чистый профит и срок окупаемости партии в ${opp.recommendedBatchMoq} шт?`
      );
    }
  };

  const handleSendOrderFromModal = (summaryText: string) => {
    if (onSendMessageToChat) {
      onSendMessageToChat(
        `Сформирован драфт спецификации PO для Китая:\n\n${summaryText}\n\nAI-менеджер, проверь корректность условий DDP и составь проект контракта на двух языках (中文/Русский).`
      );
    }
  };

  return (
    <div id="china-marketplace-hub" className="space-y-6 animate-in fade-in duration-200">
      {/* Modals */}
      {activePoOpportunity && (
        <ChinaPurchaseOrderModal
          opportunity={activePoOpportunity}
          cnyRate={baseCnyRate}
          onClose={() => setActivePoOpportunity(null)}
          onSendOrder={handleSendOrderFromModal}
        />
      )}

      {activeAuditFactory && (
        <ChinaFactoryAuditModal
          factory={activeAuditFactory}
          onClose={() => setActiveAuditFactory(null)}
          onAskAi={(prompt) => {
            if (onSendMessageToChat) onSendMessageToChat(prompt);
          }}
        />
      )}

      {/* Top Strategic Header */}
      <div className="bg-gradient-to-br from-rose-950 via-slate-900 to-slate-900 border border-rose-900/60 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-400/30 backdrop-blur-md">
                <span>🇨🇳</span>
                <span>CHINA CROSS-BORDER DIRECT SOURCING</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-slate-300 border border-white/10">
                Курс ЦБ: ¥1 = {baseCnyRate} ₽
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                1688 / Taobao / JD Open API
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Прямой выход на фабрики Китая & Арбитраж себестоимости
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Забирайте максимальную маржинальность первоисточников. AI находит оригинальные заводы в Гуанчжоу, Иу и Шэньчжэне, рассчитывает себестоимость под ключ с белой таможней DDP и помогает вытеснить перекупщиков с Wildberries и Ozon.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            <button
              id="china-hub-settings-btn"
              onClick={onOpenSettings}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Sliders className="w-4 h-4 text-rose-300" />
              <span>Настройки API Китая</span>
            </button>
            <button
              id="china-hub-ai-scout-btn"
              onClick={() => {
                if (onSendMessageToChat) {
                  onSendMessageToChat(
                    'AI Скаут Китая: Просканируй 1688.com и Taobao для топ-3 товаров моего магазина и найди прямых производителей с минимальной себестоимостью.'
                  );
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-rose-200" />
              <span>⚡ Запустить AI-скаут фабрик</span>
            </button>
          </div>
        </div>

        {/* Live Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Экономия себестоимости
            </span>
            <div className="text-lg font-black text-rose-300">до -42%</div>
            <span className="text-[10px] text-slate-400">от цен оптовиков РФ</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Срок экспресс-логистики
            </span>
            <div className="text-lg font-black text-emerald-300">12–16 дней</div>
            <span className="text-[10px] text-slate-400">Гуанчжоу → Москва FBO</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Рост чистой маржи
            </span>
            <div className="text-lg font-black text-indigo-300">+11.8%</div>
            <span className="text-[10px] text-slate-400">за счет прямого OEM/ODM</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Таможенный статус
            </span>
            <div className="text-lg font-black text-amber-300">Белая DDP + ГТД</div>
            <span className="text-[10px] text-slate-400">Полная сертификация EAC</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-2 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            id="tab-sourcing-arbitrage"
            onClick={() => setActiveTab('sourcing')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'sourcing'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-rose-600" />
            <span>Арбитраж маржи (1688 vs WB)</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-600 text-white font-extrabold">
              ТОП
            </span>
          </button>

          <button
            id="tab-direct-factories"
            onClick={() => setActiveTab('factories')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'factories'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Factory className="w-4 h-4 text-rose-600" />
            <span>Каталог фабрик ({INITIAL_CHINA_FACTORIES.length})</span>
          </button>

          <button
            id="tab-margin-calculator"
            onClick={() => setActiveTab('arbitrage')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'arbitrage'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Calculator className="w-4 h-4 text-rose-600" />
            <span>Калькулятор DDP</span>
          </button>

          <button
            id="tab-negotiation-scripts"
            onClick={() => setActiveTab('scripts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'scripts'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-rose-600" />
            <span>Шаблоны переговоров (中文)</span>
          </button>

          <button
            id="tab-hedging-simulator"
            onClick={() => setActiveTab('hedging')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'hedging'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-rose-600" />
            <span>Стресс-тест курса CNY</span>
          </button>
        </div>

        {/* Platform Selector Filter */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setSelectedPlatform('all')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
              selectedPlatform === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Все (🇨🇳)
          </button>
          <button
            onClick={() => setSelectedPlatform('1688')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
              selectedPlatform === '1688'
                ? 'bg-orange-500 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1688.com
          </button>
          <button
            onClick={() => setSelectedPlatform('taobao')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
              selectedPlatform === 'taobao'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Taobao
          </button>
          <button
            onClick={() => setSelectedPlatform('jd')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
              selectedPlatform === 'jd'
                ? 'bg-rose-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            JD.com
          </button>
        </div>
      </div>

      {/* TAB 1: SOURCING ARBITRAGE & REVENUE EXPANSION */}
      {activeTab === 'sourcing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {INITIAL_CHINA_SOURCING_OPPORTUNITIES.map((opp) => {
              const monthlyExtra = opp.arbitrage.potentialMonthlyExtraProfitRub;
              const savingUnit = opp.arbitrage.currentCostSavingRub;

              return (
                <div
                  key={opp.id}
                  className="bg-white border-2 border-rose-200/80 hover:border-rose-400 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={opp.sourceItem.imageUrl}
                        alt={opp.sourceItem.productTitleRu}
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">
                          🇨🇳 Прямой контракт {opp.sourceItem.platform.toUpperCase()}
                        </span>
                        <h3 className="font-extrabold text-slate-900 text-base mt-1">
                          {opp.russianMarketItem.productName}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">
                          Артикул: {opp.russianMarketItem.sku} • {opp.sourceItem.city}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Доп. прибыль / мес:
                      </span>
                      <span className="text-lg font-black text-emerald-600">
                        +{monthlyExtra.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </div>

                  {/* Pricing Comparison Matrix */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                    <div className="text-center border-r border-slate-200/80">
                      <span className="text-[10px] text-slate-500 block">Закупка в РФ:</span>
                      <span className="text-sm font-bold text-slate-700 line-through">
                        {opp.russianMarketItem.currentWbCostPrice} ₽
                      </span>
                      <span className="text-[10px] text-slate-400 block">у оптовика</span>
                    </div>

                    <div className="text-center border-r border-slate-200/80">
                      <span className="text-[10px] text-slate-500 block">Завод 1688:</span>
                      <span className="text-sm font-black text-orange-600">
                        ¥{opp.sourceItem.factoryPriceCny} ({opp.arbitrage.unitFactoryPriceRub} ₽)
                      </span>
                      <span className="text-[10px] text-slate-400 block">фабричная цена</span>
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 block">С доставкой & DDP:</span>
                      <span className="text-sm font-black text-emerald-700">
                        {opp.arbitrage.totalLandedCostRub} ₽
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold block">
                        -{savingUnit} ₽ / шт
                      </span>
                    </div>
                  </div>

                  {/* Factory Credibility Bar */}
                  <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Factory className="w-3.5 h-3.5 text-rose-600" />
                        {opp.sourceItem.factoryName}
                      </span>
                      <button
                        onClick={() => setActiveAuditFactory(opp.sourceItem)}
                        className="text-rose-700 hover:text-rose-900 font-bold text-[11px] underline cursor-pointer"
                      >
                        Аудит фабрики ★ {opp.sourceItem.verifiedSupplierRating}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                      <span>Опыт: <strong>{opp.sourceItem.yearsInBusiness} лет</strong></span>
                      <span>MOQ: <strong>{opp.sourceItem.moq} шт</strong></span>
                      <span>Срок производства: <strong>{opp.sourceItem.leadTimeDays} дней</strong></span>
                      <span>Брак: <strong className="text-emerald-700">{opp.sourceItem.defectRatePercent || 0.2}%</strong></span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setActivePoOpportunity(opp)}
                      className="flex-1 py-2.5 px-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Package className="w-4 h-4 text-rose-200" />
                      <span>Сформировать заказ (PO)</span>
                    </button>

                    <button
                      onClick={() => handleSendAiAnalysis(opp)}
                      className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-rose-600" />
                      <span>AI Юнит-экономика</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: VERIFIED CHINA FACTORIES DIRECTORY */}
      {activeTab === 'factories' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по категории, городу (Гуанчжоу, Иу)..."
                className="w-full bg-slate-50 border border-slate-200 text-xs pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-rose-500 font-medium"
              />
            </div>
            <div className="text-xs text-slate-500">
              Найдено верифицированных фабрик: <strong className="text-slate-800">{filteredFactories.length}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFactories.map((factory) => (
              <div
                key={factory.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs space-y-4 transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <img
                    src={factory.imageUrl}
                    alt={factory.productTitleRu}
                    className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        factory.platform === '1688'
                          ? 'bg-orange-100 text-orange-800'
                          : factory.platform === 'taobao'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {factory.platform.toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        📍 {factory.city}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm truncate">
                      {factory.productTitleRu}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate" title={factory.factoryName}>
                      {factory.factoryName}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Заводская цена:</span>
                    <span className="text-xs font-black text-rose-600">
                      ¥{factory.factoryPriceCny} ({factory.factoryPriceRub} ₽)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Мин. партия (MOQ):</span>
                    <span className="text-xs font-bold text-slate-800">
                      {factory.moq} шт.
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Себестоимость DDP:</span>
                    <span className="text-xs font-black text-emerald-700">
                      {factory.landedCostRub} ₽
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setActiveAuditFactory(factory)}
                    className="flex items-center gap-1.5 text-xs text-slate-700 font-bold hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Аудит завода (★ {factory.verifiedSupplierRating})</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onSendMessageToChat) {
                        onSendMessageToChat(
                          `AI Запрос на фабрику: Подготовь коммерческое предложение и контракт на поставку партии ${factory.moq} шт у фабрики "${factory.factoryName}" (${factory.city}) по артикулу "${factory.productTitleRu}".`
                        );
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Связаться с заводом</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: COMPLETE LANDED COST CALCULATOR */}
      {activeTab === 'arbitrage' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Калькулятор полной юнит-экономики Китай → РФ FBO
              </h3>
              <p className="text-xs text-slate-500">
                Точный расчёт белой доставки DDP, таможенных пошлин, НДС и чистой маржинальности партии
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
              Базовый курс: ¥1 = {baseCnyRate} ₽
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Parameters */}
            <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                Параметры партии
              </h4>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Фабричная цена за штуку (¥ CNY):
                </label>
                <input
                  type="number"
                  value={selectedOpportunity.sourceItem.factoryPriceCny}
                  readOnly
                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Объем партии (шт.):
                </label>
                <input
                  type="number"
                  value={customMoq}
                  onChange={(e) => setCustomMoq(Math.max(50, parseInt(e.target.value) || 100))}
                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Планируемая розничная цена на WB/Ozon (₽):
                </label>
                <input
                  type="number"
                  value={selectedOpportunity.russianMarketItem.currentSellingPriceRub}
                  readOnly
                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Breakdown Waterfall */}
            <div className="lg:col-span-2 space-y-4 bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-rose-300 uppercase tracking-wider block mb-3">
                  Структура себестоимости под ключ (1 шт.)
                </span>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">1. Завод в Китае (Ex-Works):</span>
                    <span className="font-bold text-white">
                      {Math.round(selectedOpportunity.sourceItem.factoryPriceCny * baseCnyRate)} ₽ (¥{selectedOpportunity.sourceItem.factoryPriceCny})
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">2. Доставка до порта Гуанчжоу + Консолидация:</span>
                    <span className="font-semibold text-slate-300">45 ₽</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">3. Белая доставка DDP (Авто/ЖД) + Таможенная пошлина:</span>
                    <span className="font-semibold text-slate-300">185 ₽</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">4. Сертификация EAC, маркировка Честный Знак:</span>
                    <span className="font-semibold text-slate-300">49 ₽</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-300 font-bold">Итоговая себестоимость на складе FBO Коледино:</span>
                    <span className="text-base font-black text-rose-400">
                      {selectedOpportunity.arbitrage.totalLandedCostRub} ₽ / шт
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800">
                <div className="bg-slate-800/80 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Инвестиции в партию:</span>
                  <span className="text-sm font-extrabold text-white">
                    {(selectedOpportunity.arbitrage.totalLandedCostRub * customMoq).toLocaleString('ru-RU')} ₽
                  </span>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Маржинальность:</span>
                  <span className="text-sm font-extrabold text-emerald-400">
                    54.2%
                  </span>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Чистая прибыль с партии:</span>
                  <span className="text-sm font-extrabold text-emerald-300">
                    {((selectedOpportunity.russianMarketItem.currentSellingPriceRub * 0.7 - selectedOpportunity.arbitrage.totalLandedCostRub) * customMoq).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BILINGUAL NEGOTIATION SCRIPTS */}
      {activeTab === 'scripts' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <span>🇨🇳</span>
                <span>Проверенные скрипты переговоров в 1688 / WeChat</span>
              </h3>
              <p className="text-xs text-slate-500">
                Готовые формулировки на китайском и русском для быстрого торга, запроса бесплатных сэмплов и фиксации OEM-брендинга
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✓ Проверено на 150+ контрактах
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CHINA_NEGOTIATION_SCRIPTS.map((script) => (
              <div
                key={script.id}
                className="bg-white border border-slate-200 hover:border-rose-300 rounded-3xl p-5 shadow-xs space-y-4 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-700 font-mono">
                      {script.category.toUpperCase()}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm mt-1">
                      {script.titleRu}
                    </h4>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap">
                    {script.successRate}
                  </span>
                </div>

                {/* Chinese text block */}
                <div className="p-3.5 bg-slate-900 text-rose-200 rounded-2xl font-mono text-xs leading-relaxed relative group">
                  <p className="pr-8 select-all">{script.chineseText}</p>
                  <button
                    onClick={() => handleCopy(`cn-${script.id}`, script.chineseText)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                    title="Копировать китайский текст для чата"
                  >
                    {copiedId === `cn-${script.id}` ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Russian translation */}
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Русский перевод:
                  </span>
                  <p>{script.russianText}</p>
                </div>

                {/* Seller Tip */}
                <div className="flex items-center gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl p-2.5">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>💡 <strong>Совет селлера:</strong> {script.tip}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleCopy(`cn-${script.id}`, script.chineseText)}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedId === `cn-${script.id}` ? 'Скопировано!' : 'Копировать в WeChat'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onSendMessageToChat) {
                        onSendMessageToChat(
                          `Адаптируй этот скрипт переговоров на китайском: "${script.chineseText}" под мой бренд и добавь требование бесплатного образца.`
                        );
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                    <span>Адаптировать с AI</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: CURRENCY HEDGING & PRICE AUTO-ADJUSTMENT */}
      {activeTab === 'hedging' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>💱</span>
                <span>Стресс-тест волатильности курса CNY/RUB & Авто-репрайсинг</span>
              </h3>
              <p className="text-xs text-slate-500">
                Моделирование влияния изменений курса юаня на рентабельность и автоматическая коррекция розничных цен на Wildberries/Ozon
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Slider Column */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-extrabold text-slate-900 uppercase">
                    Моделируемый курс юаня:
                  </label>
                  <span className="text-sm font-black text-rose-600">
                    ¥1 = {simulatedCnyRate.toFixed(2)} ₽
                  </span>
                </div>

                <input
                  type="range"
                  min={11.0}
                  max={17.0}
                  step={0.1}
                  value={simulatedCnyRate}
                  onChange={(e) => setSimulatedCnyRate(parseFloat(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>11.00 ₽ (Укрепление)</span>
                  <span>13.45 ₽ (Текущий)</span>
                  <span>17.00 ₽ (Девальвация)</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Базовый курс ЦБ:</span>
                  <span className="font-bold text-slate-900">{baseCnyRate} ₽</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Отклонение от базы:</span>
                  <span className={`font-bold ${simulatedCnyRate > baseCnyRate ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {(((simulatedCnyRate - baseCnyRate) / baseCnyRate) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSimulatedCnyRate(baseCnyRate)}
                className="w-full py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                Сбросить к курсу ЦБ ({baseCnyRate} ₽)
              </button>
            </div>

            {/* Impact Analysis Cards */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. New Landed Cost */}
                {(() => {
                  const baseFactoryCny = 38;
                  const newFactoryRub = Math.round(baseFactoryCny * simulatedCnyRate);
                  const newLandedCost = newFactoryRub + 279;
                  const deltaVsCurrent = newLandedCost - 790;

                  return (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Себестоимость DDP (1 шт)
                      </span>
                      <div className="text-xl font-black text-slate-900">
                        {newLandedCost} ₽
                      </div>
                      <span className={`text-[11px] font-bold ${deltaVsCurrent > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {deltaVsCurrent > 0 ? `+${deltaVsCurrent} ₽` : `${deltaVsCurrent} ₽`} к плану
                      </span>
                    </div>
                  );
                })()}

                {/* 2. Target Margin Preservation */}
                {(() => {
                  const baseFactoryCny = 38;
                  const newFactoryRub = Math.round(baseFactoryCny * simulatedCnyRate);
                  const newLandedCost = newFactoryRub + 279;
                  const recommendedRetailWb = Math.round((newLandedCost / 0.42)); // Preserve 58% margin

                  return (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Рекомендованная цена WB
                      </span>
                      <div className="text-xl font-black text-indigo-700">
                        {recommendedRetailWb} ₽
                      </div>
                      <span className="text-[10px] text-slate-500">
                        для удержания 50%+ маржи
                      </span>
                    </div>
                  );
                })()}

                {/* 3. Monthly Net Delta */}
                {(() => {
                  const baseFactoryCny = 38;
                  const newFactoryRub = Math.round(baseFactoryCny * simulatedCnyRate);
                  const newLandedCost = newFactoryRub + 279;
                  const monthlyImpact = (790 - newLandedCost) * 450;

                  return (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Влияние на прибыль / мес
                      </span>
                      <div className={`text-xl font-black ${monthlyImpact >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {monthlyImpact >= 0 ? `+${monthlyImpact.toLocaleString('ru-RU')} ₽` : `${monthlyImpact.toLocaleString('ru-RU')} ₽`}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        на объеме 450 шт/мес
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Dynamic Hedging Rule Automation */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 uppercase flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    Авто-правило защиты маржи при росте курса
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500 text-white">
                    АКТИВНО
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  При превышении курса юаня отметки <strong>14.50 ₽</strong> репрайсер автоматически скорректирует розничные цены на маркетплейсах на +4.5% для компенсации роста себестоимости партии без потери поисковых позиций.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  ShieldAlert, 
  Check, 
  Calculator,
  Sliders,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  Bot
} from 'lucide-react';
import { Product, Store, BusinessRule } from '../types';
import { CompetitorIntelligenceWidget } from './CompetitorIntelligenceWidget';
import { RuleBuilderModal } from './RuleBuilderModal';

interface Props {
  products: Product[];
  onUpdateProductPrice: (productId: string, newPrice: number) => void;
  onAskAi?: (product: Product, customPrompt?: string) => void;
  onApplyBatchPriceFix?: (updates: { productId: string; newPrice: number }[]) => void;
  currentStore?: Store;
  onAddRule?: (rule: Omit<BusinessRule, 'id'>) => void;
}

export const CompetitorRepricer: React.FC<Props> = ({
  products,
  onUpdateProductPrice,
  onAskAi,
  onApplyBatchPriceFix,
  currentStore,
  onAddRule,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product>(products[0]);
  const [simulatedPrice, setSimulatedPrice] = useState<number>(products[0]?.price || 2450);
  const [autoRepriceActive, setAutoRepriceActive] = useState<boolean>(true);
  const [isRuleBuilderOpen, setIsRuleBuilderOpen] = useState<boolean>(false);

  // Unit-economics calculation
  const cost = selectedProduct.costPrice || 800;
  const platformFee = Math.round(simulatedPrice * 0.19); // 19% commission
  const logistics = 85; // delivery to client
  const storage = 18;
  const tax = Math.round(simulatedPrice * 0.06); // 6% USN
  const netProfit = simulatedPrice - cost - platformFee - logistics - storage - tax;
  const marginPct = Math.round((netProfit / simulatedPrice) * 100);

  const undercuttingCompetitors = products.filter((p) => p.price > p.competitorPrice);

  return (
    <div id="repricer-module" className="space-y-6">
      {/* Competitor Intelligence Core Widget */}
      <CompetitorIntelligenceWidget
        products={products}
        onUpdateProductPrice={onUpdateProductPrice}
        onAskAi={onAskAi}
        onApplyBatchPriceFix={onApplyBatchPriceFix}
      />

      {/* Competitor Undercut Radar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Радар демпинга конкурентов ({undercuttingCompetitors.length} тревог)
            </h2>
            <p className="text-xs text-slate-500">
              Отслеживание изменений цен конкурентов в реальном времени с защитой минимальной маржинальности
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onAddRule && (
              <button
                id="repricer-open-rule-builder-btn"
                onClick={() => setIsRuleBuilderOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>+ Бизнес-правило репрайсера (Rule Builder)</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Авто-репрайсер:</span>
              <button
                id="toggle-auto-repricer-btn"
                onClick={() => setAutoRepriceActive(!autoRepriceActive)}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                  autoRepriceActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${autoRepriceActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                {autoRepriceActive ? 'Активен (Smart Protection)' : 'Выключен'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {undercuttingCompetitors.map((p) => {
            const diff = p.price - p.competitorPrice;
            return (
              <div 
                key={p.id}
                className="bg-slate-50 border border-rose-200 rounded-xl p-4 space-y-3 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-purple-700 font-bold uppercase">
                      {p.marketplace.toUpperCase()} • {p.sku}
                    </span>
                    <h4 className="font-semibold text-slate-900 text-xs truncate mt-0.5" title={p.name}>
                      {p.name}
                    </h4>
                  </div>
                  <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded font-bold shrink-0">
                    Демпинг: -{diff} ₽
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Ваша цена</span>
                    <span className="font-bold text-slate-900 text-sm">{p.price} ₽</span>
                  </div>
                  <div className="text-slate-400 font-medium">vs</div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[10px] block truncate max-w-[100px]">{p.competitorName}</span>
                    <span className="font-bold text-rose-600 text-sm">{p.competitorPrice} ₽</span>
                  </div>
                </div>

                <button
                  id={`match-price-${p.id}`}
                  onClick={() => onUpdateProductPrice(p.id, p.competitorPrice)}
                  className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Выровнять до {p.competitorPrice} ₽ (1 клик)</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Unit Economics Calculator */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              Калькулятор юнит-экономики и маржинальности
            </h3>
            <p className="text-xs text-slate-500">
              Мгновенный расчет чистой прибыли с учетом комиссий WB/Ozon, логистики и налогов
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Controls */}
          <div className="lg:col-span-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Выберите товар для симуляции:
              </label>
              <select
                id="unit-eco-select-product"
                value={selectedProduct.id}
                onChange={(e) => {
                  const found = products.find((p) => p.id === e.target.value);
                  if (found) {
                    setSelectedProduct(found);
                    setSimulatedPrice(found.price);
                  }
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Текущая: {p.price} ₽ (Себестоимость: {p.costPrice} ₽)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Симулируемая розничная цена:</span>
                <span className="text-emerald-700 font-bold text-sm">{simulatedPrice} ₽</span>
              </div>
              <input
                id="unit-eco-price-slider"
                type="range"
                min={cost + 100}
                max={cost * 5}
                step={10}
                value={simulatedPrice}
                onChange={(e) => setSimulatedPrice(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Мин: {cost + 100} ₽</span>
                <span>Себестоимость: {cost} ₽</span>
                <span>Макс: {cost * 5} ₽</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                id="apply-simulated-price-btn"
                onClick={() => onUpdateProductPrice(selectedProduct.id, simulatedPrice)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Применить цену {simulatedPrice} ₽ к карточке</span>
              </button>
            </div>
          </div>

          {/* Breakdown Summary */}
          <div className="lg:col-span-6 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800">Структура себестоимости и расходов:</span>
              <span className="text-xs text-slate-500">1 ед. товара</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>• Себестоимость закупки/пошива:</span>
                <span className="text-slate-900 font-mono font-medium">{cost} ₽</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>• Комиссия площадки (19%):</span>
                <span className="text-slate-900 font-mono font-medium">{platformFee} ₽</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>• Логистика FBO + хранение:</span>
                <span className="text-slate-900 font-mono font-medium">{logistics + storage} ₽</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>• Налог УСН (6%):</span>
                <span className="text-slate-900 font-mono font-medium">{tax} ₽</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">Чистая прибыль с 1 шт:</span>
                <span className={`text-lg font-bold ${netProfit > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {netProfit > 0 ? `+${netProfit} ₽` : `${netProfit} ₽`}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 block">Маржинальность:</span>
                <span className={`text-lg font-bold ${marginPct >= 20 ? 'text-emerald-700' : marginPct > 0 ? 'text-amber-700' : 'text-rose-600'}`}>
                  {marginPct}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guided Rule Builder Modal */}
      {currentStore && onAddRule && (
        <RuleBuilderModal
          isOpen={isRuleBuilderOpen}
          onClose={() => setIsRuleBuilderOpen(false)}
          onSaveRule={onAddRule}
          products={products}
          currentStore={currentStore}
        />
      )}
    </div>
  );
};

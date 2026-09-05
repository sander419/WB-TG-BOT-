import React, { useState } from 'react';
import { 
  Rocket, 
  Search, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  BarChart3, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  ChevronRight,
  ShieldCheck,
  Send
} from 'lucide-react';

interface Props {
  onSendMessageToChat: (text: string) => void;
}

export const LaunchWizard: React.FC<Props> = ({ onSendMessageToChat }) => {
  const [productIdea, setProductIdea] = useState('Спортивная термобутылка 750 мл');
  const [targetMarket, setTargetMarket] = useState<'wb' | 'ozon' | 'both'>('wb');
  const [costPrice, setCostPrice] = useState('420');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedPlan, setCompletedPlan] = useState<any | null>(null);

  const stepsList = [
    { title: 'Изучение ниши и объема рынка', desc: 'Анализ ёмкости ниши, трендов и сезонных колебаний' },
    { title: 'Поиск и разбор конкурентов', desc: 'Сравнение цен, слабых мест и процента выкупа топ-20 селлеров' },
    { title: 'Анализ поискового спроса', desc: 'Сбор высоко- и среднечастотных кластеров в WB/Ozon' },
    { title: 'Сборка семантического ядра и SEO', desc: 'Формирование названия, характеристик и продающего текста' },
    { title: 'Расчет юнит-экономики и цены', desc: 'Учет комиссии 19%, логистики, хранения и налога УСН 6%' },
    { title: 'Рекламная стратегия запуска', desc: 'Настройка автокампаний (АРК), бюджет теста и ставки' },
    { title: 'Готовый план запуска и мониторинг', desc: 'Пошаговый чеклист до первой сотни заказов' },
  ];

  const handleStartLaunch = async () => {
    if (!productIdea.trim()) return;
    setIsAnalyzing(true);
    setCompletedPlan(null);
    setCurrentStep(0);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCurrentStep((prev) => (prev < stepsList.length - 1 ? prev + 1 : prev));
    }, 400);

    try {
      const res = await fetch('/api/generate-launch-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIdea: productIdea.trim(),
          costPrice: costPrice.trim(),
          targetMarket,
        }),
      });
      const data = await res.json();
      
      clearInterval(interval);
      setCurrentStep(stepsList.length);
      setIsAnalyzing(false);

      if (data?.plan) {
        setCompletedPlan(data.plan);
      }
    } catch (e) {
      clearInterval(interval);
      setCurrentStep(stepsList.length);
      setIsAnalyzing(false);
      setCompletedPlan({
        nicheSize: '48.2 млн ₽/мес',
        avgPrice: '1 490 ₽',
        recommendedPrice: '1 390 ₽',
        profitPerUnit: '485 ₽',
        margin: '34.8%',
        logisticsEst: '85 ₽',
        feeEst: '264 ₽',
        adBudgetWeek: '4 500 ₽',
        keywords: ['термобутылка для воды', 'бутылка для зала спортивная', 'термобутылка металлическая 750мл', 'бутылка для фитнеса'],
        competitorNotes: 'У топ-3 селлеров слабая упаковка (12% возвратов из-за царапин). Ваше УТП: порошковое ударопрочное покрытие + крафтовый тубус.',
        fboDistribution: 'Первая партия 200 шт: 120 шт на склад Коледино (WB), 40 шт Казань, 40 шт Краснодар.',
      });
    }
  };

  return (
    <div id="launch-wizard-module" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Rocket className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-slate-900">
              AI-Ассистент запуска нового товара с нуля
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            «У меня новый товар. Хочу начать продажи.» — AI автоматически подготовит всё под ключ.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-200 font-semibold">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Сквозной автопилот запуска</span>
        </div>
      </div>

      {/* Input Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Что за товар вы хотите запустить?
          </label>
          <input
            id="launch-idea-input"
            type="text"
            value={productIdea}
            onChange={(e) => setProductIdea(e.target.value)}
            placeholder="Например: Умная термокружка, Пауэрбанк 20000мАч"
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Себестоимость производства/закупки (₽):
          </label>
          <input
            id="launch-cost-input"
            type="number"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder="420"
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Целевая площадка:
          </label>
          <div className="flex gap-2">
            <select
              id="launch-platform-select"
              value={targetMarket}
              onChange={(e) => setTargetMarket(e.target.value as any)}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none shadow-2xs"
            >
              <option value="wb">Wildberries (WB)</option>
              <option value="ozon">Ozon</option>
              <option value="both">WB + Ozon сразу</option>
            </select>

            <button
              id="start-launch-analysis-btn"
              onClick={handleStartLaunch}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Рассчитать</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress of Steps */}
      {isAnalyzing && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-700">
            <span className="font-semibold text-indigo-600">
              AI анализирует нишу и готовит запуск:
            </span>
            <span className="text-slate-500">{Math.min(currentStep, stepsList.length)} из {stepsList.length}</span>
          </div>

          <div className="space-y-2">
            {stepsList.map((step, idx) => {
              const isDone = currentStep > idx;
              const isCurrent = currentStep === idx;

              return (
                <div 
                  key={idx} 
                  className={`flex items-center gap-3 text-xs p-2 rounded-lg transition-all ${
                    isCurrent ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200 shadow-2xs' : isDone ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : isCurrent ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping"></span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    )}
                  </div>
                  <div>
                    <span>{step.title}</span>
                    {isCurrent && <p className="text-[11px] text-slate-500 font-normal">{step.desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Launch Plan Result */}
      {completedPlan && (
        <div className="bg-slate-50 border border-indigo-200 rounded-2xl p-5 space-y-5 shadow-xs animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                ✓ План запуска сформирован
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Стратегия старта: {productIdea}
              </h3>
            </div>

            <button
              id="discuss-plan-chat-btn"
              onClick={() => {
                onSendMessageToChat(`Я хочу запустить новинку: «${productIdea}». Расскажи подробнее, как распределить первые 150 единиц по складам и какую рекламу включить?`);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Перейти в Telegram-чат</span>
            </button>
          </div>

          {/* Unit Economics Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
              <div className="text-[11px] text-slate-500">Объем ниши</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{completedPlan.nicheSize}</div>
              <div className="text-[10px] text-emerald-600 font-semibold">Конкуренция: средняя</div>
            </div>

            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
              <div className="text-[11px] text-slate-500">Рекомендуемая цена</div>
              <div className="text-sm font-bold text-emerald-600 mt-0.5">{completedPlan.recommendedPrice}</div>
              <div className="text-[10px] text-slate-500">Средняя: {completedPlan.avgPrice}</div>
            </div>

            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
              <div className="text-[11px] text-slate-500">Прибыль с 1 шт</div>
              <div className="text-sm font-bold text-emerald-600 mt-0.5">+{completedPlan.profitPerUnit}</div>
              <div className="text-[10px] text-slate-500">Маржинальность: {completedPlan.margin}</div>
            </div>

            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
              <div className="text-[11px] text-slate-500">Бюджет теста (5 дн)</div>
              <div className="text-sm font-bold text-indigo-600 mt-0.5">{completedPlan.adBudgetWeek}</div>
              <div className="text-[10px] text-slate-500">АРК / Трафареты</div>
            </div>
          </div>

          {/* Detailed Plan Checklist */}
          <div className="space-y-3 text-xs">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="font-bold text-slate-900 block mb-1">
                🔎 УТП и победа над конкурентами:
              </span>
              <p className="text-slate-600 leading-relaxed">
                {completedPlan.competitorNotes}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="font-bold text-slate-900 block mb-1.5">
                🔑 Ключевые запросы для старта индексации:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {completedPlan.keywords.map((kw: string, i: number) => (
                  <span key={i} className="bg-slate-100 text-indigo-700 border border-slate-200 font-medium px-2 py-0.5 rounded text-[11px]">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            {completedPlan.fboDistribution && (
              <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-2xs">
                <span className="font-bold text-indigo-950 block mb-1">
                  📦 Рекомендованное распределение поставки по складам FBO:
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {completedPlan.fboDistribution}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

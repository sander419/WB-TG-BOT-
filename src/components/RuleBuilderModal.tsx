import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  Sliders, 
  Bot, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  Tag,
  Package,
  TrendingDown,
  MessageSquare,
  DollarSign,
  Layers,
  HelpCircle
} from 'lucide-react';
import { BusinessRule, Product, Store } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveRule: (rule: Omit<BusinessRule, 'id'>) => void;
  products: Product[];
  currentStore: Store;
}

interface TriggerOption {
  id: string;
  category: BusinessRule['category'];
  label: string;
  fieldCode: string;
  defaultOperator: '<' | '<=' | '>' | '>=' | '=' | '!=';
  defaultValue: number | string;
  unit: string;
  hint: string;
  recommendedThreshold: string;
}

interface ActionOption {
  id: string;
  label: string;
  actionCode: string;
  description: string;
  category: BusinessRule['category'];
  paramLabel?: string;
  paramDefault?: string | number;
  paramUnit?: string;
}

interface PresetRecipe {
  title: string;
  category: BusinessRule['category'];
  badge: string;
  triggerId: string;
  operator: '<' | '<=' | '>' | '>=' | '=' | '!=';
  value: number;
  actionId: string;
  actionParam?: string | number;
  scope: string;
  description: string;
}

const TRIGGER_OPTIONS: TriggerOption[] = [
  // Inventory
  {
    id: 'stock_days',
    category: 'inventory',
    label: 'Запас товара на складе (дней до обнуления)',
    fieldCode: 'stock_days',
    defaultOperator: '<',
    defaultValue: 7,
    unit: 'дней',
    hint: 'Рассчитывается на основе текущей скорости продаж (Daily Velocity).',
    recommendedThreshold: '< 7 дн.',
  },
  {
    id: 'stock_fbo',
    category: 'inventory',
    label: 'Фактический остаток на складе FBO',
    fieldCode: 'stock_fbo_qty',
    defaultOperator: '<',
    defaultValue: 30,
    unit: 'шт.',
    hint: 'Критический остаток на основном складе маркетплейса.',
    recommendedThreshold: '< 30 шт.',
  },
  {
    id: 'daily_velocity_surge',
    category: 'inventory',
    label: 'Резкий рост скорости заказов (всплеск спроса)',
    fieldCode: 'daily_orders',
    defaultOperator: '>',
    defaultValue: 25,
    unit: 'шт./день',
    hint: 'Сигнализирует о необходимости зарезервировать дополнительный объем.',
    recommendedThreshold: '> 25 шт./день',
  },

  // Pricing
  {
    id: 'competitor_price_undercut',
    category: 'pricing',
    label: 'Разница с ценой ключевого конкурента',
    fieldCode: 'competitor_price_diff',
    defaultOperator: '>',
    defaultValue: 100,
    unit: '₽',
    hint: 'Конкурент установил цену ниже нашей на указанную сумму.',
    recommendedThreshold: '> 100 ₽',
  },
  {
    id: 'margin_threshold',
    category: 'pricing',
    label: 'Рентабельность / Маржинальность товара',
    fieldCode: 'margin_percent',
    defaultOperator: '<',
    defaultValue: 22,
    unit: '%',
    hint: 'Защита от ухода в минус при авто-скидках и акциях маркетплейса.',
    recommendedThreshold: '< 22%',
  },
  {
    id: 'competitor_discount_percent',
    category: 'pricing',
    label: 'Скидка конкурента превышает нашу',
    fieldCode: 'competitor_undercut_pct',
    defaultOperator: '>',
    defaultValue: 10,
    unit: '%',
    hint: 'Демпинг конкурента в категории более чем на X процентов.',
    recommendedThreshold: '> 10%',
  },

  // Advertising
  {
    id: 'drr_overflow',
    category: 'advertising',
    label: 'ДРР (Доля рекламных расходов) авторекламы',
    fieldCode: 'drr_percent',
    defaultOperator: '>',
    defaultValue: 12,
    unit: '%',
    hint: 'Превышение допустимой доли рекламы в выручке товара.',
    recommendedThreshold: '> 12%',
  },
  {
    id: 'ad_spend_no_orders',
    category: 'advertising',
    label: 'Расход на авторекламу без единого заказа',
    fieldCode: 'ad_spend_zero_orders',
    defaultOperator: '>',
    defaultValue: 1500,
    unit: '₽/день',
    hint: 'Слив бюджета на нерелевантные мусорные поисковые фразы.',
    recommendedThreshold: '> 1 500 ₽',
  },
  {
    id: 'ad_ctr_drop',
    category: 'advertising',
    label: 'CTR (кликабельность) рекламной кампании',
    fieldCode: 'ad_ctr',
    defaultOperator: '<',
    defaultValue: 2.5,
    unit: '%',
    hint: 'Низкая кликабельность снижает качество кампании и увеличивает CPC.',
    recommendedThreshold: '< 2.5%',
  },

  // Search Rank & SEO
  {
    id: 'rank_drop_delta',
    category: 'rank',
    label: 'Падение поисковой позиции (дельта мест)',
    fieldCode: 'rank_drop_delta',
    defaultOperator: '>=',
    defaultValue: 5,
    unit: 'позиций',
    hint: 'Резкая просадка в органической выдаче маркетплейса.',
    recommendedThreshold: '>= 5 мест',
  },
  {
    id: 'content_health_score',
    category: 'rank',
    label: 'Индекс качества карточки Content Health',
    fieldCode: 'content_health_score',
    defaultOperator: '<',
    defaultValue: 75,
    unit: '/ 100 баллов',
    hint: 'Снижение оптимизации заголовка, инфографики или rich-контента.',
    recommendedThreshold: '< 75 / 100',
  },
  {
    id: 'top10_rank_lost',
    category: 'rank',
    label: 'Вылет из ТОП-10 по главному ключу (позиция)',
    fieldCode: 'search_rank',
    defaultOperator: '>',
    defaultValue: 10,
    unit: 'место',
    hint: 'Потеря флагманских позиций на первой странице выдачи.',
    recommendedThreshold: '> 10 место',
  },

  // Safety & Ratings
  {
    id: 'incoming_negative_review',
    category: 'safety',
    label: 'Оценка нового поступившего отзыва',
    fieldCode: 'incoming_review_stars',
    defaultOperator: '<=',
    defaultValue: 3,
    unit: '★',
    hint: 'Негативный отзыв покупателя, требующий срочного ответа.',
    recommendedThreshold: '<= 3★',
  },
  {
    id: 'product_rating_floor',
    category: 'safety',
    label: 'Средний рейтинг карточки товара',
    fieldCode: 'avg_rating',
    defaultOperator: '<',
    defaultValue: 4.7,
    unit: '★',
    hint: 'Снижение рейтинга товара ниже безопасного порога категории.',
    recommendedThreshold: '< 4.7★',
  },
];

const ACTION_OPTIONS: ActionOption[] = [
  // Pricing
  {
    id: 'auto_reprice_match',
    category: 'pricing',
    label: 'Выровнять цену с конкурентом (с защитой мин. маржи)',
    actionCode: 'AUTO_REPRICE_MATCH',
    description: 'Пересчитать розничную цену до уровня конкурента, строго гарантируя сохранение себестоимости.',
    paramLabel: 'Минимальный порог маржи',
    paramDefault: 20,
    paramUnit: '%',
  },
  {
    id: 'auto_reprice_undercut',
    category: 'pricing',
    label: 'Установить цену на X ₽ ниже конкурента',
    actionCode: 'AUTO_REPRICE_UNDERCUT',
    description: 'Опередить конкурента на фиксированную сумму в рамках установленного коридора цен.',
    paramLabel: 'Разница в цене',
    paramDefault: 50,
    paramUnit: '₽',
  },
  {
    id: 'lock_price_floor',
    category: 'pricing',
    label: 'Заблокировать цену и отключить авто-акции маркетплейса',
    actionCode: 'LOCK_PRICE_FLOOR',
    description: 'Предотвратить принудительное участие в убыточных промо-кампаниях маркетплейса.',
  },

  // Inventory
  {
    id: 'create_fbo_supply',
    category: 'inventory',
    label: 'Сформировать черновик срочной поставки на FBO склад',
    actionCode: 'CREATE_FBO_SUPPLY_DRAFT',
    description: 'Рассчитать оптимальную партию и создать предварительный заказ поставки в ЛК продавца.',
    paramLabel: 'Объем поставки',
    paramDefault: 150,
    paramUnit: 'шт.',
  },
  {
    id: 'switch_to_fbs_backup',
    category: 'inventory',
    label: 'Подключить резервный склад FBS для предотвращения OOS',
    actionCode: 'ACTIVATE_FBS_BACKUP',
    description: 'Включить отгрузку со своего склада, если остатки FBO подходят к нулю.',
  },

  // Advertising
  {
    id: 'pause_ad_campaign',
    category: 'advertising',
    label: 'Приостановить АРК и очистить нерелевантные минус-фразы',
    actionCode: 'PAUSE_AND_CLEAN_AD',
    description: 'Остановить неэффективный слив бюджета и отправить мусорные кластеры в минус-слова.',
  },
  {
    id: 'boost_ad_bid',
    category: 'advertising',
    label: 'Поднять ставку авторекламы для удержания позиций',
    actionCode: 'BOOST_AD_BID',
    description: 'Точечно увеличить CPM/CPC на целевые конверсионные фразы для отвоевания ТОП-мест.',
    paramLabel: 'Повышение ставки',
    paramDefault: 15,
    paramUnit: '%',
  },

  // Rank & SEO
  {
    id: 'optimize_content_health',
    category: 'rank',
    label: 'Запустить авто-аудит и оптимизацию Content Health',
    actionCode: 'TRIGGER_CONTENT_HEALTH_OPTIMIZATION',
    description: 'Скорректировать поисковые кластеры в заголовке, спецификациях и описании товара.',
  },
  {
    id: 'diagnostics_root_cause',
    category: 'rank',
    label: 'Запустить полный цикл Diagnostics Engine с записью в аудит-лог',
    actionCode: 'RUN_DIAGNOSTICS_ENGINE',
    description: 'Мгновенно выявить скрытые причины просадки и сформировать план восстановления.',
  },

  // Safety & Reviews
  {
    id: 'draft_ai_review_reply',
    category: 'safety',
    label: 'Сгенерировать вежливый ответ на отзыв с компенсацией',
    actionCode: 'DRAFT_AI_REVIEW_REPLY',
    description: 'Подготовить дипломатичный ответ от лица бренда для защиты лояльности покупателей.',
  },
  {
    id: 'send_telegram_alert',
    category: 'safety',
    label: 'Отправить срочный пуш в Telegram владельцу магазина',
    actionCode: 'SEND_TELEGRAM_URGENT_PUSH',
    description: 'Мгновенное уведомление с карточкой быстрого действия (1-Click Approve).',
    paramLabel: 'Приоритет пуша',
    paramDefault: 'HIGH_PRIORITY',
    paramUnit: 'уровень',
  },
];

const PRESET_RECIPES: PresetRecipe[] = [
  {
    title: 'Защита от Out-of-Stock (FBO Stockout Guard)',
    category: 'inventory',
    badge: '📦 Склад & Логистика',
    triggerId: 'stock_days',
    operator: '<',
    value: 7,
    actionId: 'create_fbo_supply',
    actionParam: 150,
    scope: 'all',
    description: 'Автоматически сформировать черновик поставки на 150 шт., если остаток товара опустится ниже 7 дней.',
  },
  {
    title: 'Защита маржи при демпинге конкурентов',
    category: 'pricing',
    badge: '💰 Цены & Защита',
    triggerId: 'competitor_price_undercut',
    operator: '>',
    value: 100,
    actionId: 'auto_reprice_match',
    actionParam: 22,
    scope: 'all',
    description: 'Выровнять цену с конкурентом, строго гарантируя сохранение минимальной маржи не менее 22%.',
  },
  {
    title: 'Стоп-кран на неэффективную рекламу (ДРР > 12%)',
    category: 'advertising',
    badge: '📢 Реклама & Бюджет',
    triggerId: 'drr_overflow',
    operator: '>',
    value: 12,
    actionId: 'pause_ad_campaign',
    scope: 'all',
    description: 'Приостановить рекламную кампанию АРК и отфильтровать минус-фразы при превышении ДРР 12%.',
  },
  {
    title: 'Rank Drop Guard: Авто-диагностика при падении',
    category: 'rank',
    badge: '📈 Позиции & Органика',
    triggerId: 'rank_drop_delta',
    operator: '>=',
    value: 5,
    actionId: 'diagnostics_root_cause',
    scope: 'all',
    description: 'Запустить Diagnostics Engine при падении поисковой позиции на 5+ мест и зафиксировать в аудит-логе.',
  },
  {
    title: 'Защита репутации: Реагирование на негатив ≤ 3★',
    category: 'safety',
    badge: '🛡️ Рейтинг & Отзывы',
    triggerId: 'incoming_negative_review',
    operator: '<=',
    value: 3,
    actionId: 'draft_ai_review_reply',
    scope: 'all',
    description: 'Мгновенно подготовить извинительный ответ на негативный отзыв и направить пуш в Telegram.',
  },
];

export const RuleBuilderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSaveRule,
  products,
  currentStore,
}) => {
  // Builder state
  const [selectedCategory, setSelectedCategory] = useState<BusinessRule['category']>('inventory');
  const [selectedTriggerId, setSelectedTriggerId] = useState<string>('stock_days');
  const [selectedOperator, setSelectedOperator] = useState<'<' | '<=' | '>' | '>=' | '=' | '!='>('<');
  const [triggerValue, setTriggerValue] = useState<number>(7);
  const [targetScope, setTargetScope] = useState<string>('all'); // 'all' | 'category' | productId
  const [selectedActionId, setSelectedActionId] = useState<string>('create_fbo_supply');
  const [actionParamValue, setActionParamValue] = useState<string | number>(150);
  const [executionMode, setExecutionMode] = useState<'safe' | 'auto'>('safe');
  const [customDescription, setCustomDescription] = useState<string>('');

  if (!isOpen) return null;

  const currentTrigger = TRIGGER_OPTIONS.find(t => t.id === selectedTriggerId) || TRIGGER_OPTIONS[0];
  const currentAction = ACTION_OPTIONS.find(a => a.id === selectedActionId) || ACTION_OPTIONS[0];

  // When category changes, auto-select first trigger and action for that category
  const handleCategoryChange = (cat: BusinessRule['category']) => {
    setSelectedCategory(cat);
    const firstTrigger = TRIGGER_OPTIONS.find(t => t.category === cat) || TRIGGER_OPTIONS[0];
    setSelectedTriggerId(firstTrigger.id);
    setSelectedOperator(firstTrigger.defaultOperator);
    setTriggerValue(Number(firstTrigger.defaultValue) || 0);

    const firstAction = ACTION_OPTIONS.find(a => a.category === cat) || ACTION_OPTIONS[0];
    setSelectedActionId(firstAction.id);
    if (firstAction.paramDefault !== undefined) {
      setActionParamValue(firstAction.paramDefault);
    }
  };

  const handleTriggerChange = (triggerId: string) => {
    setSelectedTriggerId(triggerId);
    const tr = TRIGGER_OPTIONS.find(t => t.id === triggerId);
    if (tr) {
      setSelectedOperator(tr.defaultOperator);
      setTriggerValue(Number(tr.defaultValue) || 0);
      setSelectedCategory(tr.category);
    }
  };

  const handleActionChange = (actionId: string) => {
    setSelectedActionId(actionId);
    const act = ACTION_OPTIONS.find(a => a.id === actionId);
    if (act && act.paramDefault !== undefined) {
      setActionParamValue(act.paramDefault);
    }
  };

  const applyPresetRecipe = (preset: PresetRecipe) => {
    setSelectedCategory(preset.category);
    setSelectedTriggerId(preset.triggerId);
    setSelectedOperator(preset.operator);
    setTriggerValue(preset.value);
    setSelectedActionId(preset.actionId);
    if (preset.actionParam !== undefined) {
      setActionParamValue(preset.actionParam);
    }
    setTargetScope(preset.scope);
    setCustomDescription(preset.description);
  };

  // Construct readable syntax
  const targetScopeText = targetScope === 'all' 
    ? 'Все товары' 
    : targetScope.startsWith('cat_')
    ? `Категория: ${targetScope.replace('cat_', '')}`
    : `Товар: ${products.find(p => p.id === targetScope)?.name.slice(0, 24) || targetScope}...`;

  const generatedCondition = `IF ${currentTrigger.fieldCode} ${selectedOperator} ${triggerValue} [${targetScopeText}]`;
  
  const generatedAction = currentAction.paramLabel 
    ? `${currentAction.actionCode}(${actionParamValue} ${currentAction.paramUnit || ''})`
    : `${currentAction.actionCode}()`;

  const generatedHumanDescription = customDescription.trim() || (
    `Если ${currentTrigger.label.toLowerCase()} ${selectedOperator} ${triggerValue} ${currentTrigger.unit} (${targetScopeText.toLowerCase()}), то ${currentAction.label.toLowerCase()}${currentAction.paramLabel ? ` [${currentAction.paramLabel}: ${actionParamValue} ${currentAction.paramUnit || ''}]` : ''}. Режим: ${executionMode === 'safe' ? 'Safe Confirmation (запрос подтверждения)' : 'Autonomous'}.`
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const newRule: Omit<BusinessRule, 'id'> = {
      storeId: currentStore.id,
      condition: generatedCondition,
      action: generatedAction,
      description: generatedHumanDescription,
      enabled: true,
      category: selectedCategory,
    };

    onSaveRule(newRule);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl relative my-6 max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Конструктор правил (Guided Rule Builder)
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                No-Code
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Создайте бизнес-правило из выпадающих списков триггеров и действий без ручного ввода кода
            </p>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto pr-1 space-y-6 pt-4 flex-1">
          {/* Quick Preset Recipes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Готовые рецепты правил (1-клик шаблон):
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {PRESET_RECIPES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPresetRecipe(preset)}
                  className="text-left p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all cursor-pointer group space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-indigo-700">
                      {preset.badge}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Применить ↗
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-900 line-clamp-1">
                    {preset.title}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <form id="rule-builder-form" onSubmit={handleSave} className="space-y-5">
            {/* Category Selector Tabs */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                1. Выберите сферу автоматизации:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'inventory', label: 'Остатки & Склад', icon: Package },
                  { id: 'pricing', label: 'Цены & Маржа', icon: DollarSign },
                  { id: 'advertising', label: 'Реклама & ДРР', icon: Tag },
                  { id: 'rank', label: 'Позиции & SEO', icon: TrendingDown },
                  { id: 'safety', label: 'Отзывы & Защита', icon: ShieldCheck },
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryChange(cat.id as any)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span className="text-center text-[11px] leading-tight">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 1: TRIGGER (IF) */}
            <div className="p-4 sm:p-5 rounded-2xl border border-indigo-100 bg-indigo-50/30 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[11px] font-black uppercase">
                  IF (ЕСЛИ)
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Условие срабатывания триггера
                </span>
              </div>

              {/* Trigger Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Отслеживаемый показатель (Метрика):
                </label>
                <select
                  value={selectedTriggerId}
                  onChange={(e) => handleTriggerChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {TRIGGER_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      [{opt.category.toUpperCase()}] {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  ℹ️ {currentTrigger.hint}
                </p>
              </div>

              {/* Operator and Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Оператор сравнения:
                  </label>
                  <select
                    value={selectedOperator}
                    onChange={(e) => setSelectedOperator(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  >
                    <option value="<">&lt; Меньше чем</option>
                    <option value="<=">&le; Меньше или равно</option>
                    <option value=">">&gt; Больше чем</option>
                    <option value=">=">&ge; Больше или равно</option>
                    <option value="=">= Равно</option>
                    <option value="!=">&ne; Не равно</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Пороговое значение:
                    </label>
                    <span className="text-[10px] text-indigo-600 font-semibold">
                      Норма: {currentTrigger.recommendedThreshold}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={triggerValue}
                      onChange={(e) => setTriggerValue(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 pr-12"
                      required
                    />
                    <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400">
                      {currentTrigger.unit}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Область действия (Scope):
                  </label>
                  <select
                    value={targetScope}
                    onChange={(e) => setTargetScope(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                  >
                    <option value="all">📦 Ко всему каталогу магазина</option>
                    <option value="cat_Одежда">Категория: Одежда</option>
                    <option value="cat_Аксессуары">Категория: Аксессуары</option>
                    <option value="cat_Электроника">Категория: Электроника</option>
                    <optgroup label="Конкретный артикул">
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name.slice(0, 30)}... ({p.sku})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>

            {/* STEP 2: ACTION (THEN) */}
            <div className="p-4 sm:p-5 rounded-2xl border border-emerald-100 bg-emerald-50/30 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-emerald-100">
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-black uppercase">
                  THEN (ТО)
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Автономное действие системы
                </span>
              </div>

              {/* Action Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Действие из каталога исполнителей:
                </label>
                <select
                  value={selectedActionId}
                  onChange={(e) => handleActionChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  {ACTION_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      [{opt.category.toUpperCase()}] {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  ⚡ {currentAction.description}
                </p>
              </div>

              {/* Action Dynamic Parameter & Execution Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentAction.paramLabel ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {currentAction.paramLabel}:
                    </label>
                    <div className="relative">
                      <input
                        type={typeof currentAction.paramDefault === 'number' ? 'number' : 'text'}
                        value={actionParamValue}
                        onChange={(e) => setActionParamValue(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 pr-12"
                      />
                      {currentAction.paramUnit && (
                        <span className="absolute right-3 top-2 text-[11px] font-bold text-slate-400">
                          {currentAction.paramUnit}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Параметры запуска:
                    </label>
                    <div className="px-3 py-2 bg-slate-100 rounded-xl text-xs text-slate-500">
                      Стандартный автоматический регламент
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Режим безопасности исполнения:
                  </label>
                  <select
                    value={executionMode}
                    onChange={(e) => setExecutionMode(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                  >
                    <option value="safe">🛡️ Safe Confirmation (Запрос в Telegram / UI)</option>
                    <option value="auto">⚡ Autonomous (Авто-исполнение + лог)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Custom Description (Optional) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Пояснение для команды (человекопонятное описание):
              </label>
              <input
                type="text"
                placeholder={generatedHumanDescription}
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Live Rule Code & Flow Preview */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2.5 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                <span className="flex items-center gap-1.5 font-sans font-bold">
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  Предпросмотр скомпилированного правила
                </span>
                <span className="text-emerald-400 font-semibold font-sans text-[10px]">
                  ✓ Синтаксис валиден
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                <span className="text-indigo-300 font-bold">
                  {generatedCondition}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0 hidden sm:block" />
                <span className="text-emerald-300 font-bold">
                  {generatedAction}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 font-sans leading-relaxed pt-1">
                📝 <strong>Логика:</strong> {generatedHumanDescription}
              </p>
            </div>
          </form>
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Отмена
          </button>

          <button
            type="submit"
            form="rule-builder-form"
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Сохранить и активировать правило</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  X, 
  Package, 
  Sliders, 
  FileText, 
  ArrowRight, 
  Sparkles, 
  ExternalLink,
  Bot,
  Layers,
  HelpCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Zap,
  ShoppingBag,
  Factory,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { Product, BusinessRule, AuditLogItem } from '../types';

export type SearchCategory = 'all' | 'products' | 'rules' | 'audit' | 'navigation';

interface Props {
  products: Product[];
  rules: BusinessRule[];
  auditLogs: AuditLogItem[];
  onSelectProduct: (product: Product) => void;
  onSelectRule: (rule: BusinessRule) => void;
  onSelectAuditLog: (log: AuditLogItem) => void;
  onSelectTab: (tab: 'dashboard' | 'telegram' | 'catalog' | 'seo' | 'repricer' | 'china' | 'launch' | 'reviews' | 'alerts' | 'architecture') => void;
}

interface NavItem {
  id: string;
  title: string;
  tab: 'dashboard' | 'telegram' | 'catalog' | 'seo' | 'repricer' | 'china' | 'launch' | 'reviews' | 'alerts' | 'architecture';
  description: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'nav-dashboard',
    title: 'Главный Дашборд магазина',
    tab: 'dashboard',
    description: 'KPI выручки, маржа, AI-Пульс, сводка здоровья и возможности',
    keywords: ['дашборд', 'главная', 'выручка', 'прибыль', 'kpi', 'пульс', 'статистика'],
    icon: Sparkles,
    badge: 'Overview',
  },
  {
    id: 'nav-telegram',
    title: 'AI-Менеджер (Telegram Bot)',
    tab: 'telegram',
    description: 'Диалоговое управление, готовые сценарии, голосовые команды',
    keywords: ['чат', 'телеграм', 'telegram', 'бот', 'ассистент', 'ai', 'вопрос', 'голос'],
    icon: Bot,
    badge: 'AI Chat',
  },
  {
    id: 'nav-catalog',
    title: 'Каталог товаров & Остатки',
    tab: 'catalog',
    description: 'Управление SKU, складские остатки FBO/FBS, цены и маржинальность',
    keywords: ['каталог', 'товары', 'остатки', 'склад', 'fbo', 'fbs', 'цены', 'sku', 'поставки'],
    icon: Package,
    badge: 'Catalog',
  },
  {
    id: 'nav-seo',
    title: 'Rank & SEO Студия',
    tab: 'seo',
    description: 'Позиции в поиске WB/Ozon, частотные кластеры, Rich-контент',
    keywords: ['seo', 'позиции', 'ранг', 'поиск', 'ключи', 'ключевые слова', 'семантика', 'rich'],
    icon: Search,
    badge: 'SEO',
  },
  {
    id: 'nav-repricer',
    title: 'Динамический Репрайсер',
    tab: 'repricer',
    description: 'Мониторинг цен конкурентов, анти-демпинг, коридоры цен',
    keywords: ['репрайсер', 'цены', 'конкуренты', 'демпинг', 'repricer', 'скидки', 'ценообразование'],
    icon: Zap,
    badge: 'Repricer',
  },
  {
    id: 'nav-china',
    title: 'China Sourcing Hub (1688)',
    tab: 'china',
    description: 'Прямой поиск фабрик в Китае, расчет себестоимости и DDP-логистика',
    keywords: ['китай', '1688', 'фабрики', 'сорсинг', 'закупки', 'юани', 'china', 'ddp', 'поставщики'],
    icon: Factory,
    badge: '1688 Sourcing',
  },
  {
    id: 'nav-launch',
    title: 'Launch Wizard (Новинки)',
    tab: 'launch',
    description: '16 шагов вывода новинки в ТОП маркетплейса за 30 дней',
    keywords: ['запуск', 'новинка', 'вывод в топ', 'launch', 'план', 'старт', 'продвижение'],
    icon: ShoppingBag,
    badge: 'Launch',
  },
  {
    id: 'nav-reviews',
    title: 'Review Intelligence',
    tab: 'reviews',
    description: 'Кластеризация негатива, поиск брака, автоответы клиентам',
    keywords: ['отзывы', 'брак', 'рейтинг', 'негатив', 'клиенты', 'ответы', 'reviews'],
    icon: MessageSquare,
    badge: 'Reviews',
  },
  {
    id: 'nav-architecture',
    title: 'Архитектура, Аудит & EventStream',
    tab: 'architecture',
    description: 'Бизнес-правила, коннекторы, математический движок, диагностика и Live Event Stream оркестратора',
    keywords: ['архитектура', 'правила', 'аудит', 'лог', 'движок', 'коннекторы', 'диагностика', 'rules', 'stream', 'eventstream', 'стрим', 'события', 'оркестратор', 'websocket', 'ошибки', 'воркфлоу', 'workflow', 'zapier', 'цепочки', 'редактор', 'ноды', 'триггеры'],
    icon: Layers,
    badge: 'System & Stream',
  },
];

export const GlobalSearchBar: React.FC<Props> = ({
  products,
  rules,
  auditLogs,
  onSelectProduct,
  onSelectRule,
  onSelectAuditLog,
  onSelectTab,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Keyboard shortcut: Ctrl+K / Cmd+K / Slash key to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cleanQuery = query.trim().toLowerCase();

  // Matched Products
  const matchedProducts = useMemo(() => {
    if (!cleanQuery) return products.slice(0, 4);
    return products.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(cleanQuery);
      const skuMatch = p.sku.toLowerCase().includes(cleanQuery);
      const categoryMatch = p.category.toLowerCase().includes(cleanQuery);
      const keywordsMatch = p.keywords?.some((k) => k.toLowerCase().includes(cleanQuery));
      return nameMatch || skuMatch || categoryMatch || keywordsMatch;
    });
  }, [products, cleanQuery]);

  // Matched Business Rules
  const matchedRules = useMemo(() => {
    if (!cleanQuery) return rules.slice(0, 3);
    return rules.filter((r) => {
      const condMatch = r.condition.toLowerCase().includes(cleanQuery);
      const actionMatch = r.action.toLowerCase().includes(cleanQuery);
      const descMatch = r.description?.toLowerCase().includes(cleanQuery);
      const catMatch = r.category.toLowerCase().includes(cleanQuery);
      return condMatch || actionMatch || descMatch || catMatch;
    });
  }, [rules, cleanQuery]);

  // Matched Audit Logs
  const matchedAuditLogs = useMemo(() => {
    if (!cleanQuery) return auditLogs.slice(0, 3);
    return auditLogs.filter((l) => {
      const actionMatch = l.action.toLowerCase().includes(cleanQuery);
      const reasonMatch = l.reason.toLowerCase().includes(cleanQuery);
      const actorMatch = l.actor.toLowerCase().includes(cleanQuery);
      const storeMatch = l.store.toLowerCase().includes(cleanQuery);
      const beforeMatch = l.beforeVal?.toLowerCase().includes(cleanQuery);
      const afterMatch = l.afterVal?.toLowerCase().includes(cleanQuery);
      return actionMatch || reasonMatch || actorMatch || storeMatch || beforeMatch || afterMatch;
    });
  }, [auditLogs, cleanQuery]);

  // Matched Navigation Items
  const matchedNavigation = useMemo(() => {
    if (!cleanQuery) return NAV_ITEMS.slice(0, 3);
    return NAV_ITEMS.filter((n) => {
      const titleMatch = n.title.toLowerCase().includes(cleanQuery);
      const descMatch = n.description.toLowerCase().includes(cleanQuery);
      const kwMatch = n.keywords.some((k) => k.toLowerCase().includes(cleanQuery));
      return titleMatch || descMatch || kwMatch;
    });
  }, [cleanQuery]);

  // Calculate total counts
  const counts = {
    products: matchedProducts.length,
    rules: matchedRules.length,
    audit: matchedAuditLogs.length,
    navigation: matchedNavigation.length,
    total: matchedProducts.length + matchedRules.length + matchedAuditLogs.length + matchedNavigation.length,
  };

  // Flatten active items for keyboard navigation
  const flatItems = useMemo(() => {
    const list: { type: 'product' | 'rule' | 'audit' | 'nav'; data: any }[] = [];
    if (selectedCategory === 'all' || selectedCategory === 'products') {
      matchedProducts.forEach((p) => list.push({ type: 'product', data: p }));
    }
    if (selectedCategory === 'all' || selectedCategory === 'rules') {
      matchedRules.forEach((r) => list.push({ type: 'rule', data: r }));
    }
    if (selectedCategory === 'all' || selectedCategory === 'audit') {
      matchedAuditLogs.forEach((a) => list.push({ type: 'audit', data: a }));
    }
    if (selectedCategory === 'all' || selectedCategory === 'navigation') {
      matchedNavigation.forEach((n) => list.push({ type: 'nav', data: n }));
    }
    return list;
  }, [matchedProducts, matchedRules, matchedAuditLogs, matchedNavigation, selectedCategory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = flatItems[highlightedIndex];
      if (current) {
        if (current.type === 'product') {
          handleProductClick(current.data);
        } else if (current.type === 'rule') {
          handleRuleClick(current.data);
        } else if (current.type === 'audit') {
          handleAuditClick(current.data);
        } else if (current.type === 'nav') {
          handleNavClick(current.data);
        }
      }
    }
  };

  const handleProductClick = (product: Product) => {
    onSelectProduct(product);
    setIsOpen(false);
    setQuery('');
  };

  const handleRuleClick = (rule: BusinessRule) => {
    onSelectRule(rule);
    setIsOpen(false);
    setQuery('');
  };

  const handleAuditClick = (log: AuditLogItem) => {
    onSelectAuditLog(log);
    setIsOpen(false);
    setQuery('');
  };

  const handleNavClick = (nav: NavItem) => {
    onSelectTab(nav.tab);
    setIsOpen(false);
    setQuery('');
  };

  // Helper for highlighting text match
  const highlightMatch = (text: string) => {
    if (!cleanQuery) return text;
    const parts = text.split(new RegExp(`(${cleanQuery})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === cleanQuery ? (
            <mark key={i} className="bg-amber-200 text-slate-900 font-bold rounded-xs px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs md:max-w-md lg:max-w-lg">
      {/* Search Input Bar */}
      <div 
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-150 cursor-text bg-slate-50 hover:bg-slate-100/90 ${
          isOpen ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs' : 'border-slate-200'
        }`}
      >
        <Search className={`w-4 h-4 shrink-0 transition-colors ${isOpen ? 'text-indigo-600' : 'text-slate-400'}`} />
        
        <input
          ref={inputRef}
          id="global-search-input"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Поиск товаров, правил, логов аудита... (Ctrl+K)"
          className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
        />

        {query && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuery('');
              inputRef.current?.focus();
            }}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-200/60"
            title="Очистить поиск"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="hidden sm:flex items-center gap-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs shrink-0 select-none">
          <span>⌘K</span>
        </div>
      </div>

      {/* Search Results Dropdown Overlay */}
      {isOpen && (
        <div 
          id="global-search-results-dropdown"
          className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-[80vh] flex flex-col"
        >
          {/* Header & Filter Tabs */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-600" />
                {cleanQuery ? (
                  <span>Результаты по запросу «<strong className="text-indigo-600">{query}</strong>»</span>
                ) : (
                  <span>Быстрый поиск по системе</span>
                )}
              </span>
              <span className="text-[11px] text-slate-400">
                Найдено: <strong className="text-slate-700">{counts.total}</strong>
              </span>
            </div>

            {/* Filter Category Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                Все ({counts.total})
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('products')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === 'products'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                <Package className="w-3 h-3" />
                <span>Товары ({counts.products})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('rules')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === 'rules'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>Бизнес-правила ({counts.rules})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('audit')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === 'audit'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>Логи аудита ({counts.audit})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('navigation')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === 'navigation'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Разделы ({counts.navigation})</span>
              </button>
            </div>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto p-2 divide-y divide-slate-100 max-h-[55vh]">
            {counts.total === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-700">Ничего не найдено</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Попробуйте ввести другое название товара, артикул, правило или действие</p>
              </div>
            ) : (
              <>
                {/* 1. PRODUCTS SECTION */}
                {(selectedCategory === 'all' || selectedCategory === 'products') && matchedProducts.length > 0 && (
                  <div className="py-2">
                    <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1 text-emerald-700 font-extrabold">
                        <Package className="w-3.5 h-3.5" />
                        Товары ({matchedProducts.length})
                      </span>
                      <span className="text-[10px] font-normal text-slate-400 lowercase">переход в каталог</span>
                    </div>

                    <div className="space-y-1">
                      {matchedProducts.map((p) => {
                        const isStockLow = p.stockDays <= 7;
                        const isRankDrop = (p.searchRankDelta || 0) < 0;

                        return (
                          <button
                            key={p.id}
                            type="button"
                            id={`search-result-product-${p.id}`}
                            onClick={() => handleProductClick(p)}
                            className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 transition-all flex items-center justify-between gap-3 group cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 group-hover:scale-105 transition-transform"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-900">
                                    {highlightMatch(p.name)}
                                  </h4>
                                  <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1 py-0.2 rounded shrink-0">
                                    {p.sku}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                  <span className="font-semibold text-slate-700">{p.price.toLocaleString('ru-RU')} ₽</span>
                                  <span>•</span>
                                  <span>Маржа: <strong className="text-emerald-600">{p.margin}%</strong></span>
                                  <span>•</span>
                                  <span className={`flex items-center gap-0.5 ${isRankDrop ? 'text-rose-600' : 'text-slate-600'}`}>
                                    Позиция: #{p.searchRank}
                                    {isRankDrop && <TrendingDown className="w-3 h-3 text-rose-500" />}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isStockLow ? (
                                <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md">
                                  Остаток: {p.stockDays} дн.
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                  {p.stock} шт.
                                </span>
                              )}
                              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. BUSINESS RULES SECTION */}
                {(selectedCategory === 'all' || selectedCategory === 'rules') && matchedRules.length > 0 && (
                  <div className="py-2">
                    <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1 text-amber-700 font-extrabold">
                        <Sliders className="w-3.5 h-3.5" />
                        Бизнес-правила ({matchedRules.length})
                      </span>
                      <span className="text-[10px] font-normal text-slate-400 lowercase">переход в архитектуру</span>
                    </div>

                    <div className="space-y-1">
                      {matchedRules.map((r) => {
                        const categoryBadge = {
                          pricing: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Ценообразование' },
                          stock: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Остатки & Склады' },
                          advertising: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Реклама & ДРР' },
                          autoreply: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Автоответы' },
                        }[r.category] || { bg: 'bg-slate-50', text: 'text-slate-700', label: r.category };

                        return (
                          <button
                            key={r.id}
                            type="button"
                            id={`search-result-rule-${r.id}`}
                            onClick={() => handleRuleClick(r)}
                            className="w-full text-left p-2.5 rounded-xl hover:bg-amber-50/70 border border-transparent hover:border-amber-200 transition-all flex items-center justify-between gap-3 group cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${categoryBadge.bg} ${categoryBadge.text}`}>
                                  {categoryBadge.label}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  r.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {r.enabled ? 'Активно' : 'Выключено'}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-800 line-clamp-1 group-hover:text-amber-900">
                                <span className="text-slate-500 font-bold">ЕСЛИ:</span> {highlightMatch(r.condition)}
                              </p>
                              <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                                <span className="text-amber-600 font-bold">ТО:</span> {highlightMatch(r.action)}
                              </p>
                            </div>

                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. AUDIT LOGS SECTION */}
                {(selectedCategory === 'all' || selectedCategory === 'audit') && matchedAuditLogs.length > 0 && (
                  <div className="py-2">
                    <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1 text-blue-700 font-extrabold">
                        <FileText className="w-3.5 h-3.5" />
                        Логи аудита ({matchedAuditLogs.length})
                      </span>
                      <span className="text-[10px] font-normal text-slate-400 lowercase">переход в журнал аудита</span>
                    </div>

                    <div className="space-y-1">
                      {matchedAuditLogs.map((log) => {
                        const isVerified = log.status === 'verified';
                        return (
                          <button
                            key={log.id}
                            type="button"
                            id={`search-result-audit-${log.id}`}
                            onClick={() => handleAuditClick(log)}
                            className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50/70 border border-transparent hover:border-blue-200 transition-all flex items-center justify-between gap-3 group cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-mono">
                                  {log.timestamp}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500">
                                  {log.actor}
                                </span>
                                {isVerified && (
                                  <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 rounded flex items-center gap-0.5">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    Verified
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-blue-900">
                                {highlightMatch(log.action)}
                              </p>
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                Причина: {highlightMatch(log.reason)}
                              </p>
                            </div>

                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. NAVIGATION / SYSTEM MODULES SECTION */}
                {(selectedCategory === 'all' || selectedCategory === 'navigation') && matchedNavigation.length > 0 && (
                  <div className="py-2">
                    <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1 text-purple-700 font-extrabold">
                        <Sparkles className="w-3.5 h-3.5" />
                        Разделы системы ({matchedNavigation.length})
                      </span>
                      <span className="text-[10px] font-normal text-slate-400 lowercase">быстрый переход</span>
                    </div>

                    <div className="space-y-1">
                      {matchedNavigation.map((nav) => {
                        const Icon = nav.icon;
                        return (
                          <button
                            key={nav.id}
                            type="button"
                            id={`search-result-nav-${nav.id}`}
                            onClick={() => handleNavClick(nav)}
                            className="w-full text-left p-2.5 rounded-xl hover:bg-purple-50/70 border border-transparent hover:border-purple-200 transition-all flex items-center justify-between gap-3 group cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-purple-900">
                                    {highlightMatch(nav.title)}
                                  </h4>
                                  {nav.badge && (
                                    <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded">
                                      {nav.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {highlightMatch(nav.description)}
                                </p>
                              </div>
                            </div>

                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-colors shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom Shortcuts Info Bar */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] shadow-2xs">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] shadow-2xs">↓</kbd>
                навигация
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] shadow-2xs">Enter</kbd>
                выбрать
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] shadow-2xs">Esc</kbd>
                закрыть
              </span>
            </div>

            <div className="font-semibold text-indigo-700">
              CommerceOS Search
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { 
  Globe2, 
  Check, 
  ChevronDown, 
  Sparkles, 
  TrendingUp, 
  ArrowRight, 
  Building2, 
  ShieldCheck, 
  Layers,
  Coins
} from 'lucide-react';
import { MarketRegion, Store } from '../types';

interface Props {
  activeMarket: MarketRegion;
  onChangeMarket: (market: MarketRegion) => void;
  stores: Store[];
  currentStore: Store;
  onSelectStore: (store: Store) => void;
  cnyRate?: number;
}

export const MARKETS_CONFIG: {
  id: MarketRegion;
  label: string;
  badge: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  description: string;
  platforms: string[];
  color: string;
  primary?: boolean;
}[] = [
  {
    id: 'china',
    label: 'Рынок Китая',
    badge: 'Основной • 1688 / Taobao / JD',
    flag: '🇨🇳',
    currency: 'CNY',
    currencySymbol: '¥',
    description: 'Прямые фабрики 1688, Taobao/Tmall, JD, Pinduoduo, DDP-логистика и расчет в юанях',
    platforms: ['1688', 'Taobao', 'JD.com', 'Pinduoduo'],
    color: 'from-amber-500 to-rose-600 text-rose-700 bg-rose-50 border-rose-200',
    primary: true,
  },
  {
    id: 'russia',
    label: 'Рынок РФ & СНГ',
    badge: 'Wildberries / Ozon',
    flag: '🇷🇺',
    currency: 'RUB',
    currencySymbol: '₽',
    description: 'FBO/FBS склады, поисковые позиции WB/Ozon, локальные репрайсеры и АРК реклама',
    platforms: ['Wildberries', 'Ozon', 'Яндекс Маркет'],
    color: 'from-purple-500 to-indigo-600 text-indigo-700 bg-indigo-50 border-indigo-200',
  },
  {
    id: 'global',
    label: 'Глобальный / Cross-Border',
    badge: 'Shopify / EU & US',
    flag: '🌐',
    currency: 'EUR / USD',
    currencySymbol: '€',
    description: 'Прямые продажи D2C, международный экспорт, мультивалютные витрины',
    platforms: ['Shopify', 'Amazon', 'Temu Global'],
    color: 'from-emerald-500 to-teal-600 text-teal-700 bg-teal-50 border-teal-200',
  },
  {
    id: 'all',
    label: 'Все рынки (Мульти-хаб)',
    badge: 'Агрегированный вид',
    flag: '⚡',
    currency: 'MULTI',
    currencySymbol: '∑',
    description: 'Единый центр управления всеми филиалами: фабрики Китая → логистика → витрины РФ/EU',
    platforms: ['Все 7 каналов'],
    color: 'from-slate-700 to-slate-900 text-slate-800 bg-slate-100 border-slate-300',
  },
];

export const MarketSwitcher: React.FC<Props> = ({
  activeMarket,
  onChangeMarket,
  stores,
  currentStore,
  onSelectStore,
  cnyRate = 13.45,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeConfig = MARKETS_CONFIG.find((m) => m.id === activeMarket) || MARKETS_CONFIG[0];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        id="top-market-switcher-btn"
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white/95 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs text-left cursor-pointer group"
        title="Сменить целевой рынок и валютную модель"
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-base leading-none">{activeConfig.flag}</span>
          <span className="text-xs font-bold text-slate-900 hidden sm:inline">
            {activeConfig.label}
          </span>
          {activeConfig.primary && (
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200 hidden md:inline animate-pulse">
              Основной
            </span>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
          <span className="font-mono font-bold text-slate-700">{activeConfig.currencySymbol}</span>
          <span className="hidden lg:inline text-slate-400">({activeConfig.currency})</span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div 
          id="market-switcher-dropdown"
          className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-100 mb-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-indigo-500" />
                Целевой рынок и контекст
              </span>
              <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                <Coins className="w-3 h-3" />
                ¥1 = {cnyRate} ₽
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Выберите основной рынок. Платформа оптимизирует витрину, валюту и фабричные каталоги.
            </p>
          </div>

          {/* Markets List */}
          <div className="space-y-1">
            {MARKETS_CONFIG.map((market) => {
              const isSelected = activeMarket === market.id;
              return (
                <button
                  key={market.id}
                  id={`market-option-${market.id}`}
                  type="button"
                  onClick={() => {
                    onChangeMarket(market.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 cursor-pointer border ${
                    isSelected 
                      ? 'bg-indigo-50/70 border-indigo-200 shadow-2xs' 
                      : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <span className="text-2xl mt-0.5 shrink-0 select-none">{market.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {market.label}
                        </span>
                        {market.primary && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200">
                            Основной
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <span className="p-0.5 rounded-full bg-indigo-600 text-white shrink-0">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {market.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      {market.platforms.map((p) => (
                        <span key={p} className="text-[10px] font-medium px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded border border-slate-200/60">
                          {p}
                        </span>
                      ))}
                      <span className="text-[10px] font-mono font-bold text-slate-700 ml-auto">
                        Валюта: {market.currencySymbol}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Active Store Info */}
          <div className="mt-2 pt-2 border-t border-slate-100 px-2 py-1 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">Текущий магазин: <strong>{currentStore.name}</strong></span>
            </span>
            <span className="font-mono text-indigo-600 font-bold shrink-0 ml-2">
              {currentStore.currency}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

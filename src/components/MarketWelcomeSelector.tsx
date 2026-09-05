import React from 'react';
import { 
  Globe2, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Coins, 
  Factory, 
  TrendingUp, 
  Zap, 
  Boxes,
  HelpCircle
} from 'lucide-react';
import { MarketRegion } from '../types';
import { MARKETS_CONFIG } from './MarketSwitcher';

interface Props {
  activeMarket: MarketRegion;
  onSelectMarket: (market: MarketRegion) => void;
  cnyRate?: number;
  onDismiss?: () => void;
}

export const MarketWelcomeSelector: React.FC<Props> = ({
  activeMarket,
  onSelectMarket,
  cnyRate = 13.45,
  onDismiss,
}) => {
  return (
    <div 
      id="market-context-banner" 
      className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-indigo-900/50 mb-6 relative overflow-hidden"
    >
      {/* Background glow accents */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Info */}
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1">
              <span>🇨🇳</span> Китай — Основной рынок (Primary Hub)
            </span>
            <span className="text-xs text-indigo-200/80 font-mono hidden sm:inline">
              Курс: ¥1 = {cnyRate} ₽
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Выберите операционный рынок в начале работы</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </h2>

          <p className="text-xs text-indigo-100/80 leading-relaxed">
            Система оптимизирована для полного цикла работы с рынком Китая (фабрики 1688, Taobao, JD, PDD, DDP карго, белая таможня и расчет в юанях ¥), а также с маркетплейсами РФ (WB, Ozon) и экспортом.
          </p>
        </div>

        {/* Market Options Pill Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {MARKETS_CONFIG.map((market) => {
            const isSelected = activeMarket === market.id;
            return (
              <button
                key={market.id}
                id={`welcome-market-btn-${market.id}`}
                type="button"
                onClick={() => onSelectMarket(market.id)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer border ${
                  isSelected
                    ? 'bg-white text-slate-900 border-white shadow-lg scale-102 ring-2 ring-indigo-400/50'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/10 backdrop-blur-sm'
                }`}
              >
                <span className="text-lg leading-none">{market.flag}</span>
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    <span className="font-bold">{market.label}</span>
                    {market.primary && (
                      <span className={`text-[9px] font-extrabold px-1 rounded ${
                        isSelected ? 'bg-rose-100 text-rose-700' : 'bg-rose-500/30 text-rose-200'
                      }`}>
                        Основной
                      </span>
                    )}
                  </div>
                  <div className={`text-[10px] ${isSelected ? 'text-slate-500' : 'text-indigo-200/70'}`}>
                    {market.currencySymbol} {market.currency}
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 ml-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

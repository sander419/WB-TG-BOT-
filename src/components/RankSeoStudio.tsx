import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Copy, 
  Check, 
  RefreshCw, 
  FileText, 
  Layers,
  ArrowRight,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Zap,
  Tag,
  ShieldCheck,
  Sparkle
} from 'lucide-react';
import { Product } from '../types';
import { ProductContentHealthCard } from './ProductContentHealthCard';
import { AiDescriptionGenerator } from './AiDescriptionGenerator';

interface Props {
  products: Product[];
  onOpenFullAudit?: (product: Product) => void;
  onApplyQuickFix?: (
    productId: string,
    updatedTitle: string,
    updatedDescription: string,
    addedKeywords: string[]
  ) => void;
}

export const RankSeoStudio: React.FC<Props> = ({ 
  products,
  onOpenFullAudit,
  onApplyQuickFix,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product>(products[0] || {} as Product);

  const keywordsList = [
    { query: 'платье женское вечернее', rank: 3, delta: 2, volume: 142000, market: 'WB', sku: 'WB-18492019', cluster: 'ВЧ' },
    { query: 'наушники беспроводные bluetooth', rank: 12, delta: -8, volume: 320000, market: 'WB', sku: 'WB-99384721', cluster: 'ВЧ' },
    { query: 'увлажнитель воздуха для дома', rank: 5, delta: 4, volume: 185000, market: 'Ozon', sku: 'OZ-55829104', cluster: 'ВЧ' },
    { query: 'худи оверсайз теплое с начесом', rank: 9, delta: -1, volume: 210000, market: 'WB', sku: 'WB-33418290', cluster: 'СЧ' },
    { query: 'набор ножей кухонных поварской', rank: 4, delta: 3, volume: 95000, market: 'Ozon', sku: 'OZ-71049281', cluster: 'СЧ' },
    { query: 'термокружка в машину непроливайка', rank: 8, delta: 0, volume: 74000, market: 'WB', sku: 'WB-44182903', cluster: 'СЧ' },
    { query: 'рюкзак мужской городской для ноутбука', rank: 26, delta: -19, volume: 240000, market: 'WB', sku: 'WB-77291048', cluster: 'ВЧ' },
    { query: 'ароматические свечи в банке набор', rank: 6, delta: 1, volume: 88000, market: 'Ozon', sku: 'OZ-88301928', cluster: 'НЧ' },
  ];

  // Automated Card SEO Audit data (Section 33, 34)
  const cardAudit = {
    score: 72,
    grade: 'Требует доработки',
    titleAnalysis: {
      score: 65,
      note: 'Главный ключ «водонепроницаемый» отсутствует в названии',
    },
    descriptionDensity: {
      density: '1.2%',
      recommended: '2.4%',
      note: 'Слишком низкая плотность поисковых фраз (недобор трафика ~35%)',
    },
    missingAttributes: [
      'Особенности рюкзака',
      'Карманы для гаджетов',
      'Вместимость (л)',
      'Назначение ремня',
    ],
    missingClusters: [
      { cluster: 'водонепроницаемый рюкзак мужской', searchVolume: 74000, priority: 9.2 },
      { cluster: 'рюкзак для работы и учебы черный', searchVolume: 46000, priority: 8.6 },
      { cluster: 'рюкзак с USB портом и защитой', searchVolume: 32000, priority: 7.9 },
    ],
  };

  const handleApplyDescription = (
    productId: string,
    newTitle: string,
    newDescription: string,
    addedKeywords: string[]
  ) => {
    if (onApplyQuickFix) {
      onApplyQuickFix(productId, newTitle, newDescription, addedKeywords);
    }
  };

  return (
    <div id="seo-studio-module" className="space-y-6">
      {/* Top Keywords Tracker Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-600" />
              Радар поисковых позиций (Wildberries & Ozon)
            </h2>
            <p className="text-xs text-slate-500">
              Ежедневный парсинг ТОП-100 выдачи по частотным поисковым кластерам
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <TrendingUp className="w-3.5 h-3.5" /> 5 в росте
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              <TrendingDown className="w-3.5 h-3.5" /> 2 просели
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {keywordsList.map((kw, idx) => (
            <div
              key={idx}
              className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 hover:border-indigo-300 transition-colors shadow-2xs"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${kw.market === 'WB' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                  {kw.market}
                </span>
                <span className="font-mono text-[10px]">{kw.volume.toLocaleString('ru-RU')} запр/мес</span>
              </div>
              <div className="font-semibold text-slate-900 text-xs truncate" title={kw.query}>
                {kw.query}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500">Позиция:</span>
                <div className="flex items-center gap-1 font-bold text-slate-900 text-sm">
                  #{kw.rank}
                  {kw.delta > 0 && (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center">
                      +{kw.delta}
                    </span>
                  )}
                  {kw.delta < 0 && (
                    <span className="text-[10px] text-rose-600 font-semibold flex items-center">
                      {kw.delta}
                    </span>
                  )}
                  {kw.delta === 0 && (
                    <span className="text-[10px] text-slate-400">=</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI SEO Description Generator Module with Live Preview & Context Injection */}
      <AiDescriptionGenerator
        products={products}
        selectedProduct={selectedProduct}
        onSelectProduct={(p) => setSelectedProduct(p)}
        onApplyDescription={handleApplyDescription}
      />

      {/* Automated SEO Audit & Missing Keywords (Section 33, 34) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Аудит карточки WB
            </h3>
            <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              {cardAudit.score} / 100
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between font-semibold text-slate-800 mb-1">
                <span>Заголовок карточки</span>
                <span className="text-amber-700 font-bold">{cardAudit.titleAnalysis.score}%</span>
              </div>
              <p className="text-slate-500 text-[11px]">{cardAudit.titleAnalysis.note}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between font-semibold text-slate-800 mb-1">
                <span>Плотность ключей</span>
                <span className="text-slate-900 font-bold">{cardAudit.descriptionDensity.density} (цель {cardAudit.descriptionDensity.recommended})</span>
              </div>
              <p className="text-slate-500 text-[11px]">{cardAudit.descriptionDensity.note}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-semibold text-slate-800 mb-1.5">
                Незаполненные характеристики WB:
              </div>
              <div className="flex flex-wrap gap-1">
                {cardAudit.missingAttributes.map((attr, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                    + {attr}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Missing High-Value Clusters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                Упущенные высокочастотные кластеры
              </h3>
              <p className="text-xs text-slate-500">
                Ключевые слова конкурентов с высокой конверсией, отсутствующие в вашей карточке
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              +152 000 спрос
            </span>
          </div>

          <div className="space-y-2.5">
            {cardAudit.missingClusters.map((cluster, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {cluster.cluster}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Частотность: <strong className="text-slate-700">{cluster.searchVolume.toLocaleString('ru-RU')} запр/мес</strong> • Оценка ценности: <strong className="text-emerald-700">{cluster.priority}/10</strong>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedProduct(prev => ({
                      ...prev,
                      mainKeyword: prev.mainKeyword ? `${prev.mainKeyword}, ${cluster.cluster}` : cluster.cluster
                    }));
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  + В ядро
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Automated Content Health Card for Selected Product */}
      {selectedProduct && selectedProduct.id && (
        <div className="pt-1">
          <ProductContentHealthCard
            product={selectedProduct}
            onOpenFullAudit={onOpenFullAudit}
            onApplyQuickFix={onApplyQuickFix}
          />
        </div>
      )}
    </div>
  );
};


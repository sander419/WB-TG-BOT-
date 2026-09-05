import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  Search,
  FileText,
  ArrowRight,
  TrendingUp,
  Zap,
  Info,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  RotateCw,
} from 'lucide-react';
import { Product, ContentHealthAudit } from '../types';
import { calculateContentHealth } from '../utils/contentHealth';

interface Props {
  product: Product;
  compact?: boolean;
  onOpenFullAudit?: (product: Product) => void;
  onApplyQuickFix?: (
    productId: string,
    updatedTitle: string,
    updatedDescription: string,
    addedKeywords: string[]
  ) => void;
}

export const ProductContentHealthCard: React.FC<Props> = ({
  product,
  compact = false,
  onOpenFullAudit,
  onApplyQuickFix,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [audit, setAudit] = useState<ContentHealthAudit>(() => calculateContentHealth(product));
  const [fixApplied, setFixApplied] = useState(false);

  // Automatically trigger audit scan when product changes
  useEffect(() => {
    setIsScanning(true);
    setFixApplied(false);
    const timer = setTimeout(() => {
      const calculated = calculateContentHealth(product);
      setAudit(calculated);
      setIsScanning(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [product.id, product.name, product.mainKeyword]);

  const handleApplyFix = () => {
    if (audit.aiAutoFixProposal && onApplyQuickFix) {
      onApplyQuickFix(
        product.id,
        audit.aiAutoFixProposal.optimizedTitle,
        audit.aiAutoFixProposal.optimizedDescription,
        audit.aiAutoFixProposal.newKeywordsAdded
      );
      setFixApplied(true);
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        barBg: 'bg-emerald-500',
        label: 'Отлично',
      };
    }
    if (score >= 65) {
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        barBg: 'bg-amber-500',
        label: 'Внимание',
      };
    }
    return {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      barBg: 'bg-rose-500',
      label: 'Критично',
    };
  };

  const overallBadge = getScoreBadge(audit.overallScore);
  const keywordBadge = getScoreBadge(audit.keywordCoverage.score);
  const imageBadge = getScoreBadge(audit.imageOptimization.score);
  const descBadge = getScoreBadge(audit.descriptionLength.score);

  if (isScanning) {
    return (
      <div className="bg-slate-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-center gap-3 text-xs text-slate-600 animate-pulse">
        <RotateCw className="w-4 h-4 text-indigo-600 animate-spin" />
        <span>
          Автоматический аудит Content Health для <strong className="text-slate-800">{product.name}</strong>...
        </span>
      </div>
    );
  }

  return (
    <div
      id={`content-health-card-${product.id}`}
      className="bg-white border border-indigo-100 rounded-xl p-4 space-y-3.5 shadow-2xs"
    >
      {/* Header: Score Summary & Last Audited */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900">
                Автоматический аудит Content Health
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${overallBadge.bg}`}
              >
                {audit.overallScore}% • {overallBadge.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {audit.lastAuditedAt || 'Live синхронизация маркетплейса'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {audit.aiAutoFixProposal && (
            <button
              onClick={handleApplyFix}
              disabled={fixApplied}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                fixApplied
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white'
              }`}
            >
              {fixApplied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>AI-Fix применен</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Быстрый AI-Fix</span>
                </>
              )}
            </button>
          )}

          {onOpenFullAudit && (
            <button
              onClick={() => onOpenFullAudit(product)}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
              title="Открыть полный интерактивный аудит"
            >
              <span>Детали</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* 3 Pillar Score Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* 1. Keyword Coverage */}
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              Покрытие ключами
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold border ${keywordBadge.bg}`}
            >
              {audit.keywordCoverage.score}%
            </span>
          </div>

          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${keywordBadge.barBg}`}
              style={{ width: `${audit.keywordCoverage.score}%` }}
            />
          </div>

          <div className="text-[10px] text-slate-600 space-y-0.5 pt-0.5">
            <div className="flex justify-between">
              <span>В названии:</span>
              <strong className="text-slate-800">
                {audit.keywordCoverage.titleKeywordsCount} кл.
              </strong>
            </div>
            <div className="flex justify-between">
              <span>В описании:</span>
              <strong className="text-slate-800">
                {audit.keywordCoverage.descriptionKeywordsCount} кл.
              </strong>
            </div>
            {audit.keywordCoverage.missingKeywords?.length > 0 && (
              <p className="text-[9px] text-rose-600 truncate pt-0.5">
                Пропущено: {audit.keywordCoverage.missingKeywords[0]?.keyword}
              </p>
            )}
          </div>
        </div>

        {/* 2. Image Optimization */}
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
              Инфографика & Фото
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold border ${imageBadge.bg}`}
            >
              {audit.imageOptimization.score}%
            </span>
          </div>

          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${imageBadge.barBg}`}
              style={{ width: `${audit.imageOptimization.score}%` }}
            />
          </div>

          <div className="text-[10px] text-slate-600 space-y-0.5 pt-0.5">
            <div className="flex justify-between">
              <span>Слайды:</span>
              <strong className="text-slate-800">
                {audit.imageOptimization.totalSlides} из {audit.imageOptimization.recommendedSlides}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Формат:</span>
              <strong className="text-slate-800">
                {audit.imageOptimization.aspectRatio.split(' ')[0]} (OK)
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Чтение с моб.:</span>
              <strong
                className={
                  audit.imageOptimization.mobileReadability === 'passed'
                    ? 'text-emerald-600'
                    : 'text-amber-800'
                }
              >
                {audit.imageOptimization.mobileReadability === 'passed' ? '✓ Читаемо' : '⚠ Мелкий шрифт'}
              </strong>
            </div>
          </div>
        </div>

        {/* 3. Description Length */}
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Длина описания
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold border ${descBadge.bg}`}
            >
              {audit.descriptionLength.score}%
            </span>
          </div>

          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${descBadge.barBg}`}
              style={{ width: `${audit.descriptionLength.score}%` }}
            />
          </div>

          <div className="text-[10px] text-slate-600 space-y-0.5 pt-0.5">
            <div className="flex justify-between">
              <span>Символы:</span>
              <strong className="text-slate-800">
                {audit.descriptionLength.characterCount} зн.
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Плотность ключей:</span>
              <strong className="text-slate-800">
                {audit.descriptionLength.keywordDensity}%
              </strong>
            </div>
            <div className="flex justify-between">
              <span>УТП и буллеты:</span>
              <strong
                className={
                  audit.descriptionLength.hasBulletPoints ? 'text-emerald-600' : 'text-rose-600'
                }
              >
                {audit.descriptionLength.hasBulletPoints ? '✓ Есть' : '✗ Нет'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Actionable recommendation banner */}
      <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-start gap-2 text-[11px] text-indigo-900 leading-snug">
        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Рекомендация аудита: </strong>
          <span>{audit.keywordCoverage.recommendation}</span>
        </div>
      </div>
    </div>
  );
};

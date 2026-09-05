import React, { useState } from 'react';
import { 
  MessageSquare, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Package, 
  TrendingUp, 
  Send, 
  ThumbsUp, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { ReviewCluster, Product } from '../types';

interface Props {
  clusters: ReviewCluster[];
  products: Product[];
  onApplyAction: (cluster: ReviewCluster) => void;
}

export const ReviewIntelligence: React.FC<Props> = ({
  clusters,
  products,
  onApplyAction,
}) => {
  const [selectedCluster, setSelectedCluster] = useState<ReviewCluster>(clusters[0]);
  const [aiDraftReply, setAiDraftReply] = useState<string>(
    'Здравствуйте! Спасибо, что нашли время и поделились впечатлениями. Нам очень жаль, что коробка пришла с замятым углом при транспортировке WB. Сам термос выполнен из хирургической стали 316L, мы уже перешли на трехслойный защитный демпфер. Напишите нам в чат продавца — подарим фирменный силиконовый чехол!'
  );
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sentToMarket, setSentToMarket] = useState(false);

  const handleGenerateAiReply = async (cluster: ReviewCluster) => {
    setIsGeneratingReply(true);
    setSentToMarket(false);

    try {
      const res = await fetch('/api/generate-review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: cluster.category,
          sentiment: cluster.sentiment,
          quotes: cluster.sampleQuotes,
          rating: cluster.sentiment === 'negative' ? 2 : 5,
        }),
      });
      const data = await res.json();
      if (data?.reply) {
        setAiDraftReply(data.reply);
      }
    } catch (e) {
      // fallback
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleSelectCluster = (cluster: ReviewCluster) => {
    setSelectedCluster(cluster);
    handleGenerateAiReply(cluster);
  };

  const handleCopyReply = () => {
    navigator.clipboard.writeText(aiDraftReply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Review Intelligence: Кластеризация отзывов и улучшение карточки
              </h2>
              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                Voice of Customer
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              AI анализирует сотни отзывов, находит скрытые паттерны (брак, размерность, упаковка) и формулирует точечные решения для карточки.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
          Проанализировано: <strong className="text-slate-900">1 420 отзывов</strong>
        </div>
      </div>

      {/* 4 Clusters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {clusters.map((c) => {
          const isSelected = selectedCluster.id === c.id;
          return (
            <button
              key={c.id}
              onClick={() => handleSelectCluster(c)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected 
                  ? 'bg-indigo-50/50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs' 
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    c.sentiment === 'negative'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : c.sentiment === 'positive'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {c.sentiment === 'negative' ? 'Болевая точка' : c.sentiment === 'positive' ? 'Главное УТП' : 'Нейтрально'}
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {c.percentage}% отзывов
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 mb-1">
                  {c.category}
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  {c.count} упоминаний за последний месяц
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-indigo-600 font-semibold">
                <span>Изучить кластер</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Cluster Deep-Dive & Action Proposal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Quotes & Recommended Fix */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Выбранный кластер
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {selectedCluster.category} ({selectedCluster.percentage}% обращений)
              </h3>
            </div>

            <button
              onClick={() => onApplyAction(selectedCluster)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Внедрить рекомендацию в карточку</span>
            </button>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-2">
              Цитаты покупателей из маркетплейса:
            </h4>
            <div className="space-y-2">
              {selectedCluster.sampleQuotes.map((quote, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 italic flex items-start gap-2.5"
                >
                  <span className="text-slate-400 font-serif text-base leading-none">“</span>
                  <span className="flex-1 not-italic text-slate-800 font-medium">{quote}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Рекомендованное действие AI:</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              {selectedCluster.suggestedAction}
            </p>
          </div>
        </div>

        {/* Right Col: AI Reply Generator */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Генератор ответа на отзыв</span>
              </h4>
              <div className="flex items-center gap-2">
                {isGeneratingReply && (
                  <span className="text-[10px] text-indigo-600 font-semibold animate-pulse">
                    AI подбирает формулировку...
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-mono">
                  Tone: Empathetic
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mb-3">
              Готовый дружелюбный ответ, защищающий рейтинг карточки и снижающий негатив:
            </p>

            <textarea
              rows={7}
              value={aiDraftReply}
              disabled={isGeneratingReply}
              onChange={(e) => setAiDraftReply(e.target.value)}
              className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none disabled:opacity-50"
            />
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              onClick={handleCopyReply}
              className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              {copied ? '✓ Скопировано в буфер' : 'Скопировать ответ'}
            </button>

            <button
              onClick={() => {
                setSentToMarket(true);
                setTimeout(() => setSentToMarket(false), 3000);
              }}
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer text-center shadow-xs"
            >
              {sentToMarket ? '✓ Отправлено в WB/Ozon' : 'Отправить в маркетплейс'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

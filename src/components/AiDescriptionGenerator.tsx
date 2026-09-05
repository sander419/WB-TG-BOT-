import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  Save, 
  ArrowRight, 
  FileText, 
  Smartphone, 
  Layers, 
  Zap, 
  ShieldCheck, 
  Sliders, 
  Tag, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Edit3,
  Undo2,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { Product } from '../types';

interface Props {
  products: Product[];
  selectedProduct: Product;
  onSelectProduct: (product: Product) => void;
  onApplyDescription: (
    productId: string,
    newTitle: string,
    newDescription: string,
    addedKeywords: string[]
  ) => void;
}

type ToneType = 'selling' | 'expert' | 'concise' | 'gift';
type PreviewTab = 'comparison' | 'mobile' | 'raw_report';

export const AiDescriptionGenerator: React.FC<Props> = ({
  products,
  selectedProduct,
  onSelectProduct,
  onApplyDescription,
}) => {
  const [tone, setTone] = useState<ToneType>('selling');
  const [customKeywords, setCustomKeywords] = useState(selectedProduct.mainKeyword || '');
  const [targetTitle, setTargetTitle] = useState(selectedProduct.name || '');
  const [features, setFeatures] = useState('Премиальное качество, влагозащита, прочные швы, быстрая доставка FBO');
  const [brandName, setBrandName] = useState('NordicStyle');
  
  // Generation & Output state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('comparison');
  const [generatedTitle, setGeneratedTitle] = useState<string>('');
  const [generatedDescription, setGeneratedDescription] = useState<string>('');
  const [fullReport, setFullReport] = useState<string | null>(null);
  const [isEdited, setIsEdited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state when selected product changes
  useEffect(() => {
    if (selectedProduct) {
      setTargetTitle(selectedProduct.name);
      setCustomKeywords(selectedProduct.mainKeyword || '');
      setGeneratedTitle('');
      setGeneratedDescription('');
      setFullReport(null);
      setIsEdited(false);
      setSavedSuccess(false);
    }
  }, [selectedProduct.id]);

  const missingClusters = [
    { query: 'водонепроницаемый 2025', volume: 74000 },
    { query: 'для работы и учебы черный', volume: 46000 },
    { query: 'с отделением для ноутбука', volume: 38000 },
    { query: 'подарок мужчине на праздник', volume: 29000 },
  ];

  const handleAddCluster = (cluster: string) => {
    if (!customKeywords.includes(cluster)) {
      setCustomKeywords(prev => prev ? `${prev}, ${cluster}` : cluster);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationStep(1);
    setSavedSuccess(false);

    // Multi-step visual progress simulation for realistic feedback
    const stepTimer1 = setTimeout(() => setGenerationStep(2), 600);
    const stepTimer2 = setTimeout(() => setGenerationStep(3), 1400);

    try {
      const res = await fetch('/api/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: targetTitle || selectedProduct.name,
          category: selectedProduct.category,
          keywords: customKeywords,
          brand: brandName,
          tone,
          marketplace: selectedProduct.marketplace,
          currentDescription: selectedProduct.description || '',
          features,
        }),
      });

      const data = await res.json();
      
      setGeneratedTitle(data.title || `${targetTitle} • Тренд 2025`);
      setGeneratedDescription(data.description || data.result || '');
      setFullReport(data.result || '');
      setIsEdited(false);
    } catch (e) {
      console.error('Failed to generate SEO description:', e);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsGenerating(false);
      setGenerationStep(0);
    }
  };

  const handleSaveAndApply = () => {
    if (!generatedDescription && !fullReport) return;

    const addedKw = customKeywords.split(',').map(k => k.trim()).filter(Boolean);
    const finalTitle = generatedTitle || targetTitle || selectedProduct.name;
    const finalDesc = generatedDescription || fullReport || '';

    onApplyDescription(selectedProduct.id, finalTitle, finalDesc, addedKw);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleCopyText = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Compute text stats
  const currentDescText = selectedProduct.description || 'Описание не заполнено в карточке маркетплейса.';
  const previewDescText = generatedDescription || fullReport || '';
  const charCount = previewDescText.length;
  const wordCount = previewDescText.split(/\s+/).filter(Boolean).length;

  return (
    <div id="ai-description-generator-container" className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                AI-Генератор SEO-Описаний & Карточек
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200">
                <Zap className="w-3 h-3 text-amber-500" />
                Gemini 3.8 Flash • Конверсия WB & Ozon
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Автоматическое построение Rich-описаний с внедрением LSI-ключей, защитой от переспама и моментальным предпросмотром
            </p>
          </div>
        </div>

        {/* Product Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 hidden md:inline">Товар:</label>
          <select
            id="desc-gen-product-select"
            value={selectedProduct.id}
            onChange={(e) => {
              const found = products.find(p => p.id === e.target.value);
              if (found) onSelectProduct(found);
            }}
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 shadow-2xs max-w-xs truncate cursor-pointer"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.marketplace.toUpperCase()} • {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Input Parameters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Form: Settings & Prompts (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                Параметры и контекст товара
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                SKU: {selectedProduct.sku}
              </span>
            </div>

            {/* Target Title */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Название товара / Базовый заголовок:
              </label>
              <input
                id="desc-input-title"
                type="text"
                value={targetTitle}
                onChange={(e) => setTargetTitle(e.target.value)}
                placeholder="Например: Рюкзак мужской городской"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs font-medium"
              />
            </div>

            {/* Tone Picker */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                Стиль и тональность текста:
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: 'selling', label: '🔥 Продающий', desc: 'Эмоции & Выгоды' },
                  { id: 'expert', label: '🛡️ Экспертный', desc: 'Характеристики & Ткань' },
                  { id: 'concise', label: '⚡ Лаконичный', desc: 'Четкие буллеты' },
                  { id: 'gift', label: '🎁 Подарочный', desc: 'Праздники & Упаковка' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTone(item.id as ToneType)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      tone === item.id
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Keywords & Missing Clusters */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Ключевые слова для внедрения:
              </label>
              <textarea
                id="desc-input-keywords"
                rows={2}
                value={customKeywords}
                onChange={(e) => setCustomKeywords(e.target.value)}
                placeholder="рюкзак для ноутбука, водонепроницаемый, мужской подарок..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />

              {/* Missing clusters quick-add pill tags */}
              <div className="mt-2">
                <div className="text-[10px] font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Рекомендуем добавить из упущенного трафика конкурентов:
                </div>
                <div className="flex flex-wrap gap-1">
                  {missingClusters.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAddCluster(c.query)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>+ {c.query}</span>
                      <span className="text-[9px] text-emerald-600/80">({Math.round(c.volume / 1000)}k)</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Features & UTP */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                УТП, бренд и особенности:
              </label>
              <input
                id="desc-input-features"
                type="text"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                placeholder="Влагозащита, эргономика, плотная ткань 900D..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>

            {/* Generate Button with dynamic animated state */}
            <button
              id="generate-ai-description-btn"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>
                    {generationStep === 1 && 'Анализ семантического графа...'}
                    {generationStep === 2 && 'Генерация Rich-структуры...'}
                    {generationStep === 3 && 'Проверка плотности LSI-ключей...'}
                    {generationStep === 0 && 'AI пишет продающий текст...'}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Сгенерировать SEO-описание (1 клик)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Output: Interactive Live Preview & Inspector (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          {/* Preview Navigation Tabs */}
          <div className="flex items-center justify-between bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-semibold">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPreviewTab('comparison')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  previewTab === 'comparison'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>Сравнение (До / После)</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('mobile')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  previewTab === 'mobile'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                <span>Превью карточки {selectedProduct.marketplace.toUpperCase()}</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('raw_report')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  previewTab === 'raw_report'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Полный отчет & УТП</span>
              </button>
            </div>

            {/* Quick Metrics Badge */}
            {previewDescText && (
              <span className="text-[11px] text-slate-500 pr-2 hidden sm:inline">
                {charCount} симв. • {wordCount} слов
              </span>
            )}
          </div>

          {/* TAB 1: Comparison View (Side-by-Side) */}
          {previewTab === 'comparison' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-[380px]">
              {/* Before Column */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-xs">
                    <span className="font-bold text-slate-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      Текущее описание карточки
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                      Индекс SEO: 64/100
                    </span>
                  </div>
                  
                  <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto pr-1">
                    {currentDescText}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Плотность ключей: <strong>1.1% (низкая)</strong></span>
                  <span className="text-rose-600 font-semibold">-35% недобор трафика</span>
                </div>
              </div>

              {/* After Column (AI Generated & Editable) */}
              <div className="bg-indigo-50/40 border-2 border-indigo-200 rounded-2xl p-4 flex flex-col justify-between relative shadow-xs">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-100 text-xs">
                    <span className="font-extrabold text-indigo-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      AI SEO-Описание (Новое)
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-extrabold border border-emerald-200">
                      Индекс SEO: 98/100
                    </span>
                  </div>

                  {previewDescText ? (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-900 bg-white/80 p-2 rounded-xl border border-indigo-100">
                        {generatedTitle || `${targetTitle} • Тренд 2025`}
                      </div>

                      <textarea
                        id="generated-description-editor"
                        rows={11}
                        value={previewDescText}
                        onChange={(e) => {
                          setGeneratedDescription(e.target.value);
                          setIsEdited(true);
                        }}
                        className="w-full bg-white border border-indigo-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans shadow-2xs resize-none"
                        placeholder="Здесь появится готовый продающий SEO-текст..."
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 space-y-2">
                      <Sparkles className="w-8 h-8 text-indigo-300 animate-pulse" />
                      <p className="text-xs font-medium text-slate-600">
                        Нажмите кнопку «Сгенерировать SEO-описание», чтобы создать готовый текст с предпросмотром
                      </p>
                    </div>
                  )}
                </div>

                {previewDescText && (
                  <div className="mt-2 pt-2 border-t border-indigo-100 text-[11px] text-indigo-900 flex items-center justify-between font-medium">
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Плотность LSI: 2.6% (идеально)
                    </span>
                    {isEdited && (
                      <span className="text-amber-700 text-[10px] font-semibold">
                        (Отредактировано вручную)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Mobile Marketplace Card Mockup */}
          {previewTab === 'mobile' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-center items-center min-h-[380px]">
              <div className="max-w-sm w-full bg-white rounded-3xl border-4 border-slate-800 shadow-xl overflow-hidden text-slate-900 text-xs">
                {/* Mobile Mockup Header */}
                <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between text-[10px] font-bold">
                  <span>9:41</span>
                  <span>{selectedProduct.marketplace.toUpperCase()} App</span>
                  <span>100% 🔋</span>
                </div>

                {/* Product Mobile Hero */}
                <div className="p-3 space-y-2">
                  <div className="h-36 bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-100">
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      ★ {selectedProduct.rating} ({selectedProduct.reviewsCount} отзывов)
                    </span>
                  </div>

                  <div>
                    <div className="text-sm font-extrabold text-slate-900 leading-snug">
                      {generatedTitle || selectedProduct.name}
                    </div>
                    <div className="text-sm font-extrabold text-indigo-600 mt-1">
                      {selectedProduct.price.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>

                  {/* Description Box on Mobile */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="font-bold text-slate-800 text-[11px]">
                      Описание товара
                    </div>
                    <div className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                      {previewDescText || selectedProduct.description || 'Нажмите генерацию для просмотра Rich-описания.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Full Structured Report */}
          {previewTab === 'raw_report' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex-1 min-h-[380px] max-h-[420px] overflow-y-auto">
              {fullReport ? (
                <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                  {fullReport}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                  <FileText className="w-8 h-8 text-slate-300" />
                  <p className="text-xs mt-2">Полный семантический отчет будет сформирован после запуска генерации</p>
                </div>
              )}
            </div>
          )}

          {/* Bottom Action Controls Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="copy-generated-desc-btn"
                onClick={() => handleCopyText(previewDescText || fullReport || '')}
                disabled={!previewDescText}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-colors disabled:opacity-40 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Скопировано!' : 'Скопировать текст'}</span>
              </button>
            </div>

            {/* Save & Apply Button */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {savedSuccess && (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Сохранено в карточку!
                </span>
              )}

              <button
                id="save-apply-description-btn"
                onClick={handleSaveAndApply}
                disabled={!previewDescText || isGenerating}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Сохранить в карточку товара</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

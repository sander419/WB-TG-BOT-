import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  CheckCircle2, 
  LayoutDashboard, 
  MessageSquare, 
  Package, 
  ShieldCheck, 
  Bot, 
  Zap,
  HelpCircle,
  TrendingUp,
  Compass
} from 'lucide-react';

export const ONBOARDING_STORAGE_KEY = 'commerceos_onboarding_completed_v1';

export interface TourStep {
  id: string;
  tab: 'dashboard' | 'telegram' | 'catalog' | 'seo' | 'repricer' | 'launch' | 'reviews' | 'alerts' | 'architecture';
  targetSelector?: string;
  title: string;
  badge: string;
  icon: React.ReactNode;
  description: string;
  highlights: string[];
  actionHint?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'step-dashboard',
    tab: 'dashboard',
    targetSelector: '#tab-dashboard',
    title: 'Главная: Операционный Пульт Селлера',
    badge: 'Шаг 1 из 4 • Обзор платформы',
    icon: <LayoutDashboard className="w-5 h-5 text-indigo-600" />,
    description: 'Центральный хаб вашего магазина. Здесь агрегируются ключевые показатели (выручка, маржинальность, ДРР, заказы), критические алерты и интерактивный виджет «AI-Пульс» с прогрессом фоновых микросервисов.',
    highlights: [
      'Виджет «AI-Пульс»: статус оркестратора (Active / Thinking / Idle) и фоновые синки',
      'Блок критических аномалий (просадки позиций, риски out-of-stock)',
      'Кнопки быстрого WOW-аудита и Утренней сводки в шапке',
    ],
    actionHint: 'Перейдем к AI-Менеджеру в Telegram для управления голосом и текстом.',
  },
  {
    id: 'step-telegram',
    tab: 'telegram',
    targetSelector: '#tab-telegram',
    title: 'AI-Менеджер в Telegram: Управление на естественном языке',
    badge: 'Шаг 2 из 4 • Коммуникация и интенты',
    icon: <MessageSquare className="w-5 h-5 text-indigo-600" />,
    description: 'Общайтесь с AI-оркестратором как с опытным коммерческим директором. Задавайте вопросы по аналитике, получайте рекомендации и управляйте магазином голосом или готовыми интентами.',
    highlights: [
      'Готовые быстрые интенты («Продать больше», «Анализ конкурентов», «Ответить на отзывы»)',
      'Плавный эффект печатающегося текста и запись голосовых сообщений',
      'Интерактивные карточки действий (Action Cards) с подтверждением WRITE-операций',
    ],
    actionHint: 'Посмотрим, как устроен Каталог товаров, остатки FBO и скоринг карточек.',
  },
  {
    id: 'step-catalog',
    tab: 'catalog',
    targetSelector: '#tab-catalog',
    title: 'Каталог товаров, Остатки FBO & Content Health',
    badge: 'Шаг 3 из 4 • Управление ассортиментом',
    icon: <Package className="w-5 h-5 text-indigo-600" />,
    description: 'Глубокий мониторинг всех SKU магазина. Отслеживайте точные складские остатки FBO/FBS, поисковые ранги на Wildberries и Ozon, а также запускайте AI-аудит качества контента (Content Health 0-100).',
    highlights: [
      'Метрики out-of-stock и расчет дней до обнуления остатков',
      'Пакетные операции: массовое изменение цен и оформление поставок',
      'AI-оптимизация SEO-семантики и ключевых кластеров в один клик',
    ],
    actionHint: 'Финальный шаг: безопасность и защита от несогласованных действий.',
  },
  {
    id: 'step-security',
    tab: 'dashboard',
    targetSelector: '#top-wow-audit-btn',
    title: 'Безопасность WRITE-действий & Аудит-лог',
    badge: 'Шаг 4 из 4 • Защита бизнеса',
    icon: <ShieldCheck className="w-5 h-5 text-indigo-600" />,
    description: 'CommerceOS защищает ваш бизнес от неконтролируемых изменений. Любые критические действия (изменение цен, заказ поставок) выполняются строго по принципу Human-in-the-Loop и навсегда фиксируются в Immutable Audit Log.',
    highlights: [
      'Двухфакторное подтверждение опасных операций (WRITE)',
      'Полная прозрачность: неизменяемый журнал всех решений AI-оркестратора',
      'Готовность к синхронизации с несколькими юрлицами и магазинами',
    ],
    actionHint: 'Вы готовы к работе! Нажмите «Начать работу» для входа в систему.',
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSwitchTab: (tab: TourStep['tab']) => void;
}

export const OnboardingTour: React.FC<Props> = ({ isOpen, onClose, onSwitchTab }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Whenever step changes, switch the active tab so user sees the real working screen
  useEffect(() => {
    if (isOpen && currentStep) {
      onSwitchTab(currentStep.tab);
    }
  }, [isOpen, currentStepIndex, currentStep, onSwitchTab]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleFinish();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (isLastStep) {
      handleFinish();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch (e) {}
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="onboarding-tour-modal"
        className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Top Header Strip with decorative gradient */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-5 sm:p-6 text-white relative">
          <button
            id="onboarding-tour-close-btn"
            onClick={handleFinish}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Закрыть тур (Esc)"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-xs text-white border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{currentStep.badge}</span>
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            {currentStep.title}
          </h3>
          <p className="text-xs sm:text-sm text-indigo-100 mt-1 leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Body content with key highlights */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Ключевые возможности раздела:
          </div>

          <div className="space-y-2.5">
            {currentStep.highlights.map((h, i) => (
              <div 
                key={i} 
                className="flex items-start gap-2.5 bg-slate-50 hover:bg-indigo-50/40 p-3 rounded-2xl border border-slate-200/80 transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ✓
                </div>
                <span className="text-xs sm:text-sm text-slate-700 font-medium leading-normal">
                  {h}
                </span>
              </div>
            ))}
          </div>

          {/* Action Hint */}
          {currentStep.actionHint && (
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-indigo-900 font-semibold">
              <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{currentStep.actionHint}</span>
            </div>
          )}
        </div>

        {/* Footer controls & Step dots */}
        <div className="bg-slate-50 px-5 sm:px-6 py-4 border-t border-slate-200/80 flex items-center justify-between gap-3">
          {/* Step indicators */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? 'w-6 bg-indigo-600'
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                title={`Перейти к шагу ${idx + 1}`}
              />
            ))}
            <span className="text-xs font-bold text-slate-500 ml-2">
              {currentStepIndex + 1} / {TOUR_STEPS.length}
            </span>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="onboarding-prev-btn"
              onClick={handlePrev}
              disabled={isFirstStep}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Назад</span>
            </button>

            <button
              id="onboarding-next-btn"
              onClick={handleNext}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>{isLastStep ? 'Завершить тур' : 'Далее'}</span>
              {isLastStep ? <CheckCircle2 className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

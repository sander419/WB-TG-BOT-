import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Bot, 
  Check, 
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  RefreshCw,
  SunMedium,
  Terminal,
  Database,
  Activity,
  ArrowRight,
  HelpCircle,
  Sliders,
  TrendingDown,
  TrendingUp,
  Package,
  Layers,
  Mic,
  MicOff,
  Play,
  Pause,
  Volume2,
  Copy,
  CheckCheck,
  Pin,
  Settings,
  Bell,
  ExternalLink,
  X,
  Radio,
  ArrowUpRight,
  Zap,
  Trash2,
  Download,
  FileJson,
  Target,
  DollarSign,
  Star,
  Factory,
  MessageSquare,
  SlidersHorizontal,
  CornerDownLeft,
  SlidersVertical,
  CheckCheck as CheckDouble
} from 'lucide-react';
import { ChatMessage, Product } from '../types';

interface Props {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  onApplyAction: (actionType: string, payload?: any) => void;
  onOpenDigest: () => void;
  products: Product[];
  onSelectProduct: (p: Product) => void;
  onClearHistory?: () => void;
}

export interface PredefinedIntentItem {
  id: string;
  title: string; // Predefined Intent Title e.g. 'Analyze Revenue'
  subtitleRu: string; // Russian label for context
  badge: string;
  category: 'analytics' | 'catalog' | 'inventory' | 'pricing' | 'marketing' | 'china';
  prompt: string;
  accentColor: {
    bg: string;
    border: string;
    hoverBorder: string;
    text: string;
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
  };
}

const PREDEFINED_INTENTS: PredefinedIntentItem[] = [
  {
    id: 'analyze-revenue',
    title: 'Analyze Revenue',
    subtitleRu: 'Выручка & продажи',
    badge: '24h Live',
    category: 'analytics',
    prompt: 'Проанализируй продажи и выручку магазина за последние 24 часа. Какие товары растут в выручке, а где есть критичные просадки?',
    accentColor: {
      bg: 'bg-emerald-50/80',
      border: 'border-emerald-200',
      hoverBorder: 'hover:border-emerald-400',
      text: 'text-emerald-950',
      iconBg: 'bg-emerald-600 text-white',
      iconColor: 'text-emerald-600',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      badgeText: 'text-emerald-800',
    },
  },
  {
    id: 'optimize-listings',
    title: 'Optimize Listings',
    subtitleRu: 'Оптимизация карточек',
    badge: 'SEO & Rich',
    category: 'catalog',
    prompt: 'Проведи комплексный аудит карточек товаров: проверь SEO-заголовки, Rich-описание, инфографику и поисковые позиции по ключевым фразам.',
    accentColor: {
      bg: 'bg-indigo-50/80',
      border: 'border-indigo-200',
      hoverBorder: 'hover:border-indigo-400',
      text: 'text-indigo-950',
      iconBg: 'bg-indigo-600 text-white',
      iconColor: 'text-indigo-600',
      badgeBg: 'bg-indigo-100 text-indigo-800',
      badgeText: 'text-indigo-800',
    },
  },
  {
    id: 'review-inventory',
    title: 'Review Inventory',
    subtitleRu: 'Аудит остатков FBO',
    badge: 'Остатки & Out-of-Stock',
    category: 'inventory',
    prompt: 'Проверь остатки товаров на складах FBO Коледино, Казань и Электросталь. Рассчитай риски out-of-stock и сформируй график поставок.',
    accentColor: {
      bg: 'bg-amber-50/80',
      border: 'border-amber-200',
      hoverBorder: 'hover:border-amber-400',
      text: 'text-amber-950',
      iconBg: 'bg-amber-500 text-white',
      iconColor: 'text-amber-600',
      badgeBg: 'bg-amber-100 text-amber-800',
      badgeText: 'text-amber-800',
    },
  },
  {
    id: 'dynamic-repricer',
    title: 'Dynamic Repricer',
    subtitleRu: 'Авто-репрайсинг',
    badge: 'Цены & Демпинг',
    category: 'pricing',
    prompt: 'Проверь цены конкурентов, определи случаи демпинга и предложи безопасные ценовые коридоры для авто-репрайсера.',
    accentColor: {
      bg: 'bg-rose-50/80',
      border: 'border-rose-200',
      hoverBorder: 'hover:border-rose-400',
      text: 'text-rose-950',
      iconBg: 'bg-rose-600 text-white',
      iconColor: 'text-rose-600',
      badgeBg: 'bg-rose-100 text-rose-800',
      badgeText: 'text-rose-800',
    },
  },
  {
    id: 'ad-spend-tacos',
    title: 'Ad Spend & TACoS',
    subtitleRu: 'Реклама & ДРР',
    badge: '🎯 ДРР < 12%',
    category: 'marketing',
    prompt: 'Проверь эффективность авторекламы, текущий ДРР по кампаниям и предложи список минус-фраз для исключения нецелевого трафика.',
    accentColor: {
      bg: 'bg-blue-50/80',
      border: 'border-blue-200',
      hoverBorder: 'hover:border-blue-400',
      text: 'text-blue-950',
      iconBg: 'bg-blue-600 text-white',
      iconColor: 'text-blue-600',
      badgeBg: 'bg-blue-100 text-blue-800',
      badgeText: 'text-blue-800',
    },
  },
  {
    id: 'unit-economics',
    title: 'Unit Economics',
    subtitleRu: 'Юнит-экономика',
    badge: 'Чистая маржа',
    category: 'analytics',
    prompt: 'Рассчитай полную юнит-экономику с учетом комиссии маркетплейса, эквайринга, логистики FBO и налоговой нагрузки.',
    accentColor: {
      bg: 'bg-purple-50/80',
      border: 'border-purple-200',
      hoverBorder: 'hover:border-purple-400',
      text: 'text-purple-950',
      iconBg: 'bg-purple-600 text-white',
      iconColor: 'text-purple-600',
      badgeBg: 'bg-purple-100 text-purple-800',
      badgeText: 'text-purple-800',
    },
  },
  {
    id: 'china-sourcing',
    title: 'China Sourcing',
    subtitleRu: 'Фабрики Китая 1688',
    badge: '🇨🇳 DDP Сорсинг',
    category: 'china',
    prompt: 'Найди прямых производителей на 1688 для топ-3 товаров магазина, рассчитай себестоимость под ключ с белой доставкой DDP и экономию.',
    accentColor: {
      bg: 'bg-orange-50/80',
      border: 'border-orange-200',
      hoverBorder: 'hover:border-orange-400',
      text: 'text-orange-950',
      iconBg: 'bg-orange-500 text-white',
      iconColor: 'text-orange-600',
      badgeBg: 'bg-orange-100 text-orange-800',
      badgeText: 'text-orange-800',
    },
  },
  {
    id: 'review-feedback',
    title: 'Review Feedback',
    subtitleRu: 'Отзывы & Брак',
    badge: '⭐ Анализ 1-3★',
    category: 'catalog',
    prompt: 'Проанализируй отзывы покупателей, найди частые причины возвратов и брака, и сформируй шаблоны персонализированных ответов.',
    accentColor: {
      bg: 'bg-teal-50/80',
      border: 'border-teal-200',
      hoverBorder: 'hover:border-teal-400',
      text: 'text-teal-950',
      iconBg: 'bg-teal-600 text-white',
      iconColor: 'text-teal-600',
      badgeBg: 'bg-teal-100 text-teal-800',
      badgeText: 'text-teal-800',
    },
  },
];

const SLASH_COMMANDS = [
  { cmd: '/sales', label: '📊 /sales — Сводка продаж и выручки за 24ч', prompt: 'Как сегодня продажи?' },
  { cmd: '/problems', label: '📉 /problems — Анализ просадок и проблем', prompt: 'Почему упали продажи и какие есть проблемы?' },
  { cmd: '/opportunities', label: '💡 /opportunities — Точки роста и возможности', prompt: 'Какие точки роста и возможности есть в магазине прямо сейчас?' },
  { cmd: '/seo', label: '🔎 /seo — Аудит позиций и карточек в поиске', prompt: 'Что у меня с позициями в поиске?' },
  { cmd: '/stocks', label: '📦 /stocks — Остатки FBO и риски out-of-stock', prompt: 'Что с остатками и поставками? Есть ли риски out-of-stock?' },
  { cmd: '/brief', label: '☀️ /brief — Утренняя сводка оператора', prompt: 'Сделай утреннюю сводку магазина.' },
  { cmd: '/store', label: '🏢 /store — Общее состояние магазина', prompt: 'Покажи состояние моего магазина и ключевые метрики.' },
  { cmd: '/repricer', label: '⚡ /repricer — Проверка демпинга и цен конкурентов', prompt: 'Проверь цены конкурентов и предложи авто-репрайсинг.' },
  { cmd: '/reviews', label: '⭐ /reviews — Кластеризация отзывов и брака', prompt: 'Проанализируй отзывы покупателей и найди проблемы товаров.' },
  { cmd: '/clear', label: '🗑️ /clear — Очистить историю диалога', prompt: '__CLEAR__' },
];

const QUICK_PROMPTS = [
  { id: 'sales', label: '☀️ Как сегодня продажи?', prompt: 'Как сегодня продажи?' },
  { id: 'revenue-drop', label: '📉 Почему просела выручка?', prompt: 'Почему просела выручка?' },
  { id: 'best-products', label: '📈 Какие товары лучше продвигать?', prompt: 'Какие товары сейчас лучше продвигать?' },
  { id: 'positions', label: '🔎 Что у меня с позициями?', prompt: 'Что у меня с позициями в поиске?' },
  { id: 'prod-7-issue', label: '🏷️ Почему товар №7 упал?', prompt: 'Почему товар №7 (Рюкзак городской) не продаётся и упал в поиске?' },
  { id: 'new-item', label: '🚀 Запуск новинки', prompt: 'У меня новый товар. Хочу начать продажи.' },
  { id: 'stocks', label: '📦 Риски out-of-stock', prompt: 'Что с остатками и поставками? Есть ли риски out-of-stock?' },
  { id: 'reviews', label: '⭐ Анализ отзывов и брака', prompt: 'Проанализируй отзывы покупателей и найди проблемы товаров.' },
];

const VOICE_PRESETS = [
  'Какая сегодня выручка и есть ли критичные просадки по товарам?',
  'Почему рюкзак городской просел в поиске и как это исправить?',
  'Закажи поставку увлажнителей на склад Коледино 100 штук.',
  'Что у нас с эффективностью авторекламы и ДРР по платьям?',
];

interface TypewriterMessageProps {
  id: string;
  text: string;
  isAlreadyTyped: boolean;
  onComplete: (id: string) => void;
  renderFormattedText: (text: string) => React.ReactNode;
  onScroll: () => void;
}

const TypewriterMessage: React.FC<TypewriterMessageProps> = ({
  id,
  text,
  isAlreadyTyped,
  onComplete,
  renderFormattedText,
  onScroll,
}) => {
  const [displayedLength, setDisplayedLength] = useState(() => (isAlreadyTyped ? text.length : 0));
  const isFinished = displayedLength >= text.length;

  useEffect(() => {
    if (isAlreadyTyped) {
      setDisplayedLength(text.length);
      return;
    }

    let timeoutId: any = null;
    let currentIdx = 0;

    const streamNextChunk = () => {
      if (currentIdx >= text.length) {
        setDisplayedLength(text.length);
        onComplete(id);
        onScroll();
        return;
      }

      // Natural variable speed calculation
      const char = text[currentIdx] || '';
      let step = 3;
      let delay = 18;

      if (char === '\n') {
        delay = 60;
        step = 1;
      } else if (char === '.' || char === '!' || char === '?') {
        delay = 85;
        step = 1;
      } else if (char === ',' || char === ':' || char === ';') {
        delay = 40;
        step = 1;
      } else if (text.length > 500) {
        step = 6;
        delay = 14;
      } else if (text.length > 250) {
        step = 4;
        delay = 16;
      }

      currentIdx = Math.min(text.length, currentIdx + step);
      setDisplayedLength(currentIdx);
      onScroll();

      timeoutId = setTimeout(streamNextChunk, delay);
    };

    timeoutId = setTimeout(streamNextChunk, 20);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [id, text, isAlreadyTyped, onComplete, onScroll]);

  const handleSkip = () => {
    setDisplayedLength(text.length);
    onComplete(id);
    onScroll();
  };

  const currentSlice = isFinished ? text : text.slice(0, displayedLength);

  return (
    <div 
      className="relative group/typewriter animate-typewriter-chunk"
      onClick={!isFinished ? handleSkip : undefined}
      title={!isFinished ? "Кликните, чтобы показать ответ сразу" : undefined}
    >
      {renderFormattedText(currentSlice)}
      {!isFinished && (
        <span 
          className="inline-block w-2 h-4 bg-indigo-600 animate-cursor-blink ml-0.5 align-middle rounded-xs shadow-xs" 
          aria-hidden="true"
        />
      )}
      {!isFinished && (
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-indigo-600 bg-indigo-50/80 border border-indigo-100 px-2 py-0.5 rounded-lg w-fit select-none cursor-pointer hover:bg-indigo-100 transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
          <span>AI печатает ответ... (кликните, чтобы раскрыть сразу)</span>
        </div>
      )}
    </div>
  );
};

export const TelegramChat: React.FC<Props> = ({
  messages,
  onSendMessage,
  isLoading,
  onApplyAction,
  onOpenDigest,
  products,
  onSelectProduct,
  onClearHistory,
}) => {
  const [inputText, setInputText] = useState('');
  const [showCommandsMenu, setShowCommandsMenu] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [pinnedDismissed, setPinnedDismissed] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [testPushSent, setTestPushSent] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [insertedFeedback, setInsertedFeedback] = useState<string | null>(null);
  const [intentMode, setIntentMode] = useState<'instant' | 'insert'>('instant');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [completedTypingIds, setCompletedTypingIds] = useState<Set<string>>(() => {
    return new Set(messages.map((m) => m.id));
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceTimerRef = useRef<any>(null);
  const chipsScrollRef = useRef<HTMLDivElement>(null);

  const scrollChips = (direction: 'left' | 'right') => {
    if (chipsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      chipsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleInsertIntent = (text: string, label: string) => {
    setInputText(text);
    if (inputRef.current) {
      inputRef.current.focus();
    }
    setInsertedFeedback(label);
    setTimeout(() => {
      setInsertedFeedback(null);
    }, 2500);
  };

  const handleExecuteIntent = (intent: PredefinedIntentItem, forceAction?: 'instant' | 'insert') => {
    const action = forceAction || intentMode;
    if (action === 'instant') {
      onSendMessage(intent.prompt);
      setInsertedFeedback(`⚡ Отправлен запрос: ${intent.title}`);
      setTimeout(() => {
        setInsertedFeedback(null);
      }, 2500);
    } else {
      handleInsertIntent(intent.prompt, intent.title);
    }
  };

  const handleTypingComplete = (id: string) => {
    setCompletedTypingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleExportHistory = () => {
    try {
      const exportPayload = {
        app: "CommerceOS AI Operator",
        botUsername: "@commerce_os_bot",
        exportedAt: new Date().toISOString(),
        totalMessages: messages.length,
        messages: messages.map((m) => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
          timestamp: m.timestamp,
          normalizedIntent: m.normalizedIntent || null,
          agentChain: m.agentChain || null,
          actionCard: m.actionCard || null,
          actionApplied: m.actionApplied || false,
        })),
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute(
        "download",
        `telegram_chat_history_${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle slash input trigger
  useEffect(() => {
    if (inputText.startsWith('/')) {
      setShowCommandsMenu(true);
    } else if (showCommandsMenu && !inputText.startsWith('/')) {
      setShowCommandsMenu(false);
    }
  }, [inputText]);

  // Voice recording timer
  useEffect(() => {
    if (isRecordingVoice) {
      setRecordingSeconds(0);
      voiceTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    }
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    };
  }, [isRecordingVoice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    if (inputText.trim() === '/clear' || inputText.trim() === '__CLEAR__') {
      if (onClearHistory) onClearHistory();
      setInputText('');
      setShowCommandsMenu(false);
      return;
    }

    onSendMessage(inputText.trim());
    setInputText('');
    setShowCommandsMenu(false);
  };

  const handleStartVoice = () => {
    setIsRecordingVoice(true);
  };

  const handleCancelVoice = () => {
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  const handleSendVoice = (presetText?: string) => {
    setIsRecordingVoice(false);
    const chosenPrompt = presetText || VOICE_PRESETS[Math.floor(Math.random() * VOICE_PRESETS.length)];
    onSendMessage(`🎙️ [Голосовое сообщение]: "${chosenPrompt}"`);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleSendTestPush = async () => {
    try {
      setTestPushSent(true);
      await fetch('/api/telegram-send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertType: 'critical_drop',
          title: '⚡ Срочное уведомление: Рюкзак городской',
          message: 'Позиция снизилась с #7 до #26 из-за демпинга. Рекомендуется снизить цену до 1 990 ₽.',
        }),
      });
      setTimeout(() => setTestPushSent(false), 3000);
    } catch (e) {
      setTestPushSent(false);
    }
  };

  // Filtered slash commands based on typed query
  const filteredCommands = SLASH_COMMANDS.filter((c) =>
    inputText ? c.cmd.toLowerCase().includes(inputText.toLowerCase()) || c.label.toLowerCase().includes(inputText.toLowerCase()) : true
  );

  // Helper to format telegram-like markdown
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Code block or quote
      if (line.startsWith('>')) {
        return (
          <div key={idx} className="border-l-2 border-indigo-400 pl-2.5 py-0.5 my-1 text-slate-600 italic bg-indigo-50/40 rounded-r text-xs">
            {line.substring(1).trim()}
          </div>
        );
      }

      // Monospace block or bullet item
      const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);

      return (
        <p key={idx} className={`leading-relaxed ${line.trim() === '' ? 'h-2' : 'mb-1'}`}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code key={pIdx} className="font-mono bg-slate-100 text-indigo-700 px-1 py-0.2 rounded text-[11px]">
                  {part.slice(1, -1)}
                </code>
              );
            }
            return <span key={pIdx} className="text-slate-700">{part}</span>;
          })}
        </p>
      );
    });
  };

  return (
    <div 
      id="telegram-chat-container"
      className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs relative"
    >
      {/* Telegram Channel Header */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white font-bold shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-50"></span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-slate-900 text-sm">CommerceOS AI Operator</h2>
              <span className="bg-indigo-50 text-indigo-600 p-0.5 rounded-full" title="Verified Operator Bot">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-mono font-bold">
                @commerce_os_bot
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              онлайн • WB v3 + Ozon + Shopify • Polling: 3с
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-chat-history-btn"
            onClick={handleExportHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            title="Экспортировать историю диалога в формате JSON"
          >
            {exportSuccess ? (
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span className="hidden sm:inline">
              {exportSuccess ? 'Экспортировано!' : 'Экспортировать историю'}
            </span>
          </button>

          <button
            id="open-webhook-modal-btn"
            onClick={() => setShowWebhookModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            title="Настройки Webhook и интеграции Telegram"
          >
            <Bell className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Webhook / Push</span>
          </button>

          <button
            id="open-morning-digest-btn"
            onClick={onOpenDigest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition-colors shadow-2xs cursor-pointer"
          >
            <SunMedium className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Сводка утра</span>
          </button>
        </div>
      </div>

      {/* Pinned Message Banner */}
      {!pinnedDismissed && (
        <div className="bg-indigo-50/90 border-b border-indigo-100 px-4 py-2 flex items-center justify-between gap-3 text-xs text-indigo-950 z-10 transition-all">
          <div 
            onClick={onOpenDigest}
            className="flex items-center gap-2 cursor-pointer hover:underline min-w-0 truncate"
          >
            <Pin className="w-3.5 h-3.5 text-indigo-600 shrink-0 rotate-45" />
            <span className="font-bold text-indigo-800 shrink-0">Закрепленное сообщение:</span>
            <span className="truncate text-slate-700">
              ☀️ Утренняя сводка: Выручка 314 500 ₽ (+14.2%), 3 критичных сигнала, авторепрайсер активен.
            </span>
          </div>

          <button
            onClick={() => setPinnedDismissed(true)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer shrink-0"
            title="Скрыть закрепленное сообщение"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Messages Feed Area */}
      <div 
        id="telegram-messages-feed"
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70 scroll-smooth"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isVoiceMsg = msg.text.includes('🎙️ [Голосовое сообщение]');

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full group`}
            >
              <div
                className={`relative px-4 py-3 rounded-2xl max-w-[94%] sm:max-w-[84%] text-sm shadow-xs transition-all ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                }`}
              >
                {!isUser && (
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-bold text-indigo-600 mb-1.5 pb-1 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>CommerceOS AI Orchestrator</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {msg.normalizedIntent && (
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {msg.normalizedIntent}
                        </span>
                      )}
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
                        title="Скопировать ответ"
                      >
                        {copiedMsgId === msg.id ? (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Agent Chain Execution Trace */}
                {!isUser && msg.agentChain && msg.agentChain.length > 0 && (
                  <div className="mb-2.5 flex items-center flex-wrap gap-1 text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                    <span className="text-slate-400">Pipeline:</span>
                    {msg.agentChain.map((agent, aIdx) => (
                      <span key={aIdx} className="flex items-center gap-1">
                        <span className="text-indigo-700 font-semibold">{agent}</span>
                        {aIdx < msg.agentChain!.length - 1 && <span className="text-slate-300">→</span>}
                      </span>
                    ))}
                  </div>
                )}

                {/* Message Body or Voice Bubble */}
                <div className="break-words text-xs sm:text-sm">
                  {isVoiceMsg ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 bg-white/10 p-2 rounded-xl border border-white/20">
                        <button
                          onClick={() => setPlayingVoiceId(playingVoiceId === msg.id ? null : msg.id)}
                          className="w-8 h-8 rounded-full bg-white text-indigo-600 flex items-center justify-center shrink-0 shadow-xs cursor-pointer"
                        >
                          {playingVoiceId === msg.id ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1 space-y-1">
                          {/* Animated Voice Waveform Bars */}
                          <div className="flex items-center gap-0.5 h-4">
                            {[12, 18, 8, 22, 16, 28, 14, 20, 26, 12, 18, 8, 22, 16, 28, 14, 20].map((h, bIdx) => (
                              <div
                                key={bIdx}
                                className={`w-1 rounded-full transition-all ${
                                  playingVoiceId === msg.id ? 'bg-indigo-200 animate-pulse' : 'bg-white/70'
                                }`}
                                style={{ height: `${h}px` }}
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-indigo-100">
                            <span>0:06</span>
                            <span>24.8 KB</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-indigo-100 italic bg-black/10 p-2 rounded-lg">
                        {msg.text.replace('🎙️ [Голосовое сообщение]: ', '')}
                      </p>
                    </div>
                  ) : isUser ? (
                    <p className="leading-relaxed">{msg.text}</p>
                  ) : (
                    <TypewriterMessage
                      id={msg.id}
                      text={msg.text}
                      isAlreadyTyped={completedTypingIds.has(msg.id)}
                      onComplete={handleTypingComplete}
                      renderFormattedText={renderFormattedText}
                      onScroll={scrollToBottom}
                    />
                  )}
                </div>

                {/* Telegram Inline Keyboard Buttons (Инлайн-кнопки в сообщении) */}
                {!isUser && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Быстрые команды бота:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <button
                        onClick={() => onSendMessage("Что конкретно нужно сделать прямо сейчас по товарам?")}
                        className="text-[11px] px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold border border-slate-200 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>⚡ Что делать прямо сейчас?</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button
                        onClick={() => onSendMessage("Покажи разбор по ключевым словам и позициям.")}
                        className="text-[11px] px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold border border-slate-200 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>🔎 Проверить позиции SEO</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button
                        onClick={() => onSendMessage("Рассчитай юнит-экономику с учетом логистики и комиссии.")}
                        className="text-[11px] px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold border border-slate-200 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>💰 Юнит-экономика и маржа</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button
                        onClick={() => onSendMessage("Проверь цены конкурентов и предложи авто-репрайсинг.")}
                        className="text-[11px] px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold border border-slate-200 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>📉 Мониторинг демпинга</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Interactive Action Card if attached */}
                {msg.actionCard && (
                  <div className="mt-3.5 pt-3 border-t border-slate-200">
                    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">
                          {msg.actionCard.title}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          {msg.actionCard.permissionLevel || 'WRITE'} • Подтвердить
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {msg.actionCard.description}
                      </p>

                      {msg.actionApplied ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Изменения успешно отправлены в API маркетплейса и занесены в Audit Log</span>
                        </div>
                      ) : (
                        <button
                          id={`apply-action-${msg.id}`}
                          onClick={() => {
                            if (msg.actionCard) {
                              onApplyAction(msg.actionCard.type, msg.actionCard);
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4 text-indigo-200" />
                          <span>{msg.actionCard.buttonLabel}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Message Timestamp */}
                <div className={`flex items-center justify-end gap-1 mt-1.5 text-[10px] select-none ${isUser ? 'text-indigo-200' : 'text-slate-400'}`}>
                  <span>{msg.timestamp}</span>
                  {isUser && <CheckCheck className="w-3 h-3 text-indigo-200" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs px-4 py-3 text-xs text-slate-600 flex items-center gap-2 shadow-xs">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
              </div>
              <span className="text-slate-500">AI Orchestrator анализирует API и формирует сводку...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Slash Commands Floating Autocomplete Overlay */}
      {showCommandsMenu && (
        <div className="absolute bottom-28 left-4 right-4 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-20 animate-in fade-in duration-100">
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1">
            <span>Команды AI-Оператора ({filteredCommands.length})</span>
            <button 
              onClick={() => setShowCommandsMenu(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">Команда не найдена</div>
            ) : (
              filteredCommands.map((cmd) => (
                <button
                  key={cmd.cmd}
                  onClick={() => {
                    if (cmd.prompt === '__CLEAR__') {
                      if (onClearHistory) onClearHistory();
                    } else {
                      onSendMessage(cmd.prompt);
                    }
                    setInputText('');
                    setShowCommandsMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-indigo-50 hover:text-indigo-700 font-medium text-slate-700 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>{cmd.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Horizontal Predefined Intents Panel (Interactive Chips for Predefined Intents) */}
      <div 
        id="predefined-intents-panel"
        className="bg-slate-50/95 px-3 py-2.5 border-t border-slate-200/90 flex flex-col gap-2 relative shadow-2xs backdrop-blur-xs"
      >
        {/* Top Header of the Panel */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
              <Zap className="w-3 h-3 fill-amber-300 text-amber-300" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800 text-[12px]">Predefined Intents</span>
              <span className="text-slate-400 font-medium text-[11px] hidden sm:inline">• быстрые сценарии управления</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {insertedFeedback && (
              <div className="flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold animate-in fade-in slide-in-from-right-2 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{insertedFeedback}</span>
              </div>
            )}

            {/* Mode Switcher: Instant Ask vs Insert in Input */}
            <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 text-[11px] shadow-2xs">
              <button
                type="button"
                id="intent-mode-instant-btn"
                onClick={() => setIntentMode('instant')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  intentMode === 'instant'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="При клике на чип запрос отправляется AI мгновенно"
              >
                <Zap className="w-3 h-3" />
                <span className="hidden md:inline">Спросить сразу</span>
              </button>
              <button
                type="button"
                id="intent-mode-insert-btn"
                onClick={() => setIntentMode('insert')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  intentMode === 'insert'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="При клике на чип текст вставляется в поле ввода для редактирования"
              >
                <CornerDownLeft className="w-3 h-3" />
                <span className="hidden md:inline">Вставить в поле</span>
              </button>
            </div>

            {/* Scroll Navigation Chevrons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollChips('left')}
                className="w-6 h-6 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                title="Прокрутить влево"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollChips('right')}
                className="w-6 h-6 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                title="Прокрутить вправо"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 text-[11px]">
          {[
            { id: 'all', label: 'Все интенты' },
            { id: 'analytics', label: '📊 Выручка & Финансы' },
            { id: 'catalog', label: '✨ Карточки & SEO' },
            { id: 'inventory', label: '📦 Остатки & Склады' },
            { id: 'pricing', label: '⚡ Цены & Репрайсинг' },
            { id: 'marketing', label: '🎯 Реклама & ДРР' },
            { id: 'china', label: '🇨🇳 Сорсинг Китая' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryFilter(cat.id)}
              className={`px-2.5 py-0.5 rounded-full whitespace-nowrap font-medium transition-all cursor-pointer ${
                activeCategoryFilter === cat.id
                  ? 'bg-slate-800 text-white font-bold shadow-2xs'
                  : 'bg-white/80 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Horizontal Chips Track */}
        <div 
          ref={chipsScrollRef}
          className="overflow-x-auto no-scrollbar flex items-center gap-2 py-1 scroll-smooth"
        >
          {PREDEFINED_INTENTS.filter((item) => activeCategoryFilter === 'all' || item.category === activeCategoryFilter).map((intent) => {
            const isRevenue = intent.id === 'analyze-revenue';
            const isListings = intent.id === 'optimize-listings';
            const isInventory = intent.id === 'review-inventory';
            
            return (
              <div
                key={intent.id}
                id={`intent-chip-card-${intent.id}`}
                className={`group shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-150 shadow-2xs cursor-pointer hover:shadow-xs hover:-translate-y-0.5 ${intent.accentColor.bg} ${intent.accentColor.border} ${intent.accentColor.hoverBorder}`}
                onClick={() => handleExecuteIntent(intent)}
                title={`Промпт: «${intent.prompt}»\nКликните для действия (${intentMode === 'instant' ? 'Мгновенно спросить' : 'Вставить в поле'})`}
              >
                {/* Icon */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${intent.accentColor.iconBg}`}>
                  {isRevenue && <TrendingUp className="w-4 h-4" />}
                  {isListings && <Sparkles className="w-4 h-4" />}
                  {isInventory && <Package className="w-4 h-4" />}
                  {intent.id === 'dynamic-repricer' && <Zap className="w-4 h-4" />}
                  {intent.id === 'ad-spend-tacos' && <Target className="w-4 h-4" />}
                  {intent.id === 'unit-economics' && <DollarSign className="w-4 h-4" />}
                  {intent.id === 'china-sourcing' && <Factory className="w-4 h-4" />}
                  {intent.id === 'review-feedback' && <Star className="w-4 h-4" />}
                </div>

                {/* Text Content */}
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold whitespace-nowrap ${intent.accentColor.text}`}>
                      {intent.title}
                    </span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-md ${intent.accentColor.badgeBg}`}>
                      {intent.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                    {intent.subtitleRu}
                  </span>
                </div>

                {/* Secondary Quick Action Button inside Chip */}
                <div className="flex items-center gap-1 pl-1 border-l border-slate-300/60 ml-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInsertIntent(intent.prompt, intent.title);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-white/80 transition-colors"
                    title="Вставить текст промпта в поле ввода"
                  >
                    <CornerDownLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendMessage(intent.prompt);
                      setInsertedFeedback(`⚡ ${intent.title}`);
                      setTimeout(() => setInsertedFeedback(null), 2500);
                    }}
                    className="p-1 rounded-md text-indigo-600 hover:text-white hover:bg-indigo-600 transition-colors"
                    title="Мгновенно отправить в AI"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Prompts Carousel */}
      <div className="bg-white px-3 py-1.5 border-t border-slate-200 overflow-x-auto no-scrollbar flex items-center gap-2">
        <button
          onClick={() => setShowCommandsMenu(!showCommandsMenu)}
          className="flex items-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-xl font-bold border border-indigo-200 whitespace-nowrap transition-colors cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>/команды</span>
        </button>

        {QUICK_PROMPTS.map((qp) => (
          <button
            key={qp.id}
            id={`quick-prompt-${qp.id}`}
            onClick={() => onSendMessage(qp.prompt)}
            disabled={isLoading}
            className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 px-3 py-1 rounded-full border border-slate-200 whitespace-nowrap transition-all disabled:opacity-50 active:scale-95 shadow-2xs cursor-pointer"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Voice Recording Bar (Active State) */}
      {isRecordingVoice ? (
        <div className="bg-rose-50/90 border-t border-rose-200 p-3 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping"></span>
            <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
              <Mic className="w-4 h-4 text-rose-600" />
              Запись голосового: 00:{String(recordingSeconds).padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelVoice}
              className="px-3 py-1.5 rounded-xl bg-white text-slate-600 border border-slate-200 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={() => handleSendVoice()}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-xs cursor-pointer"
            >
              Отправить
            </button>
          </div>
        </div>
      ) : (
        /* Standard Telegram Input Bar */
        <form
          onSubmit={handleSubmit}
          className="bg-white p-3 border-t border-slate-200 flex items-center gap-2"
        >
          <input
            ref={inputRef}
            id="telegram-input-field"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Напишите AI-менеджеру обычным языком или введите /sales..."
            className="flex-1 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/30 transition-all"
            disabled={isLoading}
          />

          {/* Voice Memo Button */}
          <button
            type="button"
            onClick={handleStartVoice}
            disabled={isLoading}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 flex items-center justify-center transition-all border border-slate-200 shadow-2xs cursor-pointer"
            title="Записать голосовое сообщение"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Send Button */}
          <button
            id="telegram-send-btn"
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer"
            title="Отправить (Enter)"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      )}

      {/* Telegram Webhook & Notifications Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Настройки Telegram Webhook & Push
                  </h3>
                  <p className="text-xs text-slate-500">
                    Прямая доставка алертов и управление магазином через @commerce_os_bot
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWebhookModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Webhook URL:</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                    ACTIVE (200 OK)
                  </span>
                </div>
                <code className="block bg-white p-2 rounded border border-slate-200 text-indigo-700 font-mono text-[11px] select-all">
                  https://api.commerce-os.ai/api/telegram-webhook
                </code>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-800 block">
                  Активные триггеры мгновенных уведомлений в чат:
                </span>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded accent-indigo-600" />
                    <span>Критичное падение позиций в поиске ($\ge 3$ мест)</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded accent-indigo-600" />
                    <span>Остаток FBO менее 5 дней (риск out-of-stock)</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded accent-indigo-600" />
                    <span>Демпинг конкурента ниже вашей минимальной цены</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded accent-indigo-600" />
                    <span>Появление негативного отзыва ($\le 3$ звезды)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={handleSendTestPush}
                disabled={testPushSent}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                {testPushSent ? '✓ Тестовый пуш отправлен!' : '⚡ Отправить тестовый пуш'}
              </button>

              <button
                onClick={() => setShowWebhookModal(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

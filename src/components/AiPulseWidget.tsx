import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  Zap, 
  RotateCw, 
  CheckCircle2, 
  Sparkles, 
  Radio, 
  Layers, 
  Bot, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Database,
  Play,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Building2
} from 'lucide-react';
import { Store } from '../types';

export type OrchestratorStatus = 'Active' | 'Thinking' | 'Idle';

interface BackgroundTask {
  id: string;
  name: string;
  category: string;
  progress: number;
  status: 'running' | 'completed' | 'queued';
  eta: string;
  agent: string;
}

const INITIAL_TASKS: BackgroundTask[] = [
  {
    id: 'task-1',
    name: 'Синхронизация остатков FBO (Коледино, Казань, Электросталь)',
    category: 'Inventory Engine',
    progress: 84,
    status: 'running',
    eta: '3 сек',
    agent: 'StockGuard'
  },
  {
    id: 'task-2',
    name: 'Парсинг цен и ставок 12 конкурентов по категории «Одежда»',
    category: 'Repricer Bot',
    progress: 100,
    status: 'completed',
    eta: 'Завершено',
    agent: 'CompetitorRadar'
  },
  {
    id: 'task-3',
    name: 'SEO-скоринг карточек товаров и позиций поисковой выдачи',
    category: 'Rank & Search',
    progress: 62,
    status: 'running',
    eta: '7 сек',
    agent: 'SeoOptimizer'
  },
  {
    id: 'task-4',
    name: 'Кластеризация тональности новых отзывов покупателей',
    category: 'Review Intelligence',
    progress: 45,
    status: 'running',
    eta: '11 сек',
    agent: 'ReviewAnalyst'
  },
];

interface Props {
  storeName?: string;
  currentStore?: Store;
  stores?: Store[];
  onSelectStore?: (store: Store) => void;
  onOpenAudit?: () => void;
}

export const AiPulseWidget: React.FC<Props> = ({ 
  storeName = 'WB Fashion Core',
  currentStore,
  stores,
  onSelectStore,
  onOpenAudit
}) => {
  const [status, setStatus] = useState<OrchestratorStatus>('Active');
  const [tasks, setTasks] = useState<BackgroundTask[]>(INITIAL_TASKS);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('12 сек назад');
  const [cycleCount, setCycleCount] = useState(1420);
  const [latencyMs, setLatencyMs] = useState(38);
  const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);

  // Active store display name
  const activeStoreName = currentStore ? currentStore.name : storeName;

  // Periodic subtle task progress simulation to make the widget feel authentically alive
  useEffect(() => {
    const timer = setInterval(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.status === 'completed') return t;
          const increment = Math.floor(Math.random() * 6) + 3;
          const nextProg = Math.min(100, t.progress + increment);
          return {
            ...t,
            progress: nextProg,
            status: nextProg >= 100 ? 'completed' : 'running',
            eta: nextProg >= 100 ? 'Завершено' : `${Math.max(1, Math.round((100 - nextProg) / 5))} сек`,
          };
        })
      );

      // Random jitter for API latency (32ms - 45ms)
      setLatencyMs(Math.floor(Math.random() * 14) + 32);
    }, 2800);

    return () => clearInterval(timer);
  }, []);

  // Force manual sync cycle
  const handleTriggerCycle = () => {
    setIsSyncing(true);
    setStatus('Thinking');
    
    // Reset tasks
    setTasks([
      {
        id: 'task-1',
        name: 'Синхронизация остатков FBO (Коледино, Казань, Электросталь)',
        category: 'Inventory Engine',
        progress: 15,
        status: 'running',
        eta: '8 сек',
        agent: 'StockGuard'
      },
      {
        id: 'task-2',
        name: 'Парсинг цен и ставок 12 конкурентов по категории «Одежда»',
        category: 'Repricer Bot',
        progress: 25,
        status: 'running',
        eta: '6 сек',
        agent: 'CompetitorRadar'
      },
      {
        id: 'task-3',
        name: 'SEO-скоринг карточек товаров и позиций поисковой выдачи',
        category: 'Rank & Search',
        progress: 10,
        status: 'running',
        eta: '12 сек',
        agent: 'SeoOptimizer'
      },
      {
        id: 'task-4',
        name: 'Кластеризация тональности новых отзывов покупателей',
        category: 'Review Intelligence',
        progress: 5,
        status: 'running',
        eta: '14 сек',
        agent: 'ReviewAnalyst'
      },
    ]);

    setTimeout(() => {
      setStatus('Active');
    }, 1200);

    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime('только что');
      setCycleCount((prev) => prev + 1);
    }, 3500);
  };

  // Status visual configs
  const statusConfig = {
    Active: {
      label: 'Active (Исполнение)',
      description: 'Оркестратор обрабатывает фоновые пайплайны и выполняет правила автоматизации',
      bgBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotColor: 'bg-emerald-500',
      pingColor: 'bg-emerald-400',
      icon: <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />,
      tag: 'Синхронизация активна',
    },
    Thinking: {
      label: 'Thinking (Анализ & AI-скоринг)',
      description: 'Глубокая кластеризация данных маркетплейса, прогноз остатков и ценовых коридоров',
      bgBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      dotColor: 'bg-indigo-600',
      pingColor: 'bg-indigo-400',
      icon: <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />,
      tag: 'AI-генерация гипотез',
    },
    Idle: {
      label: 'Idle (Мониторинг)',
      description: 'Все пайплайны в штатном режиме. Ожидание событий вебхуков и таймеров авторепрайсера',
      bgBadge: 'bg-slate-100 text-slate-700 border-slate-200',
      dotColor: 'bg-slate-400',
      pingColor: 'bg-slate-300',
      icon: <Clock className="w-4 h-4 text-slate-500" />,
      tag: 'Режим ожидания',
    },
  };

  const currentConfig = statusConfig[status];
  const activeTasksCount = tasks.filter((t) => t.status === 'running').length;
  const overallProgress = Math.round(
    tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
      {/* Top Header with AI Pulse status + Store Switcher */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/80 text-indigo-600 shrink-0">
            <Cpu className="w-5 h-5" />
            <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${currentConfig.dotColor}`}>
              <span className={`absolute inset-0 rounded-full animate-ping opacity-75 ${currentConfig.pingColor}`}></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                AI-Пульс
              </span>

              {/* Store Switcher next to AI Pulse */}
              {stores && stores.length > 0 && onSelectStore ? (
                <div className="relative inline-block">
                  <button
                    id="ai-pulse-store-switcher-btn"
                    onClick={() => setIsStoreMenuOpen(!isStoreMenuOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                    title="Переключить магазин"
                  >
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{activeStoreName}</span>
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  </button>

                  {isStoreMenuOpen && (
                    <div className="absolute left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40 animate-in fade-in duration-100">
                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Выбор магазина для мониторинга
                      </div>
                      {stores.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            onSelectStore(s);
                            setIsStoreMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            currentStore?.id === s.id ? 'bg-indigo-50/70 text-indigo-700 font-bold' : 'text-slate-700'
                          }`}
                        >
                          <span className="truncate">{s.name}</span>
                          <span className="text-[10px] uppercase font-mono px-1 rounded bg-slate-100 text-slate-500 shrink-0">
                            {s.marketplace}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {activeStoreName}
                </span>
              )}

              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentConfig.bgBadge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${currentConfig.dotColor}`}></span>
                {currentConfig.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              {currentConfig.description}
            </p>
          </div>
        </div>

        {/* Action & Status Switchers */}
        <div className="flex items-center gap-2 self-stretch lg:self-auto justify-between lg:justify-end flex-wrap">
          {/* Quick status selector toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-semibold">
            {(['Idle', 'Active', 'Thinking'] as OrchestratorStatus[]).map((s) => (
              <button
                key={s}
                id={`ai-pulse-status-btn-${s.toLowerCase()}`}
                onClick={() => setStatus(s)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  status === s
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Trigger Cycle Button */}
          <button
            id="trigger-orchestrator-sync-btn"
            onClick={handleTriggerCycle}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Запустить немедленный цикл синхронизации"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{isSyncing ? 'Синхронизация...' : 'Запустить цикл'}</span>
          </button>
        </div>
      </div>

      {/* Engine Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3 border-b border-slate-100 text-xs">
        <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/70">
          <div className="text-[10px] text-slate-500 font-medium">Общий прогресс</div>
          <div className="text-sm font-extrabold text-slate-800 mt-0.5 flex items-center justify-between">
            <span>{overallProgress}%</span>
            <span className="text-[10px] font-normal text-slate-400">
              {activeTasksCount > 0 ? `${activeTasksCount} в работе` : 'Готово'}
            </span>
          </div>
        </div>

        <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/70">
          <div className="text-[10px] text-slate-500 font-medium">Задержка API</div>
          <div className="text-sm font-extrabold text-emerald-600 mt-0.5 flex items-center gap-1">
            <span>{latencyMs} ms</span>
            <span className="text-[10px] text-emerald-500 font-semibold">• Отлично</span>
          </div>
        </div>

        <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/70">
          <div className="text-[10px] text-slate-500 font-medium">Выполнено циклов</div>
          <div className="text-sm font-extrabold text-slate-800 mt-0.5">
            {cycleCount.toLocaleString('ru-RU')}
          </div>
        </div>

        <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/70">
          <div className="text-[10px] text-slate-500 font-medium">Последний синк</div>
          <div className="text-sm font-extrabold text-slate-800 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{lastSyncTime}</span>
          </div>
        </div>
      </div>

      {/* Main Overall Progress Bar */}
      <div className="pt-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Фоновые микросервисы</span>
            <span className="text-[11px] text-slate-400">
              ({tasks.filter(t => t.status === 'completed').length} из {tasks.length} завершено)
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{isExpanded ? 'Скрыть детали' : 'Показать все задачи'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Master Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/60 relative">
          <div 
            className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-500 relative"
            style={{ width: `${overallProgress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Expanded Background Tasks Details */}
      {isExpanded && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2.5 animate-in fade-in duration-150">
          {tasks.map((task) => (
            <div 
              key={task.id}
              className="bg-slate-50/70 hover:bg-slate-50 rounded-xl p-3 border border-slate-200/80 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                  <span className="font-semibold text-slate-800 truncate">
                    {task.name}
                  </span>
                  <span className="text-[10px] bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded font-medium shrink-0">
                    {task.agent}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-500">{task.eta}</span>
                  <span className="font-bold text-slate-900 text-xs w-9 text-right">
                    {task.progress}%
                  </span>
                </div>
              </div>

              {/* Task Individual Progress Bar */}
              <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    task.status === 'completed'
                      ? 'bg-emerald-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

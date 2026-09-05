import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Filter, 
  Search, 
  Terminal, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Brain, 
  Zap, 
  Radio, 
  ShieldCheck, 
  Code2, 
  Copy, 
  Check, 
  ArrowRight, 
  Sparkles, 
  Factory, 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  Sliders, 
  Eye, 
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Flame,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { 
  OrchestratorEvent, 
  OrchestratorEventType, 
  OrchestratorEventSeverity, 
  Store, 
  Organization 
} from '../types';
import { 
  INITIAL_ORCHESTRATOR_EVENTS, 
  SCENARIO_TEMPLATES, 
  generateSimulatedScenarioEvents 
} from '../utils/eventStreamEngine';

interface Props {
  currentStore?: Store;
  organization?: Organization;
  onNavigateToTab?: (tab: string, subTab?: string) => void;
}

export const EventStreamViewer: React.FC<Props> = ({
  currentStore,
  organization,
  onNavigateToTab,
}) => {
  // Event stream state
  const [events, setEvents] = useState<OrchestratorEvent[]>(INITIAL_ORCHESTRATOR_EVENTS);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [streamSpeed, setStreamSpeed] = useState<number>(1); // 1x, 2x, 5x
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'timeline' | 'terminal'>('timeline');
  const [selectedEvent, setSelectedEvent] = useState<OrchestratorEvent | null>(null);
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set(['evt-103', 'evt-111']));
  const [activeScenarioRunning, setActiveScenarioRunning] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<'all' | OrchestratorEventSeverity>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [onlyErrors, setOnlyErrors] = useState<boolean>(false);

  // Live WebSocket Stats simulation
  const [latencyMs, setLatencyMs] = useState<number>(18);
  const [eventsPerSec, setEventsPerSec] = useState<number>(2.4);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showInspectorModal, setShowInspectorModal] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  // Jitter latency slightly to feel authentically live
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setLatencyMs(Math.floor(14 + Math.random() * 12));
      setEventsPerSec(Number((1.2 + Math.random() * 2.5).toFixed(1)));
    }, 2000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Periodic heartbeat background events when streaming
  useEffect(() => {
    if (!isStreaming) return;

    const backgroundInterval = setInterval(() => {
      // 30% chance to generate a minor background telemetry event
      if (Math.random() > 0.45) {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${Math.floor(Math.random() * 900 + 100)}`;
        
        const backgroundTemplates: Array<{
          type: OrchestratorEventType;
          severity: OrchestratorEventSeverity;
          module: OrchestratorEvent['sourceModule'];
          title: string;
          details: string;
          ms: number;
        }> = [
          {
            type: 'CONNECTOR_RESPONSE',
            severity: 'info',
            module: '1688 Connector',
            title: '1688 Supplier Quotation Stream Heartbeat (Guangzhou Node)',
            details: 'Проверка доступности шлюза 1688 Open Gateway. Пинг 112ms, 0 дропов пакетов.',
            ms: 18,
          },
          {
            type: 'GUARDRAIL_CHECK',
            severity: 'success',
            module: 'Safety Guardrails',
            title: 'Проверка целостности тенантной изоляции (Tenant Memory Check)',
            details: `Изоляция контекста организации "${organization?.name || 'Vostok Silk Trade'}" подтверждена. Чужие токены не затронуты.`,
            ms: 9,
          },
          {
            type: 'CALCULATION_STEP',
            severity: 'decision',
            module: 'Rule Engine',
            title: 'Фоновый мониторинг маржинального коридора розницы (WB / Ozon)',
            details: 'Отклонений от таргета прибыли не выявлено. 14 SKU находятся в оптимальной ценовой зоне.',
            ms: 22,
          },
        ];

        const pick = backgroundTemplates[Math.floor(Math.random() * backgroundTemplates.length)];
        const newEvt: OrchestratorEvent = {
          id: `evt-live-${Date.now()}-${Math.floor(Math.random() * 100)}`,
          timestamp: timeStr,
          isoTime: now.toISOString(),
          taskId: `task-bg-${Math.random().toString(36).substring(2, 6)}`,
          taskName: 'Telemetry & Background Orchestration Worker',
          stepNumber: 1,
          totalSteps: 1,
          type: pick.type,
          severity: pick.severity,
          sourceModule: pick.module,
          title: pick.title,
          details: pick.details,
          executionMs: pick.ms,
        };

        setEvents((prev) => {
          const next = [...prev, newEvt];
          // Keep maximum 120 events in buffer for performance
          return next.slice(-120);
        });
      }
    }, Math.max(1200 / streamSpeed, 600));

    return () => clearInterval(backgroundInterval);
  }, [isStreaming, streamSpeed, organization]);

  // Run scenario simulator
  const handleTriggerScenario = (scenarioId: string) => {
    setActiveScenarioRunning(scenarioId);
    const scenarioEvents = generateSimulatedScenarioEvents(scenarioId);

    // Stream them step by step with delay
    scenarioEvents.forEach((evt, idx) => {
      setTimeout(() => {
        setEvents((prev) => [...prev, evt]);
        if (idx === scenarioEvents.length - 1) {
          setActiveScenarioRunning(null);
        }
      }, (idx + 1) * (650 / streamSpeed));
    });
  };

  const handleToggleExpand = (id: string) => {
    setExpandedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyPayload = (payload: any, id: string) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `orchestrator-event-stream-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClearLogs = () => {
    setEvents([]);
  };

  const handleResetToDefault = () => {
    setEvents(INITIAL_ORCHESTRATOR_EVENTS);
  };

  // Filtered Events
  const filteredEvents = events.filter((evt) => {
    if (onlyErrors && evt.severity !== 'error' && evt.severity !== 'warning') return false;
    if (severityFilter !== 'all' && evt.severity !== severityFilter) return false;
    if (moduleFilter !== 'all' && evt.sourceModule !== moduleFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = evt.title.toLowerCase().includes(q);
      const matchDetails = evt.details.toLowerCase().includes(q);
      const matchTask = evt.taskName.toLowerCase().includes(q) || evt.taskId.toLowerCase().includes(q);
      const matchModule = evt.sourceModule.toLowerCase().includes(q);
      const matchPayload = evt.payload ? JSON.stringify(evt.payload).toLowerCase().includes(q) : false;
      if (!matchTitle && !matchDetails && !matchTask && !matchModule && !matchPayload) return false;
    }
    return true;
  });

  // Unique Modules in stream
  const availableModules = Array.from(new Set(events.map((e) => e.sourceModule)));

  // Severity Stats
  const stats = {
    total: events.length,
    errors: events.filter((e) => e.severity === 'error').length,
    warnings: events.filter((e) => e.severity === 'warning').length,
    decisions: events.filter((e) => e.severity === 'decision').length,
    success: events.filter((e) => e.severity === 'success').length,
  };

  // Helper for Severity Badge & Color
  const getSeverityStyle = (severity: OrchestratorEventSeverity) => {
    switch (severity) {
      case 'error':
        return {
          badge: 'bg-rose-100 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
          border: 'border-rose-200 bg-rose-50/40',
        };
      case 'warning':
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
          border: 'border-amber-200 bg-amber-50/30',
        };
      case 'decision':
        return {
          badge: 'bg-purple-100 text-purple-800 border-purple-300',
          dot: 'bg-purple-500',
          icon: <Brain className="w-3.5 h-3.5 text-purple-600" />,
          border: 'border-purple-200 bg-purple-50/30',
        };
      case 'success':
        return {
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          border: 'border-emerald-200 bg-emerald-50/20',
        };
      default:
        return {
          badge: 'bg-blue-100 text-blue-800 border-blue-300',
          dot: 'bg-blue-500',
          icon: <Info className="w-3.5 h-3.5 text-blue-600" />,
          border: 'border-slate-200 bg-white',
        };
    }
  };

  return (
    <div id="event-stream-viewer-container" className="space-y-6">
      {/* 1. Live Stream Connection Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Connection status and protocol details */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className={`w-3.5 h-3.5 rounded-full ${isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {isStreaming && (
              <span className="absolute -inset-1 rounded-full bg-emerald-400/30 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5" />
                {isStreaming ? 'STREAM: LIVE WSS' : 'STREAM: PAUSED'}
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                wss://api.commerceos.internal/v1/orchestrator/events
              </span>
              <span className="text-[10px] bg-indigo-950 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-800/60">
                Tenant: {organization?.id || 'org-vostok'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Прозрачный журнал выполнения задач: детерминированные правила, вызовы API 1688/WB/Ozon, логика LLM и защита маржинальности.
            </p>
          </div>
        </div>

        {/* Live metrics & Stream control actions */}
        <div className="flex items-center gap-3 flex-wrap self-stretch lg:self-auto justify-between lg:justify-end border-t lg:border-t-0 border-slate-800 pt-3 lg:pt-0">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
            <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5" title="WebSocket Round Trip Time">
              <Clock className="w-3 h-3 text-emerald-400" />
              {latencyMs}ms
            </span>
            <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5" title="Событий в секунду">
              <Activity className="w-3 h-3 text-indigo-400" />
              {eventsPerSec} evt/s
            </span>
            <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 font-bold text-white">
              {events.length} в буфере
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Play / Pause */}
            <button
              id="btn-toggle-stream"
              type="button"
              onClick={() => setIsStreaming((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isStreaming 
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40' 
                  : 'bg-emerald-500 text-slate-900 hover:bg-emerald-400 font-bold shadow-md'
              }`}
            >
              {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isStreaming ? 'Пауза' : 'Возобновить'}</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
              {[1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setStreamSpeed(speed)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                    streamSpeed === speed ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Auto-scroll Toggle */}
            <button
              id="btn-toggle-autoscroll"
              type="button"
              onClick={() => setAutoScroll((prev) => !prev)}
              className={`p-1.5 rounded-xl text-xs border transition-all cursor-pointer ${
                autoScroll 
                  ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title={autoScroll ? 'Автопрокрутка включена' : 'Автопрокрутка выключена'}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${autoScroll ? 'rotate-90 text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Scenario Simulators (One-Click Triggers) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Сценарии оркестрации для живой проверки процесса принятия решений
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Генерирует реальную последовательность шагов оркестратора
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {SCENARIO_TEMPLATES.map((sc) => {
            const isRunning = activeScenarioRunning === sc.id;
            return (
              <button
                key={sc.id}
                id={`btn-trigger-${sc.id}`}
                type="button"
                disabled={isRunning}
                onClick={() => handleTriggerScenario(sc.id)}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                  isRunning
                    ? 'bg-indigo-50 border-indigo-300 shadow-sm ring-2 ring-indigo-400/40'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-indigo-200 hover:shadow-xs'
                }`}
              >
                {isRunning && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600 animate-pulse" />
                )}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                      {sc.badge}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {sc.eventsCount} шагов
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {sc.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {sc.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-600 mt-3 pt-2 border-t border-slate-200/60">
                  <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                    <Clock className="w-3 h-3" />
                    ≈ {sc.durationSec} сек
                  </span>
                  <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    {isRunning ? 'Выполняется...' : 'Запустить'}
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Decision Making Architecture Pipeline Visualizer */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-indigo-900/50">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-200">
              Архитектурный конвейер принятия решений (Decision Pipeline Lifecycle)
            </h3>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            0% LLM Hallucinations (Детерминированный расчет)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            {
              step: '01',
              title: 'Ingestion & Context',
              desc: 'Захват события, парсинг SKU, привязка к тенанту и валюте (¥/₽)',
              icon: Radio,
              color: 'text-blue-400',
            },
            {
              step: '02',
              title: 'Rule Engine',
              desc: 'Проверка жестких бизнес-правил селлера без участия нейросети',
              icon: Sliders,
              color: 'text-indigo-400',
            },
            {
              step: '03',
              title: 'Connector Dispatch',
              desc: 'Запрос цен 1688 / Taobao / остатков WB с защитой Circuit Breaker',
              icon: Factory,
              color: 'text-amber-400',
            },
            {
              step: '04',
              title: 'Safety Guardrails',
              desc: 'Проверка Margin Floor (>=20%) и максимального коридора изменений',
              icon: ShieldCheck,
              color: 'text-emerald-400',
            },
            {
              step: '05',
              title: 'Safe Action & Audit',
              desc: 'Запись в журнал аудита и публикация карточки действия селлеру',
              icon: CheckCircle2,
              color: 'text-purple-400',
            },
          ].map((pipe) => {
            const Icon = pipe.icon;
            return (
              <div
                key={pipe.step}
                className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      ШАГ {pipe.step}
                    </span>
                    <Icon className={`w-3.5 h-3.5 ${pipe.color}`} />
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    {pipe.title}
                  </h4>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    {pipe.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Stream Filter & Control Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="event-stream-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск по SKU, названию задачи, тексту ошибки или модулю..."
            className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Severity Filter Badges */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => { setSeverityFilter('all'); setOnlyErrors(false); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              severityFilter === 'all' && !onlyErrors
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Все ({stats.total})
          </button>

          <button
            onClick={() => { setSeverityFilter('decision'); setOnlyErrors(false); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              severityFilter === 'decision'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <Brain className="w-3 h-3" />
            Решения ({stats.decisions})
          </button>

          <button
            onClick={() => { setSeverityFilter('error'); setOnlyErrors(false); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              severityFilter === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <XCircle className="w-3 h-3" />
            Ошибки ({stats.errors})
          </button>

          <button
            onClick={() => { setSeverityFilter('warning'); setOnlyErrors(false); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              severityFilter === 'warning'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Предупреждения ({stats.warnings})
          </button>

          <button
            onClick={() => { setSeverityFilter('success'); setOnlyErrors(false); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              severityFilter === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Успех ({stats.success})
          </button>
        </div>

        {/* View Mode & Actions */}
        <div className="flex items-center gap-2">
          {/* Module Selector */}
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Все модули ({availableModules.length})</option>
            {availableModules.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Timeline vs Terminal view */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Timeline</span>
            </button>
            <button
              onClick={() => setViewMode('terminal')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'terminal' ? 'bg-slate-900 text-emerald-400 shadow-2xs font-mono' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Console</span>
            </button>
          </div>

          {/* Export & Reset */}
          <button
            onClick={handleExportLogs}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Экспорт потока событий в JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetToDefault}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Сбросить поток к исходному состоянию"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5. Main Stream Display Area */}
      {viewMode === 'timeline' ? (
        <div 
          ref={scrollContainerRef}
          id="event-stream-timeline-container"
          className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 max-h-[600px] overflow-y-auto space-y-3 shadow-inner"
        >
          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">Нет событий, удовлетворяющих выбранным фильтрам</p>
              <button
                onClick={() => { setSearchTerm(''); setSeverityFilter('all'); setModuleFilter('all'); }}
                className="mt-2 text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
              >
                Сбросить фильтры
              </button>
            </div>
          ) : (
            filteredEvents.map((evt, index) => {
              const style = getSeverityStyle(evt.severity);
              const isExpanded = expandedEventIds.has(evt.id);

              return (
                <div
                  key={evt.id}
                  id={`stream-event-${evt.id}`}
                  className={`border rounded-xl transition-all shadow-2xs hover:shadow-xs ${style.border}`}
                >
                  {/* Event Main Header Row */}
                  <div 
                    onClick={() => handleToggleExpand(evt.id)}
                    className="p-3 sm:p-3.5 flex items-start justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Severity Icon Indicator */}
                      <div className="mt-0.5 shrink-0">
                        {style.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Top meta tags */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-[11px] font-bold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                            {evt.timestamp}
                          </span>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200/80">
                            {evt.sourceModule}
                          </span>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 truncate max-w-[200px]">
                            {evt.taskName}
                          </span>
                          {evt.totalSteps > 1 && (
                            <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                              Шаг {evt.stepNumber}/{evt.totalSteps}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${style.badge}`}>
                            {evt.type}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {evt.title}
                        </h4>

                        {/* Details */}
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                          {evt.details}
                        </p>
                      </div>
                    </div>

                    {/* Right side stats & expand toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-slate-400 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                        {evt.executionMs}ms
                      </span>
                      <button
                        type="button"
                        className="p-1 rounded text-slate-400 hover:text-slate-600"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Payload & Decision Path */}
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-200/60 bg-white/80 rounded-b-xl space-y-3">
                      {/* Decision Path Stack if present */}
                      {evt.decisionPath && (
                        <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3 text-xs space-y-1.5">
                          <div className="flex items-center justify-between font-bold text-purple-900">
                            <span className="flex items-center gap-1.5">
                              <Brain className="w-3.5 h-3.5 text-purple-600" />
                              Оценка детерминированного бизнес-правила (Decision Trace)
                            </span>
                            {evt.decisionPath.confidenceScore && (
                              <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                                Уверенность: {(evt.decisionPath.confidenceScore * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                          {evt.decisionPath.ruleName && (
                            <div className="text-slate-700">
                              <strong>Правило:</strong> {evt.decisionPath.ruleName} ({evt.decisionPath.ruleId})
                            </div>
                          )}
                          {(evt.decisionPath.marginBefore !== undefined || evt.decisionPath.marginAfter !== undefined) && (
                            <div className="flex items-center gap-3 text-slate-700 font-mono text-[11px]">
                              <span>Маржа до: <strong>{evt.decisionPath.marginBefore}%</strong></span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span>Маржа после: <strong className="text-emerald-700">{evt.decisionPath.marginAfter}%</strong></span>
                            </div>
                          )}
                          {evt.decisionPath.safetyChecks && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              <span className="text-[10px] text-purple-700 font-bold">Safety Checks:</span>
                              {evt.decisionPath.safetyChecks.map((sc) => (
                                <span key={sc} className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  {sc}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Error Stack if present */}
                      {evt.errorStack && (
                        <div className="bg-rose-950 text-rose-200 rounded-xl p-3 font-mono text-[11px] overflow-x-auto border border-rose-800">
                          <div className="text-rose-400 font-bold mb-1 flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Exception Call Stack (Intercepted by Circuit Breaker)
                          </div>
                          <pre className="text-[10px] leading-relaxed whitespace-pre-wrap">{evt.errorStack}</pre>
                        </div>
                      )}

                      {/* Payload JSON Inspector */}
                      {evt.payload && (
                        <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 text-white font-mono text-xs">
                          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Code2 className="w-3 h-3 text-indigo-400" />
                              Payload & Context Parameters
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyPayload(evt.payload, evt.id)}
                              className="hover:text-white flex items-center gap-1 cursor-pointer bg-slate-800 px-2 py-0.5 rounded"
                            >
                              {copiedId === evt.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId === evt.id ? 'Скопировано' : 'Copy JSON'}</span>
                            </button>
                          </div>
                          <pre className="text-[11px] text-indigo-200 overflow-x-auto max-h-48 leading-relaxed">
                            {JSON.stringify(evt.payload, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Quick Inspector button */}
                      <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                        <span className="font-mono">Task ID: <strong className="text-slate-700">{evt.taskId}</strong></span>
                        <button
                          type="button"
                          onClick={() => { setSelectedEvent(evt); setShowInspectorModal(true); }}
                          className="text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          Глубокая инспекция события
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Terminal Console View */
        <div 
          ref={scrollContainerRef}
          id="event-stream-terminal-container"
          className="bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-2xl max-h-[600px] overflow-y-auto border border-slate-800 shadow-2xl space-y-1"
        >
          <div className="text-slate-500 text-[11px] pb-2 border-b border-slate-900 flex items-center justify-between">
            <span>[ORCHESTRATOR LIVE STREAM CONSOLE - COMMERCEOS REALTIME KERNEL v2.4]</span>
            <span>{isStreaming ? 'CONNECTED 200 OK' : 'STREAM PAUSED'}</span>
          </div>
          {filteredEvents.map((evt) => {
            const colorClass = 
              evt.severity === 'error' ? 'text-rose-400' :
              evt.severity === 'warning' ? 'text-amber-400' :
              evt.severity === 'decision' ? 'text-purple-300' :
              evt.severity === 'success' ? 'text-emerald-400' :
              'text-cyan-300';

            return (
              <div key={evt.id} className="hover:bg-white/5 py-0.5 px-1 rounded flex items-start gap-2">
                <span className="text-slate-600 select-none shrink-0">{evt.timestamp}</span>
                <span className={`font-bold shrink-0 ${colorClass}`}>[{evt.type}]</span>
                <span className="text-slate-400 shrink-0">({evt.sourceModule})</span>
                <span className="text-slate-200 flex-1">{evt.title}</span>
                <span className="text-slate-600 shrink-0">{evt.executionMs}ms</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Event Detail Inspector Modal */}
      {showInspectorModal && selectedEvent && (
        <div 
          id="event-inspector-modal"
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold">
                  Инспектор события оркестратора: {selectedEvent.id}
                </h3>
              </div>
              <button
                onClick={() => setShowInspectorModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase bg-indigo-50 px-2 py-0.5 rounded">
                  {selectedEvent.sourceModule} • {selectedEvent.taskName}
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-1">
                  {selectedEvent.title}
                </h4>
                <p className="text-xs text-slate-600">
                  {selectedEvent.details}
                </p>
              </div>

              {/* Execution Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">EXECUTION TIME</span>
                  <strong className="text-slate-900">{selectedEvent.executionMs} ms</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">SEVERITY</span>
                  <strong className="text-indigo-600 uppercase">{selectedEvent.severity}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">STEP</span>
                  <strong className="text-slate-900">{selectedEvent.stepNumber} / {selectedEvent.totalSteps}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">ISO TIMESTAMP</span>
                  <strong className="text-slate-900 truncate block">{selectedEvent.timestamp}</strong>
                </div>
              </div>

              {/* Full Raw Event Payload */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Полный JSON payload & State Delta:</span>
                  <button
                    onClick={() => handleCopyPayload(selectedEvent, 'modal')}
                    className="text-indigo-600 hover:underline flex items-center gap-1 text-xs cursor-pointer font-normal"
                  >
                    <Copy className="w-3 h-3" />
                    Скопировать JSON
                  </button>
                </div>
                <pre className="bg-slate-950 text-indigo-300 p-3 rounded-xl text-xs font-mono overflow-x-auto max-h-56 leading-relaxed">
                  {JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Trace ID: trc_{selectedEvent.id.replace('evt-', '')}_9910
              </span>
              <button
                onClick={() => setShowInspectorModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Закрыть инспектор
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

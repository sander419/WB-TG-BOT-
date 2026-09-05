import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, 
  Cpu, 
  Database, 
  ShieldCheck, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  Lock, 
  Zap, 
  ArrowRight, 
  Sliders, 
  FileText, 
  RefreshCw,
  Server,
  Code2,
  Workflow,
  Activity,
  AlertTriangle,
  TrendingDown,
  Search,
  Crosshair,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Radio,
  Filter,
  Check,
  X,
  Clock,
  ShieldAlert,
  CheckCheck,
  SlidersHorizontal,
  XCircle,
  Eye,
  SlidersVertical
} from 'lucide-react';
import { BusinessRule, AuditLogItem, Store, Organization, Product } from '../types';
import { analyzeProductPositionDrop, runDiagnosticsEngine } from '../utils/diagnosticsEngine';
import { RuleBuilderModal } from './RuleBuilderModal';
import { EventStreamViewer } from './EventStreamViewer';
import { VisualWorkflowBuilder } from './VisualWorkflowBuilder';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface Props {
  organization: Organization;
  currentStore: Store;
  stores: Store[];
  rules: BusinessRule[];
  onToggleRule: (id: string) => void;
  onAddRule: (rule: Omit<BusinessRule, 'id'>) => void;
  auditLogs: AuditLogItem[];
  onApproveAuditLog?: (id: string) => void;
  onRejectAuditLog?: (id: string) => void;
  products?: Product[];
  onTriggerDiagnostics?: () => void;
  onSimulateRankDrop?: (product: Product, newRank: number) => void;
  initialSubTab?: 'diagram' | 'workflows' | 'math_engine' | 'connector' | 'rules' | 'audit' | 'diagnostics' | 'events';
  highlightRuleId?: string | null;
  highlightLogId?: string | null;
}

export const ArchitectureInspector: React.FC<Props> = ({
  organization,
  currentStore,
  stores,
  rules,
  onToggleRule,
  onAddRule,
  auditLogs,
  onApproveAuditLog,
  onRejectAuditLog,
  products = [],
  onTriggerDiagnostics,
  onSimulateRankDrop,
  initialSubTab,
  highlightRuleId,
  highlightLogId,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'diagram' | 'workflows' | 'math_engine' | 'connector' | 'rules' | 'audit' | 'diagnostics' | 'events'>(initialSubTab || 'workflows');
  const [newCondition, setNewCondition] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newCategory, setNewCategory] = useState<BusinessRule['category']>('pricing');
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [isRuleBuilderOpen, setIsRuleBuilderOpen] = useState(false);
  const [ruleCategoryFilter, setRuleCategoryFilter] = useState<'all' | BusinessRule['category']>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(highlightLogId || null);

  // Audit Log Filtering State
  const [auditRiskFilter, setAuditRiskFilter] = useState<'all' | 'READ' | 'SUGGEST' | 'WRITE' | 'HIGH_RISK'>('all');
  const [auditPendingOnly, setAuditPendingOnly] = useState<boolean>(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [auditStoreFilter, setAuditStoreFilter] = useState<string>('all');
  const [auditStatusFilter, setAuditStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');

  // Local fallback state for approved/rejected logs if no prop handler
  const [localAuditLogs, setLocalAuditLogs] = useState<AuditLogItem[]>(auditLogs);

  useEffect(() => {
    setLocalAuditLogs(auditLogs);
  }, [auditLogs]);

  const handleApprove = (id: string) => {
    if (onApproveAuditLog) {
      onApproveAuditLog(id);
    } else {
      setLocalAuditLogs(prev => prev.map(l => l.id === id ? { ...l, status: 'verified', requiresApproval: false } : l));
    }
  };

  const handleReject = (id: string) => {
    if (onRejectAuditLog) {
      onRejectAuditLog(id);
    } else {
      setLocalAuditLogs(prev => prev.map(l => l.id === id ? { ...l, status: 'rejected', requiresApproval: false } : l));
    }
  };

  // Audit Counts
  const auditCounts = useMemo(() => {
    const total = localAuditLogs.length;
    const pending = localAuditLogs.filter(l => l.status === 'pending' || l.requiresApproval).length;
    const read = localAuditLogs.filter(l => l.permissionLevel === 'READ').length;
    const suggest = localAuditLogs.filter(l => l.permissionLevel === 'SUGGEST' || l.permissionLevel === 'ANALYZE' || l.permissionLevel === 'PREPARE').length;
    const write = localAuditLogs.filter(l => l.permissionLevel === 'WRITE').length;
    const highRisk = localAuditLogs.filter(l => l.permissionLevel === 'HIGH_RISK').length;
    return { total, pending, read, suggest, write, highRisk };
  }, [localAuditLogs]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return localAuditLogs.filter(log => {
      // Risk level filter
      if (auditRiskFilter !== 'all') {
        if (auditRiskFilter === 'HIGH_RISK' && log.permissionLevel !== 'HIGH_RISK') return false;
        if (auditRiskFilter === 'WRITE' && log.permissionLevel !== 'WRITE') return false;
        if (auditRiskFilter === 'READ' && log.permissionLevel !== 'READ') return false;
        if (auditRiskFilter === 'SUGGEST') {
          const isSuggest = log.permissionLevel === 'SUGGEST' || log.permissionLevel === 'ANALYZE' || log.permissionLevel === 'PREPARE';
          if (!isSuggest) return false;
        }
      }

      // Pending confirmation quick filter
      if (auditPendingOnly) {
        if (log.status !== 'pending' && !log.requiresApproval) return false;
      }

      // Status filter
      if (auditStatusFilter !== 'all') {
        if (log.status !== auditStatusFilter) return false;
      }

      // Store filter
      if (auditStoreFilter !== 'all') {
        if (log.store !== auditStoreFilter) return false;
      }

      // Text search query
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.toLowerCase();
        const match = 
          log.action.toLowerCase().includes(q) ||
          log.actor.toLowerCase().includes(q) ||
          log.reason.toLowerCase().includes(q) ||
          log.store.toLowerCase().includes(q) ||
          log.beforeVal.toLowerCase().includes(q) ||
          log.afterVal.toLowerCase().includes(q) ||
          (log.diagnosticData && (
            log.diagnosticData.productName.toLowerCase().includes(q) ||
            log.diagnosticData.primaryRootCause.toLowerCase().includes(q)
          ));
        if (!match) return false;
      }

      return true;
    });
  }, [localAuditLogs, auditRiskFilter, auditPendingOnly, auditStatusFilter, auditStoreFilter, auditSearchQuery]);

  // Sync initial subtab changes
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Sync expanded log ID
  useEffect(() => {
    if (highlightLogId) {
      setExpandedLogId(highlightLogId);
    }
  }, [highlightLogId]);

  // Simulation test state
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || 'prod-7');
  const [simulatedRank, setSimulatedRank] = useState<number>(26);

  // Deterministic math formula preview state
  const [testRevenue, setTestRevenue] = useState(150000);
  const [testAdSpend, setTestAdSpend] = useState(12300);
  const [testStock, setTestStock] = useState(48);
  const [testVelocity, setTestVelocity] = useState(8);

  const calculatedDrr = testRevenue > 0 ? ((testAdSpend / testRevenue) * 100).toFixed(1) : '0';
  const calculatedStockDays = testVelocity > 0 ? Math.round(testStock / testVelocity) : 0;

  const currentProduct = products.find(p => p.id === selectedProductId) || products[0];
  const diagnosticReport = runDiagnosticsEngine(products, currentStore);

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCondition.trim() || !newAction.trim()) return;
    onAddRule({
      condition: newCondition.trim(),
      action: newAction.trim(),
      description: `Пользовательское бизнес-правило селлера (${newCategory})`,
      category: newCategory,
      enabled: true,
    });
    setNewCondition('');
    setNewAction('');
    setIsAddingRule(false);
  };

  const handleRunSimulation = () => {
    if (!currentProduct || !onSimulateRankDrop) return;
    onSimulateRankDrop(currentProduct, simulatedRank);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Архитектура CommerceOS & Multi-tenant Core
              </h2>
              <span className="text-[10px] uppercase font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                Production-Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Единый мозг, изолированные рабочие области магазинов, точная математика без галлюцинаций LLM и безопасный аудит действий.
            </p>
          </div>
        </div>

        {/* Tenant context pill */}
        <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-600" />
          <span>Организация: <strong className="text-slate-900">{organization.name}</strong></span>
          <span className="text-slate-300">|</span>
          <span>Магазин: <strong className="text-slate-900">{currentStore.name}</strong></span>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-200 pb-2">
        <button
          id="btn-subtab-workflows"
          onClick={() => setActiveSubTab('workflows')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'workflows'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
              : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>⚡ Визуальный редактор процессов (Zapier Logic)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('diagram')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'diagram'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Workflow className="w-4 h-4" />
          <span>1. Архитектурная диаграмма</span>
        </button>

        <button
          onClick={() => setActiveSubTab('math_engine')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'math_engine'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>2. Business Intelligence Engine</span>
        </button>

        <button
          onClick={() => setActiveSubTab('connector')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'connector'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>3. Marketplace Connectors</span>
        </button>

        <button
          onClick={() => setActiveSubTab('rules')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'rules'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>4. Business Rules ({rules.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('diagnostics')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'diagnostics'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>5. Diagnostics Engine ({diagnosticReport.anomaliesDetected})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'audit'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>6. Audit Log ({auditLogs.length})</span>
        </button>

        <button
          id="btn-subtab-event-stream"
          onClick={() => setActiveSubTab('events')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'events'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <Radio className="w-4 h-4" />
          <span>7. Live Event Stream</span>
        </button>
      </div>

      {/* Visual Workflow Builder (Zapier-like node editor) */}
      {activeSubTab === 'workflows' && (
        <VisualWorkflowBuilder
          currentStore={currentStore}
          organization={organization}
          products={products}
          onAddRule={onAddRule}
        />
      )}

      {/* 1. Architectural Diagram View */}
      {activeSubTab === 'diagram' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Принцип разделения ответственности: LLM — интерфейс, а не калькулятор
            </h3>
            <p className="text-xs text-slate-600 mb-6 max-w-3xl leading-relaxed">
              Архитектура исключает распространённую ошибку создания отдельного дорогого «персонального бота» на каждого клиента. Платформа едина, многопоточна, а изоляция обеспечивается на уровне структуры данных и контекста исполнения (<code className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded font-mono">user_id, organization_id, store_id</code>).
            </p>

            {/* Interactive pipeline flowchart */}
            <div className="space-y-4">
              {/* Layer 1: Client Interfaces */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                    UX
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Интерфейсы взаимодействия продавца (Telegram Bot / Web Studio)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Пользователь пишет на разговорном языке («Чё там у нас?», «Почему упали продажи?», «Запусти новинку»)
                    </p>
                  </div>
                </div>
                <div className="text-[11px] font-mono bg-white px-2.5 py-1 rounded-md border border-indigo-200 text-indigo-700 font-bold">
                  FastAPI Gateway + Webhooks
                </div>
              </div>

              <div className="flex justify-center">
                <div className="w-0.5 h-5 bg-slate-300"></div>
              </div>

              {/* Layer 2: Orchestrator + Specialized Agents */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    <h4 className="text-xs font-bold text-slate-900">
                      AI Orchestrator & Task Execution Context
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Intent Normalizer & Tool Dispatcher
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <span className="block text-xs font-bold text-slate-900">Analyst Agent</span>
                    <span className="text-[10px] text-slate-500">Воронка, прибыль, падения</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <span className="block text-xs font-bold text-slate-900">SEO & Rank Agent</span>
                    <span className="text-[10px] text-slate-500">Ключи, позиции, семантика</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <span className="block text-xs font-bold text-slate-900">Launch Agent</span>
                    <span className="text-[10px] text-slate-500">16 шагов вывода новинки</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <span className="block text-xs font-bold text-slate-900">Review Intelligence</span>
                    <span className="text-[10px] text-slate-500">Кластеризация брака и УТП</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="w-0.5 h-5 bg-slate-300"></div>
              </div>

              {/* Layer 3: Business Intelligence Engine */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    BI
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Business Intelligence Engine (100% Deterministic Code)
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Точные формулы в коде: DRR, маржинальность, дни до обнуления склада, дельта цен. Никаких математических галлюцинаций.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono bg-white px-2.5 py-1 rounded-md border border-emerald-200 text-emerald-700 font-bold">
                  Zero Hallucination
                </span>
              </div>

              <div className="flex justify-center">
                <div className="w-0.5 h-5 bg-slate-300"></div>
              </div>

              {/* Layer 4: Marketplace Connector Layer */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <h4 className="text-xs font-bold text-slate-900">
                      Marketplace Connector Layer (Единая абстракция)
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    MarketplaceConnector Interface
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Wildberries API</span>
                      <span className="text-[10px] text-slate-500">Content, Analytics, Prices, Ads</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Active
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Ozon API</span>
                      <span className="text-[10px] text-slate-500">Seller API & Stocks v3</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Active
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Shopify Admin GraphQL</span>
                      <span className="text-[10px] text-slate-500">International Orders & D2C</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="w-0.5 h-5 bg-slate-300"></div>
              </div>

              {/* Layer 5: Data Layer */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Data Layer (PostgreSQL Time-Series Snapshots + Redis Task Queue)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Хранятся не просто текущие цифры, а снимки за 30–90 дней для выявления трендов и аномалий
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-700">
                  Encrypted At Rest
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Business Intelligence Math Engine */}
      {activeSubTab === 'math_engine' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Интерактивный эмулятор Business Engine: Расчёт формул без участия LLM
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              LLM получает на вход не сырой запрос «посчитай мне ДРР», а уже вычисленный JSON с точными отклонениями. Проверьте, как отрабатывает математический слой прямо сейчас:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Formula input playground */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
                <h4 className="text-xs font-bold text-slate-900">
                  Параметры артикула для расчета
                </h4>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Дневная выручка (₽):
                  </label>
                  <input
                    type="number"
                    value={testRevenue}
                    onChange={(e) => setTestRevenue(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Расход на рекламу АРК (₽):
                  </label>
                  <input
                    type="number"
                    value={testAdSpend}
                    onChange={(e) => setTestAdSpend(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Остаток FBO (шт):
                    </label>
                    <input
                      type="number"
                      value={testStock}
                      onChange={(e) => setTestStock(Number(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Скорость (шт/день):
                    </label>
                    <input
                      type="number"
                      value={testVelocity}
                      onChange={(e) => setTestVelocity(Number(e.target.value) || 1)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Output Structured Payload fed to LLM */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-100 font-mono text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-slate-400 text-[11px]">
                    <span>// Structured Context Fed to Orchestrator</span>
                    <span className="text-emerald-400 font-bold">Computed in 0.4ms</span>
                  </div>
                  <pre className="text-slate-300 text-[11px] leading-relaxed">
{`{
  "calculated_metrics": {
    "drr_percent": ${calculatedDrr},
    "drr_status": "${Number(calculatedDrr) > 10 ? 'ALERT_HIGH' : 'NORMAL'}",
    "stock_days_left": ${calculatedStockDays},
    "stockout_risk": ${calculatedStockDays < 7 ? 'true' : 'false'},
    "target_restock_units": ${calculatedStockDays < 7 ? (7 - calculatedStockDays) * testVelocity + 100 : 0}
  },
  "business_rule_triggers": [
    ${calculatedStockDays < 7 ? '"RULE_1: IF stock_days < 7 TRIGGER ALERT"' : ''}
    ${Number(calculatedDrr) > 10 ? '"RULE_2: IF DRR > 10% TRIGGER OPTIMIZE_ADS"' : ''}
  ]
}`}
                  </pre>
                </div>

                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                  💡 Модель Gemini получает эти цифры готовыми и генерирует естественный текст с выводами, не пытаясь делить в уме.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Marketplace Connector Layer */}
      {activeSubTab === 'connector' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              MarketplaceConnector: Абстракция от специфики площадок
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Ядро системы не знает, чем <code className="font-mono text-indigo-700 bg-slate-100 px-1 py-0.5 rounded">nmId</code> отличается от <code className="font-mono text-indigo-700 bg-slate-100 px-1 py-0.5 rounded">offer_id</code>. Все площадки реализуют единый протокол:
            </p>

            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs mb-4">
              <span className="text-indigo-400">class</span> <span className="text-emerald-400">MarketplaceConnector</span>:
              <div className="pl-4 text-slate-300 space-y-1 mt-1 text-[11px]">
                <p><span className="text-amber-400">get_products</span>() → List[NormalizedProduct]</p>
                <p><span className="text-amber-400">get_inventory</span>() → List[StockSnapshot]</p>
                <p><span className="text-amber-400">get_search_positions</span>() → List[KeywordRank]</p>
                <p><span className="text-amber-400">get_reviews</span>() → List[ReviewItem]</p>
                <p><span className="text-amber-400">update_price</span>(product_id, price) → ExecutionResult</p>
                <p><span className="text-amber-400">answer_review</span>(review_id, text) → ExecutionResult</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900">Wildberries Adapter</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Подключены домены: Контент, Цены, Воронка продаж, Поисковые запросы, АРК.
                </p>
                <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                  Rate limits: 100 req/min
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900">Ozon Adapter</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Подключены домены: Seller API v3, FBO/FBS остатки, Трафареты, Отзывы.
                </p>
                <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                  Rate limits: 50 req/min
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900">Shopify Adapter</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Подключены домены: GraphQL Admin API, Products, InventoryLevels, Orders.
                </p>
                <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                  Cost budget: 50 pt/sec
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <span>🇨🇳</span> 1688 / Taobao / JD Adapter
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-[11px] text-slate-600 mb-2">
                  Подключены домены: 1688 Open Platform API, Taobao TOP, JD Jingdong Sourcing, DDP Landed Cost Engine.
                </p>
                <span className="text-[10px] font-mono text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 font-bold">
                  Direct Factory Cross-Border Sourcing
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Business Rules & Memory */}
      {activeSubTab === 'rules' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Business Rules Engine: Автономные правила селлера
                  </h3>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                    {rules.filter(r => r.enabled).length} активных
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Правила исполняются дешёвым cron-воркером без вызова дорогой LLM на каждый тик.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRuleBuilderOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-100 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>+ Конструктор правил (Rule Builder)</span>
                </button>

                <button
                  onClick={() => setIsAddingRule(!isAddingRule)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  title="Быстрый ручной ввод кода"
                >
                  {isAddingRule ? '✕ Отмена' : '+ Код'}
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-slate-100">
              {[
                { id: 'all', label: 'Все правила' },
                { id: 'inventory', label: '📦 Остатки' },
                { id: 'pricing', label: '💰 Цены & Маржа' },
                { id: 'advertising', label: '📢 Реклама' },
                { id: 'rank', label: '📈 Позиции & SEO' },
                { id: 'safety', label: '🛡️ Рейтинг & Отзывы' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setRuleCategoryFilter(cat.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    ruleCategoryFilter === cat.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label} ({cat.id === 'all' ? rules.length : rules.filter(r => r.category === cat.id).length})
                </button>
              ))}
            </div>

            {/* Add Rule Form (Manual fallback) */}
            {isAddingRule && (
              <form onSubmit={handleCreateRule} className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">Быстрое добавление правила (Ручной синтаксис):</h4>
                  <button 
                    type="button" 
                    onClick={() => { setIsAddingRule(false); setIsRuleBuilderOpen(true); }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Перейти в удобный Guided Builder →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Категория:</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                    >
                      <option value="pricing">Ценообразование / Защита</option>
                      <option value="inventory">Остатки / Out-of-Stock</option>
                      <option value="advertising">Реклама / ДРР</option>
                      <option value="rank">Позиции в поиске</option>
                      <option value="safety">Безопасность / Отзывы</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Условие (IF):</label>
                    <input
                      type="text"
                      placeholder="IF stock_days < 5"
                      value={newCondition}
                      onChange={(e) => setNewCondition(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Действие (THEN):</label>
                    <input
                      type="text"
                      placeholder="ALERT('Срочно пополнить')"
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Сохранить правило
                </button>
              </form>
            )}

            {/* Rules list */}
            {rules.filter(r => ruleCategoryFilter === 'all' || r.category === ruleCategoryFilter).length > 0 ? (
              <div className="space-y-3">
                {rules
                  .filter(r => ruleCategoryFilter === 'all' || r.category === ruleCategoryFilter)
                  .map((r) => {
                    const isHighlighted = highlightRuleId === r.id;
                    return (
                      <div
                        key={r.id}
                        id={`rule-card-${r.id}`}
                        className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isHighlighted 
                            ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/30 shadow-md animate-in fade-in' 
                            : 'border-slate-200 bg-slate-50/70 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                              {r.category === 'inventory' ? '📦 Склад' :
                               r.category === 'pricing' ? '💰 Цены' :
                               r.category === 'advertising' ? '📢 Реклама' :
                               r.category === 'rank' ? '📈 Позиции' : '🛡️ Отзывы'}
                            </span>
                            {isHighlighted && (
                              <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-md">
                                Выбрано из поиска
                              </span>
                            )}
                            <span className="text-xs font-mono font-bold text-slate-900 bg-indigo-50/60 px-2 py-0.5 rounded border border-indigo-100">
                              {r.condition}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-xs font-mono font-bold text-indigo-700 bg-emerald-50/60 px-2 py-0.5 rounded border border-emerald-100">
                              {r.action}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {r.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => onToggleRule(r.id)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                              r.enabled
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                            }`}
                          >
                            {r.enabled ? 'Активно' : 'Отключено'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-3">
                <Sliders className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Нет правил в выбранной категории</p>
                <button
                  onClick={() => setIsRuleBuilderOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-700 transition-colors"
                >
                  Создать правило через Rule Builder
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guided Rule Builder Modal */}
      <RuleBuilderModal
        isOpen={isRuleBuilderOpen}
        onClose={() => setIsRuleBuilderOpen(false)}
        onSaveRule={onAddRule}
        products={products}
        currentStore={currentStore}
      />

      {/* 5. Diagnostics Engine */}
      {activeSubTab === 'diagnostics' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Header */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Diagnostics Engine: Авто-выявление причин падения продаж и позиций
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  Модуль в реальном времени отслеживает колебания поисковых позиций, складских остатков и демпинг конкурентов. При обнаружении резкого падения автоматически инициируется глубокий причинно-следственный анализ и результат записывается в аудит-лог.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {onTriggerDiagnostics && (
                  <button
                    onClick={onTriggerDiagnostics}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Сканировать каталог</span>
                  </button>
                )}
                <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl">
                  {diagnosticReport.anomaliesDetected} аномалий
                </span>
              </div>
            </div>

            {/* Diagnostic Findings Cards */}
            {diagnosticReport.findings.length > 0 ? (
              <div className="space-y-4 mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Текущие аномалии падения позиций:
                </h4>
                {diagnosticReport.findings.map((finding) => (
                  <div 
                    key={finding.id}
                    className="p-5 rounded-2xl border border-rose-200 bg-rose-50/30 hover:bg-rose-50/50 transition-colors space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-rose-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                          <TrendingDown className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            {finding.productName}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            Артикул: {finding.sku} | Позиция: #{finding.previousRank} → #{finding.currentRank} ({finding.rankDelta})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-100/80 border border-rose-200 px-2 py-0.5 rounded-lg">
                          -{finding.dropPercentage}% видимости
                        </span>
                        <span className="text-xs font-bold text-slate-900 bg-white border border-rose-200 px-2.5 py-1 rounded-lg">
                          ~{finding.estimatedDailyLostRevenue.toLocaleString('ru-RU')} ₽ / день упущенной выручки
                        </span>
                      </div>
                    </div>

                    {/* Root Cause Explanation */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2 bg-white p-3 rounded-xl border border-rose-100 text-slate-800">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-rose-900 block mb-0.5">Основная первопричина (Root Cause):</strong>
                          <p className="text-slate-700 leading-relaxed">{finding.primaryRootCause}</p>
                        </div>
                      </div>

                      {finding.contributingDrivers.length > 0 && (
                        <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-800 block mb-1">Сопутствующие факторы:</span>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {finding.contributingDrivers.map((driver, idx) => (
                              <li key={idx}>{driver}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-medium">
                          <strong>Рекомендованное действие:</strong> {finding.recommendedAction}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-center text-xs text-emerald-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-bold">Все позиции каталога в норме</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Резких падений ранжирования не обнаружено.</p>
              </div>
            )}
          </div>

          {/* Interactive Simulation Trigger Panel */}
          {onSimulateRankDrop && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Crosshair className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  Интерактивный триггер: Смоделировать резкое изменение позиции
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Выберите артикул и установите новую позицию выдачи. Diagnostics Engine моментально рассчитает дельту, определит скрытую причину (демпинг, out-of-stock или ДРР) и запишет подтвержденный отчет в Safe Action Audit Log.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Товар для проверки:
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name.slice(0, 35)}... (Сейчас #{p.searchRank})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Смоделировать падение до позиции:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={simulatedRank}
                    onChange={(e) => setSimulatedRank(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleRunSimulation}
                    className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Триггер диагностики</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Safe Action Audit Log with Risk Filtering & Pending Approvals */}
      {activeSubTab === 'audit' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Quick jump to live event stream */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-slate-800 shadow-md">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                  <Radio className="w-3.5 h-3.5" />
                  ORCHESTRATOR REALTIME EVENT STREAM
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Пошаговый процесс принятия решений, калькуляция DDP и перехват критических рисков вживую.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('events')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>Открыть Live Stream</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Audit Log Control Center */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            {/* Header & Principle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-bold text-slate-900">
                    Журнал аудита действий (Audit Log) & Защитный барьер безопасности
                  </h3>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                    RBAC & Human-in-the-Loop
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Протокол: <strong>RECOMMEND → ASK CONFIRMATION → EXECUTE → VERIFY → LOG</strong>. Каждое действие классифицировано по уровню риска с фиксацией обоснования.
                </p>
              </div>

              {/* Pending count alert banner */}
              {auditCounts.pending > 0 && (
                <button
                  onClick={() => setAuditPendingOnly(prev => !prev)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    auditPendingOnly
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="w-4 h-4 animate-spin-slow text-amber-600 shrink-0" />
                  <span>
                    {auditPendingOnly ? '✓ Показываются требующие подтверждения' : `⚡ Требуют подтверждения (${auditCounts.pending})`}
                  </span>
                </button>
              )}
            </div>

            {/* Quick Metrics & Risk Level Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {/* All */}
              <button
                type="button"
                onClick={() => { setAuditRiskFilter('all'); setAuditPendingOnly(false); }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  auditRiskFilter === 'all' && !auditPendingOnly
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="text-[11px] opacity-70 font-medium">Все события</div>
                <div className="text-base font-extrabold mt-0.5">{auditCounts.total}</div>
              </button>

              {/* Pending Approvals */}
              <button
                type="button"
                onClick={() => setAuditPendingOnly(prev => !prev)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  auditPendingOnly
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                    : 'bg-amber-50/70 border-amber-200/80 hover:bg-amber-100/70 text-amber-900'
                }`}
              >
                <div className="text-[11px] font-semibold flex items-center gap-1">
                  <span>⚡ Ожидают аппрува</span>
                </div>
                <div className="text-base font-extrabold mt-0.5 flex items-center gap-1.5">
                  <span>{auditCounts.pending}</span>
                  {auditCounts.pending > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  )}
                </div>
              </button>

              {/* HIGH RISK */}
              <button
                type="button"
                onClick={() => { setAuditRiskFilter('HIGH_RISK'); setAuditPendingOnly(false); }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  auditRiskFilter === 'HIGH_RISK'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                    : 'bg-rose-50/60 border-rose-200 hover:bg-rose-100 text-rose-900'
                }`}
              >
                <div className="text-[11px] font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>HIGH RISK</span>
                </div>
                <div className="text-base font-extrabold mt-0.5">{auditCounts.highRisk}</div>
              </button>

              {/* WRITE */}
              <button
                type="button"
                onClick={() => { setAuditRiskFilter('WRITE'); setAuditPendingOnly(false); }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  auditRiskFilter === 'WRITE'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                    : 'bg-amber-50/40 border-amber-200/80 hover:bg-amber-100/60 text-amber-900'
                }`}
              >
                <div className="text-[11px] font-medium opacity-80">WRITE (Запись)</div>
                <div className="text-base font-extrabold mt-0.5">{auditCounts.write}</div>
              </button>

              {/* SUGGEST */}
              <button
                type="button"
                onClick={() => { setAuditRiskFilter('SUGGEST'); setAuditPendingOnly(false); }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  auditRiskFilter === 'SUGGEST'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-indigo-50/50 border-indigo-200/80 hover:bg-indigo-100/60 text-indigo-900'
                }`}
              >
                <div className="text-[11px] font-medium opacity-80">SUGGEST (AI)</div>
                <div className="text-base font-extrabold mt-0.5">{auditCounts.suggest}</div>
              </button>

              {/* READ */}
              <button
                type="button"
                onClick={() => { setAuditRiskFilter('READ'); setAuditPendingOnly(false); }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  auditRiskFilter === 'READ'
                    ? 'bg-slate-700 text-white border-slate-800 shadow-xs'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="text-[11px] font-medium opacity-80">READ (Чтение)</div>
                <div className="text-base font-extrabold mt-0.5">{auditCounts.read}</div>
              </button>
            </div>

            {/* Filter Toolbar & Search Controls */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2">
              {/* Search input & Selects */}
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    placeholder="Поиск по действию, артикулу, магазину или причине..."
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                  {auditSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setAuditSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Store Filter */}
                <select
                  value={auditStoreFilter}
                  onChange={(e) => setAuditStoreFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Все магазины ({localAuditLogs.length})</option>
                  {Array.from(new Set(localAuditLogs.map(l => l.store))).map(storeName => (
                    <option key={storeName} value={storeName}>{storeName}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={auditStatusFilter}
                  onChange={(e) => setAuditStatusFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Все статусы</option>
                  <option value="pending">⏳ Требуют аппрува ({auditCounts.pending})</option>
                  <option value="verified">✓ Выполнено & Проверено</option>
                  <option value="rejected">✕ Отклонено</option>
                </select>
              </div>

              {/* Risk Level Filter Chips */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setAuditRiskFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    auditRiskFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Все ({auditCounts.total})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditRiskFilter('READ')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    auditRiskFilter === 'READ'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  READ ({auditCounts.read})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditRiskFilter('SUGGEST')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    auditRiskFilter === 'SUGGEST'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  SUGGEST ({auditCounts.suggest})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditRiskFilter('WRITE')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    auditRiskFilter === 'WRITE'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-amber-800 hover:bg-amber-50'
                  }`}
                >
                  WRITE ({auditCounts.write})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditRiskFilter('HIGH_RISK')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    auditRiskFilter === 'HIGH_RISK'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span>HIGH RISK ({auditCounts.highRisk})</span>
                </button>
              </div>
            </div>

            {/* Active Filters Summary & Reset */}
            {(auditRiskFilter !== 'all' || auditPendingOnly || auditStatusFilter !== 'all' || auditStoreFilter !== 'all' || auditSearchQuery) && (
              <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2 flex-wrap text-slate-600">
                  <span className="font-semibold text-slate-800">Активные фильтры:</span>
                  {auditRiskFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-800">
                      Уровень: {auditRiskFilter}
                    </span>
                  )}
                  {auditPendingOnly && (
                    <span className="inline-flex items-center gap-1 bg-amber-100 border border-amber-200 text-amber-900 px-2 py-0.5 rounded-md font-bold">
                      ⚡ Только требующие подтверждения
                    </span>
                  )}
                  {auditStatusFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-800">
                      Статус: {auditStatusFilter}
                    </span>
                  )}
                  {auditStoreFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-800">
                      Магазин: {auditStoreFilter}
                    </span>
                  )}
                  {auditSearchQuery && (
                    <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-800">
                      Поиск: «{auditSearchQuery}»
                    </span>
                  )}
                  <span className="text-slate-400">| Найдено записей: {filteredAuditLogs.length}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAuditRiskFilter('all');
                    setAuditPendingOnly(false);
                    setAuditStatusFilter('all');
                    setAuditStoreFilter('all');
                    setAuditSearchQuery('');
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer shrink-0 ml-2"
                >
                  Сбросить фильтры
                </button>
              </div>
            )}

            {/* Audit Log Table */}
            {filteredAuditLogs.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/80">
                      <th className="py-3 px-3.5">Время & Магазин</th>
                      <th className="py-3 px-3">Инициатор</th>
                      <th className="py-3 px-3">Действие & Обоснование</th>
                      <th className="py-3 px-3">Уровень риска</th>
                      <th className="py-3 px-3">Было → Стало</th>
                      <th className="py-3 px-3.5 text-right">Статус & Подтверждение</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredAuditLogs.map((log) => {
                      const isExpanded = expandedLogId === log.id;
                      const isDiagnostics = log.actor === 'Diagnostics Engine';
                      const isHighlighted = highlightLogId === log.id;
                      const isPending = log.status === 'pending' || log.requiresApproval;

                      // Determine risk presentation
                      const isHighRisk = log.permissionLevel === 'HIGH_RISK';
                      const isWrite = log.permissionLevel === 'WRITE';
                      const isSuggest = log.permissionLevel === 'SUGGEST' || log.permissionLevel === 'ANALYZE' || log.permissionLevel === 'PREPARE';
                      const isRead = log.permissionLevel === 'READ';

                      return (
                        <React.Fragment key={log.id}>
                          <tr 
                            id={`audit-log-row-${log.id}`}
                            className={`transition-colors ${
                              isPending
                                ? 'bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-amber-500'
                                : isHighlighted 
                                ? 'bg-indigo-50/90 font-medium text-slate-900 border-l-4 border-indigo-600' 
                                : 'hover:bg-slate-50/80'
                            }`}
                          >
                            {/* Timestamp & Store */}
                            <td className="py-3.5 px-3.5 whitespace-nowrap">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 font-mono text-slate-600 font-medium">
                                  {isHighlighted && (
                                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                                  )}
                                  {isPending && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                                  )}
                                  <span>{log.timestamp}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate max-w-[140px]" title={log.store}>
                                  {log.store}
                                </div>
                              </div>
                            </td>

                            {/* Actor */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              {isDiagnostics ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[11px]">
                                  <Activity className="w-3 h-3 text-purple-600" />
                                  Diagnostics Engine
                                </span>
                              ) : log.actor === 'AI Orchestrator' ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[11px]">
                                  <Cpu className="w-3 h-3 text-indigo-600" />
                                  AI Orchestrator
                                </span>
                              ) : log.actor === 'Auto-Workflow' ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 font-bold text-[11px]">
                                  <Workflow className="w-3 h-3 text-sky-600" />
                                  Auto-Workflow
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px]">
                                  {log.actor}
                                </span>
                              )}
                            </td>

                            {/* Action & Reason */}
                            <td className="py-3.5 px-3">
                              <div className="space-y-1 max-w-md">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900">{log.action}</span>
                                  {log.diagnosticData && (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                      className="text-[10px] text-purple-600 font-bold bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200 cursor-pointer"
                                    >
                                      {isExpanded ? 'Свернуть ▲' : 'Детали 🔬'}
                                    </button>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed" title={log.reason}>
                                  {log.reason}
                                </p>
                              </div>
                            </td>

                            {/* Risk Level Badge */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <div className="space-y-1">
                                {isHighRisk && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                    <ShieldAlert className="w-3 h-3 text-rose-600" />
                                    HIGH RISK
                                  </span>
                                )}
                                {isWrite && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                                    <Zap className="w-3 h-3 text-amber-600" />
                                    WRITE
                                  </span>
                                )}
                                {isSuggest && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    <Sparkles className="w-3 h-3 text-indigo-600" />
                                    SUGGEST
                                  </span>
                                )}
                                {isRead && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                                    <Eye className="w-3 h-3 text-slate-500" />
                                    READ
                                  </span>
                                )}

                                {log.impactScore && (
                                  <div className="text-[10px] font-mono text-slate-400">
                                    Impact: <strong className={
                                      log.impactScore === 'CRITICAL' ? 'text-rose-600' :
                                      log.impactScore === 'HIGH' ? 'text-amber-600' : 'text-slate-600'
                                    }>{log.impactScore}</strong>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Before -> After */}
                            <td className="py-3.5 px-3 font-mono text-[11px] whitespace-nowrap">
                              <div className="space-y-0.5">
                                <span className="line-through text-slate-400 block truncate max-w-[150px]">{log.beforeVal}</span>
                                <span className="font-bold text-emerald-700 block truncate max-w-[150px]">→ {log.afterVal}</span>
                              </div>
                            </td>

                            {/* Status & Approval Handlers */}
                            <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                              {isPending ? (
                                <div className="flex flex-col items-end gap-1.5">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-md">
                                    <Clock className="w-3 h-3 text-amber-700" />
                                    Ожидает аппрува
                                  </span>

                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleApprove(log.id)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                                      title="Подтвердить и отправить команду в API"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Подтвердить</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleReject(log.id)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                                      title="Отклонить операцию"
                                    >
                                      <X className="w-3 h-3" />
                                      <span>Отклонить</span>
                                    </button>
                                  </div>
                                </div>
                              ) : log.status === 'verified' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  Отклонено
                                </span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Diagnostic Details */}
                          {isExpanded && log.diagnosticData && (
                            <tr className="bg-purple-50/40">
                              <td colSpan={6} className="px-4 py-3 border-b border-purple-100">
                                <div className="p-4 bg-white rounded-xl border border-purple-200 space-y-2.5 text-xs shadow-xs">
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                    <strong className="text-purple-900 flex items-center gap-1.5">
                                      <Activity className="w-4 h-4 text-purple-600" />
                                      Детализированный отчет Diagnostics Engine ({log.diagnosticData.productName})
                                    </strong>
                                    <span className="text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                                      Упущенная выручка: ~{log.diagnosticData.lossEstimateDaily.toLocaleString('ru-RU')} ₽ / день
                                    </span>
                                  </div>
                                  <p className="text-slate-700">
                                    <strong className="text-slate-900">Первопричина:</strong> {log.diagnosticData.primaryRootCause}
                                  </p>
                                  {log.diagnosticData.contributingDrivers.length > 0 && (
                                    <div>
                                      <strong className="text-slate-800 block mb-1">Драйверы отклонения:</strong>
                                      <ul className="list-disc pl-4 text-slate-600 space-y-0.5">
                                        {log.diagnosticData.contributingDrivers.map((d, i) => (
                                          <li key={i}>{d}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  <div className="pt-1 text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg font-medium">
                                    <strong>Рекомендованный регламент восстановления:</strong> {log.diagnosticData.recommendedRemedy}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-3">
                <ShieldAlert className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-800">
                  Записей по заданным фильтрам не найдено
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Попробуйте изменить выбранный уровень риска ({auditRiskFilter}) или сбросить поисковый запрос.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAuditRiskFilter('all');
                    setAuditPendingOnly(false);
                    setAuditStatusFilter('all');
                    setAuditStoreFilter('all');
                    setAuditSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Показать все записи аудита
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Live Event Stream Viewer (Orchestrator Realtime) */}
      {activeSubTab === 'events' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <EventStreamViewer
            currentStore={currentStore}
            organization={organization}
          />
        </div>
      )}

      {/* Guided Rule Builder Modal */}
      <RuleBuilderModal
        isOpen={isRuleBuilderOpen}
        onClose={() => setIsRuleBuilderOpen(false)}
        onSaveRule={onAddRule}
        products={products}
        currentStore={currentStore}
      />
    </div>
  );
};

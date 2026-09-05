import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Workflow,
  Zap,
  Filter,
  BrainCircuit,
  Play,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Send,
  MessageSquare,
  Sparkles,
  DollarSign,
  TrendingDown,
  ShoppingBag,
  Sliders,
  Layers,
  Settings2,
  Copy,
  Download,
  Upload,
  Check,
  Info,
  Clock,
  ExternalLink,
  ChevronRight,
  Activity,
  Cpu,
  RefreshCw,
  Eye,
  Radio,
  Compass
} from 'lucide-react';
import { BusinessRule, Store, Organization, Product } from '../types';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'ai_logic' | 'action';
  title: string;
  subtitle: string;
  category: 'pricing' | 'inventory' | 'seo' | 'advertising' | 'sourcing' | 'safety';
  x: number;
  y: number;
  config: Record<string, any>;
  icon: string;
}

export interface WorkflowConnection {
  id: string;
  fromNodeId: string;
  fromPort: 'out' | 'out_true' | 'out_false';
  toNodeId: string;
  toPort: 'in';
  label?: string;
}

export interface WorkflowPreset {
  id: string;
  name: string;
  description: string;
  category: 'pricing' | 'sourcing' | 'seo' | 'safety' | 'advertising';
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

const PRESET_WORKFLOWS: WorkflowPreset[] = [
  {
    id: 'wf-antidumping-repricer',
    name: 'Анти-Демпинг с защитой маржи (Stop-Loss)',
    description: 'Детекция снижения цен конкурентом → Проверка жесткого пола маржи (≥20%) → Расчет оптимальной цены → Авто-репрайсинг WB v3 → Уведомление в Telegram',
    category: 'pricing',
    nodes: [
      {
        id: 'node-1',
        type: 'trigger',
        title: 'Конкурент снизил цену',
        subtitle: 'Демпинг: цена конкурента < нашей цены на > 3%',
        category: 'pricing',
        x: 60,
        y: 120,
        config: { thresholdPct: 3, checkIntervalMin: 15 },
        icon: 'Zap',
      },
      {
        id: 'node-2',
        type: 'condition',
        title: 'Safety Guardrail: Маржа ≥ 20%',
        subtitle: 'Проверка P_min = CostPrice / (1 - MP_Fee - 20%)',
        category: 'safety',
        x: 360,
        y: 120,
        config: { minMarginPct: 20, maxPriceStepPct: 10 },
        icon: 'ShieldCheck',
      },
      {
        id: 'node-3',
        type: 'ai_logic',
        title: 'Smart Repricer Matrix',
        subtitle: 'Вычисление новой цены с удержанием 1-го места в блоке',
        category: 'pricing',
        x: 680,
        y: 120,
        config: { targetPosition: 1, stepRub: 20 },
        icon: 'BrainCircuit',
      },
      {
        id: 'node-4',
        type: 'action',
        title: 'WB API v3: Обновить цену',
        subtitle: 'PATCH /api/v3/prices с верификацией лимитов',
        category: 'pricing',
        x: 1000,
        y: 60,
        config: { autoApply: true, delaySec: 5 },
        icon: 'DollarSign',
      },
      {
        id: 'node-5',
        type: 'action',
        title: 'Telegram Alert & Audit',
        subtitle: 'Отправка отчета в канал селлера и запись в лог',
        category: 'safety',
        x: 1000,
        y: 220,
        config: { notifyChannel: 'main_seller_bot', requireConfirm: false },
        icon: 'Send',
      },
    ],
    connections: [
      { id: 'c-1-2', fromNodeId: 'node-1', fromPort: 'out', toNodeId: 'node-2', toPort: 'in' },
      { id: 'c-2-3', fromNodeId: 'node-2', fromPort: 'out', toNodeId: 'node-3', toPort: 'in', label: 'Маржа OK' },
      { id: 'c-3-4', fromNodeId: 'node-3', fromPort: 'out', toNodeId: 'node-4', toPort: 'in' },
      { id: 'c-3-5', fromNodeId: 'node-3', fromPort: 'out', toNodeId: 'node-5', toPort: 'in' },
    ],
  },
  {
    id: 'wf-china-stockout-reorder',
    name: 'Авто-Заказ 1688 при риске Out-of-Stock',
    description: 'Остаток FBO < 10 дней → Калькуляция DDP логистики (¥ → ₽) → Формирование PO в 1688 Hub → Запрос подтверждения селлера в Telegram',
    category: 'sourcing',
    nodes: [
      {
        id: 'node-10',
        type: 'trigger',
        title: 'Запас FBO < 10 дней продаж',
        subtitle: 'Скорость продаж > 15 шт/день при текущем стоке',
        category: 'inventory',
        x: 60,
        y: 130,
        config: { daysLeftThreshold: 10, minDailyVelocity: 5 },
        icon: 'TrendingDown',
      },
      {
        id: 'node-11',
        type: 'ai_logic',
        title: 'DDP Unit-Economics Engine',
        subtitle: 'Калькуляция партии 500 шт (¥82/ед + Карго $3.8/кг + ВЭД)',
        category: 'sourcing',
        x: 360,
        y: 130,
        config: { batchQty: 500, cargoType: 'fast_auto', exchangeRate: 12.8 },
        icon: 'Cpu',
      },
      {
        id: 'node-12',
        type: 'condition',
        title: 'Порог рентабельности DDP ROI > 85%',
        subtitle: 'Себестоимость DDP в Москве ≤ 980 ₽/шт',
        category: 'safety',
        x: 680,
        y: 130,
        config: { minRoi: 85, maxUnitCostRub: 980 },
        icon: 'ShieldCheck',
      },
      {
        id: 'node-13',
        type: 'action',
        title: '1688 Hub: Draft Purchase Order',
        subtitle: 'Создать черновик инвойса на фабрике Guangzhou',
        category: 'sourcing',
        x: 1000,
        y: 60,
        config: { factoryId: 'gz-audio-992', autoLockPrice: true },
        icon: 'ShoppingBag',
      },
      {
        id: 'node-14',
        type: 'action',
        title: 'Telegram Interactive Approval',
        subtitle: 'Кнопки: [Оплатить инвойс ¥41,000] / [Изменить объем]',
        category: 'safety',
        x: 1000,
        y: 220,
        config: { withInlineKeyboard: true, timeoutHours: 24 },
        icon: 'MessageSquare',
      },
    ],
    connections: [
      { id: 'c-10-11', fromNodeId: 'node-10', fromPort: 'out', toNodeId: 'node-11', toPort: 'in' },
      { id: 'c-11-12', fromNodeId: 'node-11', fromPort: 'out', toNodeId: 'node-12', toPort: 'in' },
      { id: 'c-12-13', fromNodeId: 'node-12', fromPort: 'out', toNodeId: 'node-13', toPort: 'in', label: 'ROI Подтвержден' },
      { id: 'c-13-14', fromNodeId: 'node-13', fromPort: 'out', toNodeId: 'node-14', toPort: 'in' },
    ],
  },
  {
    id: 'wf-seo-rank-recovery',
    name: 'AI SEO-Реанимация при просадке позиций',
    description: 'Просадка в органической выдаче > 5 мест → Gemini 2.5 Pro семантический анализ → Авто-обогащение ключевыми фразами LSI → Обновление карточки',
    category: 'seo',
    nodes: [
      {
        id: 'node-20',
        type: 'trigger',
        title: 'Просадка Rank > 5 позиций',
        subtitle: 'Снижение органической позиции карточки за 48 часов',
        category: 'seo',
        x: 60,
        y: 120,
        config: { rankDropThreshold: 5, timeWindowHours: 48 },
        icon: 'TrendingDown',
      },
      {
        id: 'node-21',
        type: 'ai_logic',
        title: 'Gemini 2.5 Pro Semantic SEO',
        subtitle: 'Кластеризация высокочастотных ключей и плотности LSI',
        category: 'seo',
        x: 360,
        y: 120,
        config: { model: 'gemini-2.5-pro', maxKeywords: 12, includeCompetitorGaps: true },
        icon: 'Sparkles',
      },
      {
        id: 'node-22',
        type: 'condition',
        title: 'Content Health Score < 80%',
        subtitle: 'Проверка заполненности параметров и длины описания',
        category: 'safety',
        x: 680,
        y: 120,
        config: { minHealthScore: 80, maxTitleLength: 100 },
        icon: 'Filter',
      },
      {
        id: 'node-23',
        type: 'action',
        title: 'WB Content API: Обновить SEO',
        subtitle: 'PATCH /content/v2/cards/update (Заголовок & Описание)',
        category: 'seo',
        x: 1000,
        y: 120,
        config: { backupPrevious: true, autoPublish: true },
        icon: 'Zap',
      },
    ],
    connections: [
      { id: 'c-20-21', fromNodeId: 'node-20', fromPort: 'out', toNodeId: 'node-21', toPort: 'in' },
      { id: 'c-21-22', fromNodeId: 'node-21', fromPort: 'out', toNodeId: 'node-22', toPort: 'in' },
      { id: 'c-22-23', fromNodeId: 'node-22', fromPort: 'out', toNodeId: 'node-23', toPort: 'in', label: 'Health Score OK' },
    ],
  },
  {
    id: 'wf-ad-drr-optimizer',
    name: 'Экстренный стоп рекламы при плохом ДРР',
    description: 'ДРР кампании > 25% при низких продажах → Проверка порогов окупаемости → Снижение ставки в WB Ads на 30% или пауза',
    category: 'advertising',
    nodes: [
      {
        id: 'node-30',
        type: 'trigger',
        title: 'ДРР рекламы > 25%',
        subtitle: 'Доля рекламных расходов превысила целевой таргет',
        category: 'advertising',
        x: 60,
        y: 120,
        config: { maxDrrPct: 25, minSpendRub: 2000 },
        icon: 'AlertTriangle',
      },
      {
        id: 'node-31',
        type: 'condition',
        title: 'CR в заказ < 2.5%',
        subtitle: 'Конверсия кликов в корзину/заказ ниже порога',
        category: 'advertising',
        x: 360,
        y: 120,
        config: { minCrPct: 2.5 },
        icon: 'Filter',
      },
      {
        id: 'node-32',
        type: 'ai_logic',
        title: 'Bidding Optimizer AI',
        subtitle: 'Расчет предельно допустимой ставки CPM для удержания ДРР ≤ 18%',
        category: 'advertising',
        x: 680,
        y: 120,
        config: { targetDrrPct: 18, cpmStepRub: 50 },
        icon: 'BrainCircuit',
      },
      {
        id: 'node-33',
        type: 'action',
        title: 'WB Promotion API: Снизить CPM',
        subtitle: 'POST /adv/v1/auto/set-cpm (Снижение ставки)',
        category: 'advertising',
        x: 1000,
        y: 120,
        config: { fallbackAction: 'pause_campaign' },
        icon: 'Sliders',
      },
    ],
    connections: [
      { id: 'c-30-31', fromNodeId: 'node-30', fromPort: 'out', toNodeId: 'node-31', toPort: 'in' },
      { id: 'c-31-32', fromNodeId: 'node-31', fromPort: 'out', toNodeId: 'node-32', toPort: 'in' },
      { id: 'c-32-33', fromNodeId: 'node-32', fromPort: 'out', toNodeId: 'node-33', toPort: 'in', label: 'Ставка оптимизирована' },
    ],
  },
];

const NODE_CATALOG = [
  // Triggers
  {
    type: 'trigger',
    title: 'Конкурент снизил цену',
    subtitle: 'Демпинг цен в категории (> 3%)',
    category: 'pricing',
    icon: 'Zap',
    defaultConfig: { thresholdPct: 3, checkIntervalMin: 15 },
  },
  {
    type: 'trigger',
    title: 'Запас FBO < N дней',
    subtitle: 'Критический остаток на складе',
    category: 'inventory',
    icon: 'TrendingDown',
    defaultConfig: { daysLeftThreshold: 7 },
  },
  {
    type: 'trigger',
    title: 'Просадка позиции Rank',
    subtitle: 'Органическая выдача упала > 3 поз.',
    category: 'seo',
    icon: 'Activity',
    defaultConfig: { rankDropThreshold: 3 },
  },
  {
    type: 'trigger',
    title: 'ДРР рекламы > N%',
    subtitle: 'Неэффективные расходы на авто-кампании',
    category: 'advertising',
    icon: 'AlertTriangle',
    defaultConfig: { maxDrrPct: 25 },
  },
  {
    type: 'trigger',
    title: 'Новый отзыв (1-3 звезды)',
    subtitle: 'Негативный рейтинг или брак в партии',
    category: 'safety',
    icon: 'MessageSquare',
    defaultConfig: { minRating: 1, maxRating: 3 },
  },

  // Conditions
  {
    type: 'condition',
    title: 'Safety: Маржа ≥ X%',
    subtitle: 'Жесткий защитный барьер P_min',
    category: 'safety',
    icon: 'ShieldCheck',
    defaultConfig: { minMarginPct: 20 },
  },
  {
    type: 'condition',
    title: 'Фильтр категории SKU',
    subtitle: 'Применять только к указанной категории',
    category: 'pricing',
    icon: 'Filter',
    defaultConfig: { category: 'Все категории' },
  },
  {
    type: 'condition',
    title: 'Статус наличия стока',
    subtitle: 'Только если товар в наличии на складе',
    category: 'inventory',
    icon: 'Layers',
    defaultConfig: { minStockUnits: 1 },
  },

  // AI Logic
  {
    type: 'ai_logic',
    title: 'Smart Repricer Matrix',
    subtitle: 'Математический расчет шага цены',
    category: 'pricing',
    icon: 'BrainCircuit',
    defaultConfig: { stepRub: 20, maxDiscountPct: 15 },
  },
  {
    type: 'ai_logic',
    title: 'DDP Unit-Economics',
    subtitle: 'Калькуляция партии 1688 + Карго + ВЭД',
    category: 'sourcing',
    icon: 'Cpu',
    defaultConfig: { cargoType: 'fast_auto', targetRoiPct: 80 },
  },
  {
    type: 'ai_logic',
    title: 'Gemini 2.5 Semantic SEO',
    subtitle: 'Генерация LSI-ключей и описания',
    category: 'seo',
    icon: 'Sparkles',
    defaultConfig: { model: 'gemini-2.5-pro' },
  },

  // Actions
  {
    type: 'action',
    title: 'WB API v3: Обновить цену',
    subtitle: 'Синхронизация цены с маркетплейсом',
    category: 'pricing',
    icon: 'DollarSign',
    defaultConfig: { autoApply: true },
  },
  {
    type: 'action',
    title: '1688: Создать PO Draft',
    subtitle: 'Сформировать драфт инвойса на фабрике',
    category: 'sourcing',
    icon: 'ShoppingBag',
    defaultConfig: { factoryApproval: true },
  },
  {
    type: 'action',
    title: 'Telegram Alert & Approve',
    subtitle: 'Отправка кнопок согласования селлеру',
    category: 'safety',
    icon: 'Send',
    defaultConfig: { requireConfirm: true },
  },
  {
    type: 'action',
    title: 'WB Content API: Обновить SEO',
    subtitle: 'Применить оптимизированный текст',
    category: 'seo',
    icon: 'Zap',
    defaultConfig: { backupPrevious: true },
  },
];

interface Props {
  currentStore: Store;
  organization: Organization;
  products?: Product[];
  onAddRule?: (rule: Omit<BusinessRule, 'id'>) => void;
}

export const VisualWorkflowBuilder: React.FC<Props> = ({
  currentStore,
  organization,
  products = [],
  onAddRule,
}) => {
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowPreset>(PRESET_WORKFLOWS[0]);
  const [nodes, setNodes] = useState<WorkflowNode[]>(PRESET_WORKFLOWS[0].nodes);
  const [connections, setConnections] = useState<WorkflowConnection[]>(PRESET_WORKFLOWS[0].connections);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  // Connecting line state
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; port: 'out' | 'out_true' | 'out_false' } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Canvas pan & zoom
  const [canvasScale, setCanvasScale] = useState<number>(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Simulation execution state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simActiveStep, setSimActiveStep] = useState<number>(-1);
  const [simLogs, setSimLogs] = useState<Array<{ timestamp: string; nodeTitle: string; message: string; status: 'info' | 'success' | 'warning' }>>([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isCatalogDrawerOpen, setIsCatalogDrawerOpen] = useState<boolean>(false);

  // Switch preset
  const handleSelectPreset = (preset: WorkflowPreset) => {
    setActiveWorkflow(preset);
    setNodes(preset.nodes);
    setConnections(preset.connections);
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
    setConnectingFrom(null);
    setIsSimulating(false);
    setSimActiveStep(-1);
    setSimLogs([]);
  };

  // Node Icon Renderer
  const renderNodeIcon = (iconName: string, className = 'w-4 h-4') => {
    switch (iconName) {
      case 'Zap': return <Zap className={className} />;
      case 'ShieldCheck': return <ShieldCheck className={className} />;
      case 'BrainCircuit': return <BrainCircuit className={className} />;
      case 'DollarSign': return <DollarSign className={className} />;
      case 'Send': return <Send className={className} />;
      case 'TrendingDown': return <TrendingDown className={className} />;
      case 'Cpu': return <Cpu className={className} />;
      case 'ShoppingBag': return <ShoppingBag className={className} />;
      case 'MessageSquare': return <MessageSquare className={className} />;
      case 'Sparkles': return <Sparkles className={className} />;
      case 'Filter': return <Filter className={className} />;
      case 'AlertTriangle': return <AlertTriangle className={className} />;
      case 'Sliders': return <Sliders className={className} />;
      case 'Activity': return <Activity className={className} />;
      case 'Layers': return <Layers className={className} />;
      default: return <Workflow className={className} />;
    }
  };

  // Dragging logic
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setSelectedNodeId(nodeId);
    setSelectedConnectionId(null);
    setDraggingNodeId(nodeId);

    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    if (canvasBounds) {
      const clickCanvasX = (e.clientX - canvasBounds.left) / canvasScale;
      const clickCanvasY = (e.clientY - canvasBounds.top) / canvasScale;
      setDragOffset({
        x: clickCanvasX - node.x,
        y: clickCanvasY - node.y,
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    if (!canvasBounds) return;

    const canvasX = (e.clientX - canvasBounds.left) / canvasScale;
    const canvasY = (e.clientY - canvasBounds.top) / canvasScale;

    setMousePos({ x: canvasX, y: canvasY });

    if (draggingNodeId) {
      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          if (n.id === draggingNodeId) {
            return {
              ...n,
              x: Math.max(20, Math.min(1400, Math.round(canvasX - dragOffset.x))),
              y: Math.max(20, Math.min(800, Math.round(canvasY - dragOffset.y))),
            };
          }
          return n;
        })
      );
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingNodeId(null);
  };

  // Connecting ports logic
  const handlePortClick = (e: React.MouseEvent, nodeId: string, portType: 'out' | 'in', portName: 'out' | 'out_true' | 'out_false' | 'in') => {
    e.stopPropagation();

    if (portType === 'out') {
      // Start connection
      setConnectingFrom({ nodeId, port: portName as any });
      setSelectedNodeId(nodeId);
    } else if (portType === 'in' && connectingFrom) {
      // Complete connection
      if (connectingFrom.nodeId === nodeId) {
        setConnectingFrom(null);
        return;
      }

      // Check if connection already exists
      const alreadyExists = connections.some(
        (c) => c.fromNodeId === connectingFrom.nodeId && c.toNodeId === nodeId
      );

      if (!alreadyExists) {
        const newConn: WorkflowConnection = {
          id: `c-${Date.now()}`,
          fromNodeId: connectingFrom.nodeId,
          fromPort: connectingFrom.port,
          toNodeId: nodeId,
          toPort: 'in',
          label: connectingFrom.port === 'out_true' ? 'Passed' : connectingFrom.port === 'out_false' ? 'Failed' : undefined,
        };
        setConnections((prev) => [...prev, newConn]);
      }
      setConnectingFrom(null);
    }
  };

  // Delete selected node
  const handleDeleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setConnections((prev) => prev.filter((c) => c.fromNodeId !== selectedNodeId && c.toNodeId !== selectedNodeId));
    setSelectedNodeId(null);
  };

  // Delete selected connection
  const handleDeleteSelectedConnection = () => {
    if (!selectedConnectionId) return;
    setConnections((prev) => prev.filter((c) => c.id !== selectedConnectionId));
    setSelectedConnectionId(null);
  };

  // Add node from catalog
  const handleAddCatalogNode = (item: typeof NODE_CATALOG[0]) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: item.type as any,
      title: item.title,
      subtitle: item.subtitle,
      category: item.category as any,
      x: 350 + Math.floor(Math.random() * 200),
      y: 120 + Math.floor(Math.random() * 180),
      config: { ...item.defaultConfig },
      icon: item.icon,
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setIsCatalogDrawerOpen(false);
  };

  // Calculate Bezier curve between two nodes
  const calculateCurve = (fromNode: WorkflowNode, toNode: WorkflowNode) => {
    const fromX = fromNode.x + 240; // width of node
    const fromY = fromNode.y + 45;  // middle height
    const toX = toNode.x;
    const toY = toNode.y + 45;

    const deltaX = Math.max(40, (toX - fromX) / 2);
    const cp1X = fromX + deltaX;
    const cp1Y = fromY;
    const cp2X = toX - deltaX;
    const cp2Y = toY;

    return {
      path: `M ${fromX} ${fromY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${toX} ${toY}`,
      midX: (fromX + toX) / 2,
      midY: (fromY + toY) / 2,
    };
  };

  // Live Simulation / Dry Run Engine
  const runWorkflowSimulation = () => {
    if (nodes.length === 0 || isSimulating) return;

    setIsSimulating(true);
    setSimActiveStep(0);
    setSimLogs([
      {
        timestamp: new Date().toLocaleTimeString('ru-RU'),
        nodeTitle: 'Инициализация Orchestrator Pipeline',
        message: `Запуск тестовой симуляции цепочки "${activeWorkflow.name}" в изолированной среде...`,
        status: 'info',
      },
    ]);

    // Topological order or sequential simulation
    const steps = [...nodes];

    steps.forEach((node, idx) => {
      setTimeout(() => {
        setSimActiveStep(idx);
        let logMsg = '';
        let logStatus: 'info' | 'success' | 'warning' = 'info';

        if (node.type === 'trigger') {
          logMsg = `⚡ Триггер сработал: Зафиксировано событие "${node.title}". Передача контекста в пайплайн.`;
          logStatus = 'warning';
        } else if (node.type === 'condition') {
          logMsg = `🛡️ Guardrail Проверка: Условие "${node.title}" успешно пройдено (Result: TRUE, Маржа в безопасности).`;
          logStatus = 'success';
        } else if (node.type === 'ai_logic') {
          logMsg = `🧠 AI Вычисления: Модуль "${node.title}" сформировал решение (Exec Time: 42ms, Deterministic Output OK).`;
          logStatus = 'info';
        } else {
          logMsg = `🚀 Действие выполнено: "${node.title}" безопасно зафиксировано (Status: 200 OK, Audit Log ID: log-${Date.now()}).`;
          logStatus = 'success';
        }

        setSimLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toLocaleTimeString('ru-RU'),
            nodeTitle: node.title,
            message: logMsg,
            status: logStatus,
          },
        ]);

        if (idx === steps.length - 1) {
          setTimeout(() => {
            setIsSimulating(false);
            setSimLogs((prev) => [
              ...prev,
              {
                timestamp: new Date().toLocaleTimeString('ru-RU'),
                nodeTitle: 'Pipeline Completed',
                message: '✅ Цепочка задач выполнена на 100% без нарушений бизнес-правил.',
                status: 'success',
              },
            ]);
          }, 800);
        }
      }, (idx + 1) * 1100);
    });
  };

  // Convert workflow to active Business Rule
  const handleSaveAsBusinessRule = () => {
    if (!onAddRule) return;

    const triggerNode = nodes.find((n) => n.type === 'trigger') || nodes[0];
    const actionNodes = nodes.filter((n) => n.type === 'action');
    const conditionNodes = nodes.filter((n) => n.type === 'condition');

    const actionSummary = actionNodes.map((a) => a.title).join(' + ') || 'Автоматическая оптимизация';
    const conditionSummary = conditionNodes.map((c) => c.title).join(' И ') || triggerNode?.title || 'Trigger event';

    const newRule: Omit<BusinessRule, 'id'> = {
      condition: `${triggerNode?.title || 'Триггер'}: ${conditionSummary}`,
      action: `${actionSummary}`,
      description: `Визуальный воркфлоу "${activeWorkflow.name}". Содержит ${nodes.length} связанных нод и ${connections.length} связей. Настроен в визуальном редакторе.`,
      enabled: true,
      category: activeWorkflow.category === 'sourcing' ? 'inventory' : activeWorkflow.category,
    };

    onAddRule(newRule);
    setSaveSuccessMsg(`Воркфлоу "${activeWorkflow.name}" успешно сохранен и активирован в модуле Business Rules!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Banner & Strategy Presets Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Background gradient decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 font-mono">
                <Workflow className="w-3.5 h-3.5" />
                VISUAL WORKFLOW STUDIO (ZAPIER LOGIC)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Node-Based Orchestrator Engine
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Визуальный конструктор цепочек задач AI-оркестратора
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Соединяйте события-триггеры, жесткие бизнес-ограничения (Guardrails), расчетные модели и действия коннекторов линиями. Настраивайте многоэтапную логику без единой строчки кода.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              id="btn-run-workflow-sim"
              onClick={runWorkflowSimulation}
              disabled={isSimulating}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                isSimulating
                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 hover:scale-102'
              }`}
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Симуляция выполняется...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Запустить Dry Run (Симуляция)</span>
                </>
              )}
            </button>

            <button
              id="btn-save-workflow-rule"
              onClick={handleSaveAsBusinessRule}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer hover:scale-102"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Активировать в оркестраторе</span>
            </button>
          </div>
        </div>

        {/* Success message banner */}
        {saveSuccessMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Preset Selector Carousel */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="text-[11px] text-slate-400 font-semibold mb-2.5 flex items-center justify-between">
            <span>Готовые пресеты цепочек оркестрации (Шаблоны):</span>
            <span className="text-indigo-400 font-mono text-[10px]">
              {PRESET_WORKFLOWS.length} пресетов доступно
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {PRESET_WORKFLOWS.map((preset) => {
              const isCurrent = activeWorkflow.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-left p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-indigo-950/80 border-indigo-400 ring-2 ring-indigo-500/30 shadow-md'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-xs font-bold truncate ${isCurrent ? 'text-indigo-200' : 'text-slate-200'}`}>
                        {preset.name}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                        preset.category === 'pricing' ? 'bg-emerald-500/20 text-emerald-300' :
                        preset.category === 'sourcing' ? 'bg-amber-500/20 text-amber-300' :
                        preset.category === 'seo' ? 'bg-purple-500/20 text-purple-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {preset.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-2">
                    <span>{preset.nodes.length} нод</span>
                    <span>•</span>
                    <span>{preset.connections.length} связей</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Canvas + Control Panels Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left 3 Cols: Interactive Flow Canvas */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex flex-col min-h-[580px] relative">
          {/* Canvas Toolbar */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCatalogDrawerOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить ноду</span>
              </button>

              <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block"></div>

              {selectedNodeId && (
                <button
                  onClick={handleDeleteSelectedNode}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Удалить ноду</span>
                </button>
              )}

              {selectedConnectionId && (
                <button
                  onClick={handleDeleteSelectedConnection}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Удалить связь</span>
                </button>
              )}
            </div>

            {/* Scale Controls & Connection Hint */}
            <div className="flex items-center gap-3">
              {connectingFrom && (
                <div className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Кликните на входной порт (In) целевой ноды</span>
                  <button
                    onClick={() => setConnectingFrom(null)}
                    className="text-amber-700 hover:text-amber-950 font-bold ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                <button
                  onClick={() => setCanvasScale((s) => Math.max(0.6, s - 0.1))}
                  className="w-6 h-6 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold cursor-pointer"
                  title="Уменьшить масштаб"
                >
                  -
                </button>
                <span className="text-[11px] font-mono text-slate-700 px-1 font-semibold">
                  {Math.round(canvasScale * 100)}%
                </span>
                <button
                  onClick={() => setCanvasScale((s) => Math.min(1.4, s + 0.1))}
                  className="w-6 h-6 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold cursor-pointer"
                  title="Увеличить масштаб"
                >
                  +
                </button>
                <button
                  onClick={() => setCanvasScale(1)}
                  className="px-1.5 text-[10px] text-slate-400 hover:text-slate-700 font-semibold cursor-pointer"
                  title="Сброс масштаба"
                >
                  100%
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Flow Canvas Area */}
          <div
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onClick={() => {
              setSelectedNodeId(null);
              setSelectedConnectionId(null);
              if (connectingFrom) setConnectingFrom(null);
            }}
            className="flex-1 bg-slate-900 relative overflow-auto cursor-grab active:cursor-grabbing select-none"
            style={{
              backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)`,
              backgroundSize: `${24 * canvasScale}px ${24 * canvasScale}px`,
            }}
          >
            {/* SVG Layer for Bezier Connection Curves */}
            <svg
              className="absolute top-0 left-0 w-[1600px] h-[1000px] pointer-events-none"
              style={{
                transform: `scale(${canvasScale})`,
                transformOrigin: '0 0',
              }}
            >
              <defs>
                <linearGradient id="conn-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feComposite in="SourceGraphic" in2="glow" operator="over" />
                </filter>
              </defs>

              {/* Render Existing Connections */}
              {connections.map((conn) => {
                const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
                const toNode = nodes.find((n) => n.id === conn.toNodeId);
                if (!fromNode || !toNode) return null;

                const { path, midX, midY } = calculateCurve(fromNode, toNode);
                const isSelected = selectedConnectionId === conn.id;

                return (
                  <g key={conn.id} className="pointer-events-auto cursor-pointer">
                    {/* Wider transparent path for easy clicking */}
                    <path
                      d={path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="20"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedConnectionId(conn.id);
                        setSelectedNodeId(null);
                      }}
                    />

                    {/* Visible line */}
                    <path
                      d={path}
                      fill="none"
                      stroke={isSelected ? '#f59e0b' : 'url(#conn-gradient)'}
                      strokeWidth={isSelected ? '3.5' : '2.5'}
                      strokeDasharray={isSimulating ? '6,6' : undefined}
                      className={isSimulating ? 'animate-[dash_1s_linear_infinite]' : ''}
                    />

                    {/* Animated moving packet during simulation */}
                    {isSimulating && (
                      <circle r="4.5" fill="#34d399" filter="url(#glow)">
                        <animateMotion dur="1.2s" repeatCount="indefinite" path={path} />
                      </circle>
                    )}

                    {/* Optional Connection Label Pill */}
                    {conn.label && (
                      <g transform={`translate(${midX - 35}, ${midY - 10})`}>
                        <rect
                          width="70"
                          height="20"
                          rx="6"
                          fill="#1e293b"
                          stroke="#475569"
                          strokeWidth="1"
                        />
                        <text
                          x="35"
                          y="13"
                          textAnchor="middle"
                          fill="#e2e8f0"
                          fontSize="9"
                          fontFamily="sans-serif"
                          fontWeight="bold"
                        >
                          {conn.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Live drawing connection from active port to cursor */}
              {connectingFrom && (
                (() => {
                  const fromNode = nodes.find((n) => n.id === connectingFrom.nodeId);
                  if (!fromNode) return null;
                  const fromX = fromNode.x + 240;
                  const fromY = fromNode.y + 45;
                  const toX = mousePos.x;
                  const toY = mousePos.y;
                  const path = `M ${fromX} ${fromY} C ${fromX + 60} ${fromY}, ${toX - 60} ${toY}, ${toX} ${toY}`;

                  return (
                    <path
                      d={path}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeDasharray="4,4"
                      className="animate-pulse"
                    />
                  );
                })()
              )}
            </svg>

            {/* HTML Layer for Flow Nodes */}
            <div
              className="absolute top-0 left-0 w-[1600px] h-[1000px] pointer-events-none"
              style={{
                transform: `scale(${canvasScale})`,
                transformOrigin: '0 0',
              }}
            >
              {nodes.map((node, index) => {
                const isSelected = selectedNodeId === node.id;
                const isSimActive = isSimulating && simActiveStep === index;

                // Color themes by node type
                const typeStyles = {
                  trigger: {
                    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                    headerBg: 'bg-gradient-to-r from-amber-950/60 to-slate-900',
                    iconColor: 'text-amber-400',
                    label: 'TRIGGER',
                  },
                  condition: {
                    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                    headerBg: 'bg-gradient-to-r from-blue-950/60 to-slate-900',
                    iconColor: 'text-blue-400',
                    label: 'GUARDRAIL',
                  },
                  ai_logic: {
                    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                    headerBg: 'bg-gradient-to-r from-purple-950/60 to-slate-900',
                    iconColor: 'text-purple-400',
                    label: 'AI REASONING',
                  },
                  action: {
                    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                    headerBg: 'bg-gradient-to-r from-emerald-950/60 to-slate-900',
                    iconColor: 'text-emerald-400',
                    label: 'ACTION',
                  },
                }[node.type];

                return (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                      setSelectedConnectionId(null);
                    }}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: '240px',
                    }}
                    className={`absolute pointer-events-auto rounded-2xl bg-slate-900 border transition-all cursor-move shadow-xl ${
                      isSimActive
                        ? 'border-emerald-400 ring-4 ring-emerald-500/40 scale-105 shadow-emerald-500/30'
                        : isSelected
                        ? 'border-indigo-400 ring-2 ring-indigo-500/30 shadow-indigo-500/20'
                        : 'border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {/* Input Port (Left side) - except for root triggers */}
                    {node.type !== 'trigger' && (
                      <div
                        onClick={(e) => handlePortClick(e, node.id, 'in', 'in')}
                        title="Входной порт (Кликните для соединения)"
                        className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-500 hover:border-emerald-400 hover:bg-emerald-950 flex items-center justify-center transition-all cursor-pointer z-20 group"
                      >
                        <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-emerald-400"></div>
                      </div>
                    )}

                    {/* Output Port (Right side) - except for terminal actions */}
                    <div
                      onClick={(e) => handlePortClick(e, node.id, 'out', 'out')}
                      title="Выходной порт (Потяните связь к следующей ноде)"
                      className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-800 border-2 border-indigo-400 hover:border-indigo-300 hover:bg-indigo-950 flex items-center justify-center transition-all cursor-pointer z-20 group"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 group-hover:scale-125 transition-transform"></div>
                    </div>

                    {/* Node Header */}
                    <div className={`p-3 rounded-t-2xl border-b border-slate-800 flex items-center justify-between ${typeStyles.headerBg}`}>
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 ${typeStyles.iconColor}`}>
                          {renderNodeIcon(node.icon, 'w-4 h-4')}
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border font-mono ${typeStyles.badge}`}>
                          {typeStyles.label}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">
                        #{index + 1}
                      </span>
                    </div>

                    {/* Node Content */}
                    <div className="p-3">
                      <div className="font-bold text-xs text-white leading-snug mb-1">
                        {node.title}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {node.subtitle}
                      </div>

                      {/* Config Chips */}
                      {Object.keys(node.config).length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
                          {Object.entries(node.config).slice(0, 2).map(([key, val]) => (
                            <span
                              key={key}
                              className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-md font-mono border border-slate-700"
                            >
                              {key}: {String(val)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Node Inspector & Realtime Execution Log */}
        <div className="space-y-4">
          {/* Node Configuration Inspector */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Параметры ноды (Inspector)</span>
            </h3>

            {selectedNode ? (
              <div className="space-y-3.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Название шага</label>
                  <input
                    type="text"
                    value={selectedNode.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setNodes((prev) =>
                        prev.map((n) => (n.id === selectedNode.id ? { ...n, title: newTitle } : n))
                      );
                    }}
                    className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Описание / Пояснение</label>
                  <textarea
                    value={selectedNode.subtitle}
                    rows={2}
                    onChange={(e) => {
                      const newSubtitle = e.target.value;
                      setNodes((prev) =>
                        prev.map((n) => (n.id === selectedNode.id ? { ...n, subtitle: newSubtitle } : n))
                      );
                    }}
                    className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Тип ноды & Категория</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-mono font-bold">
                      {selectedNode.type.toUpperCase()}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold">
                      {selectedNode.category}
                    </span>
                  </div>
                </div>

                {/* Dynamic Config Parameters */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Параметры правила (Config JSON)</label>
                  <div className="mt-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-400 max-h-32 overflow-y-auto">
                    <pre>{JSON.stringify(selectedNode.config, null, 2)}</pre>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">ID: {selectedNode.id}</span>
                  <button
                    onClick={handleDeleteSelectedNode}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs leading-relaxed">
                <Compass className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>Кликните на любую ноду на полотне для настройки ее порогов и параметров</span>
              </div>
            )}
          </div>

          {/* Realtime Simulation / Dry-Run Terminal Log */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl text-slate-200">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <h4 className="text-xs font-bold text-white font-mono">
                  DRY-RUN EXECUTION TRACE
                </h4>
              </div>
              <button
                onClick={() => setSimLogs([])}
                className="text-[10px] text-slate-500 hover:text-slate-300 font-mono cursor-pointer"
              >
                Очистить
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto font-mono text-[11px] pr-1">
              {simLogs.length === 0 ? (
                <div className="text-slate-500 py-6 text-center text-xs">
                  Нажмите <strong>«Запустить Dry Run»</strong> для пошаговой проверки передачи данных между нодами
                </div>
              ) : (
                simLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-xl border leading-relaxed ${
                      log.status === 'success'
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : log.status === 'warning'
                        ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5">
                      <span className="font-bold text-slate-200">{log.nodeTitle}</span>
                      <span>{log.timestamp}</span>
                    </div>
                    <div>{log.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Node Catalog Modal / Drawer */}
      {isCatalogDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  <span>Каталог строительных блоков (Нод)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Выберите тип компонента для добавления на холст визуального редактора
                </p>
              </div>
              <button
                onClick={() => setIsCatalogDrawerOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pt-4 flex-1 pr-1">
              {['trigger', 'condition', 'ai_logic', 'action'].map((typeKey) => {
                const typeItems = NODE_CATALOG.filter((item) => item.type === typeKey);
                const title = {
                  trigger: '⚡ 1. Триггеры (События маркетплейса)',
                  condition: '🛡️ 2. Guardrails & Фильтры (Ограничения)',
                  ai_logic: '🧠 3. AI Модели & Калькуляторы (Принятие решений)',
                  action: '🚀 4. Действия & Коннекторы (Исполнение)',
                }[typeKey];

                return (
                  <div key={typeKey}>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      {title}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {typeItems.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAddCatalogNode(item)}
                          className="text-left p-3 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer flex items-start gap-2.5 group"
                        >
                          <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors text-slate-700 shrink-0">
                            {renderNodeIcon(item.icon, 'w-4 h-4')}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900 group-hover:text-indigo-900">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-500 leading-snug">
                              {item.subtitle}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

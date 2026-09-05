import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Package, 
  Search, 
  TrendingDown, 
  Rocket, 
  Settings, 
  SunMedium, 
  Bell, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  MessageSquare,
  Building2,
  ChevronDown,
  LayoutDashboard,
  HelpCircle,
  Cpu,
  Activity
} from 'lucide-react';

import { 
  Product, 
  StoreAlert, 
  ChatMessage, 
  MarketplaceConfig, 
  Store, 
  Organization, 
  BusinessRule, 
  AuditLogItem, 
  OpportunityItem, 
  ReviewCluster,
  ActionCardData,
  MarketRegion
} from './types';

import { 
  INITIAL_PRODUCTS, 
  INITIAL_ALERTS, 
  INITIAL_CHAT_MESSAGES,
  INITIAL_ORGANIZATION,
  INITIAL_STORES,
  INITIAL_BUSINESS_RULES,
  INITIAL_AUDIT_LOGS,
  INITIAL_OPPORTUNITIES,
  INITIAL_REVIEW_CLUSTERS
} from './data/mockStore';

import { MainDashboard } from './components/MainDashboard';
import { TelegramChat } from './components/TelegramChat';
import { CatalogTable } from './components/CatalogTable';
import { RankSeoStudio } from './components/RankSeoStudio';
import { LaunchWizard } from './components/LaunchWizard';
import { CompetitorRepricer } from './components/CompetitorRepricer';
import { ArchitectureInspector } from './components/ArchitectureInspector';
import { ReviewIntelligence } from './components/ReviewIntelligence';
import { MorningDigestModal } from './components/MorningDigestModal';
import { SettingsModal } from './components/SettingsModal';
import { AlertsFeed } from './components/AlertsFeed';
import { FirstConnectAuditModal } from './components/FirstConnectAuditModal';
import { ActionConfirmModal } from './components/ActionConfirmModal';
import { ContentHealthModal } from './components/ContentHealthModal';
import { OnboardingTour, ONBOARDING_STORAGE_KEY } from './components/OnboardingTour';
import { ContentHealthAudit } from './types';
import { runDiagnosticsEngine, triggerRankShiftSimulation } from './utils/diagnosticsEngine';
import { ChinaMarketplaceHub } from './components/ChinaMarketplaceHub';
import { GlobalSearchBar } from './components/GlobalSearchBar';
import { MarketSwitcher } from './components/MarketSwitcher';
import { MarketWelcomeSelector } from './components/MarketWelcomeSelector';

const STORAGE_KEY = 'commerceos_telegram_chat_history_v1';

const getInitialChatMessages = (): ChatMessage[] => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(-10);
      }
    }
  } catch (e) {
    console.error('Failed to parse cached chat messages:', e);
  }
  return INITIAL_CHAT_MESSAGES.slice(-10);
};

export default function App() {
  type WorkspaceType = 'overview' | 'products' | 'sourcing' | 'automation';
  type LegacyTabType = 'dashboard' | 'telegram' | 'catalog' | 'seo' | 'repricer' | 'china' | 'launch' | 'reviews' | 'alerts' | 'architecture' | 'workflows';

  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceType>('overview');
  const [productsSubTab, setProductsSubTab] = useState<'catalog' | 'repricer' | 'seo'>('catalog');
  const [sourcingSubTab, setSourcingSubTab] = useState<'china' | 'launch' | 'reviews'>('china');
  const [automationSubTab, setAutomationSubTab] = useState<'telegram' | 'workflows' | 'architecture' | 'alerts'>('telegram');

  // Unified navigation helper supporting legacy tab names, new workspaces & deep links
  const navigateToTab = (tab: LegacyTabType | string, subTab?: string) => {
    if (tab === 'dashboard' || tab === 'overview') {
      setActiveWorkspace('overview');
    } else if (tab === 'catalog') {
      setActiveWorkspace('products');
      setProductsSubTab('catalog');
    } else if (tab === 'repricer') {
      setActiveWorkspace('products');
      setProductsSubTab('repricer');
    } else if (tab === 'seo') {
      setActiveWorkspace('products');
      setProductsSubTab('seo');
    } else if (tab === 'china' || tab === 'sourcing') {
      setActiveWorkspace('sourcing');
      setSourcingSubTab('china');
    } else if (tab === 'launch') {
      setActiveWorkspace('sourcing');
      setSourcingSubTab('launch');
    } else if (tab === 'reviews') {
      setActiveWorkspace('sourcing');
      setSourcingSubTab('reviews');
    } else if (tab === 'telegram') {
      setActiveWorkspace('automation');
      setAutomationSubTab('telegram');
    } else if (tab === 'workflows') {
      setActiveWorkspace('automation');
      setAutomationSubTab('workflows');
    } else if (tab === 'architecture') {
      setActiveWorkspace('automation');
      setAutomationSubTab('architecture');
      if (subTab) {
        setArchitectureSubTab(subTab as any);
      }
    } else if (tab === 'alerts') {
      setActiveWorkspace('automation');
      setAutomationSubTab('alerts');
    }
  };

  const setActiveTab = (tab: LegacyTabType | string) => {
    navigateToTab(tab);
  };

  // Market Region State (China as Primary default)
  const [activeMarket, setActiveMarket] = useState<MarketRegion>('china');

  // Multi-tenant Organization & Stores
  const [organization] = useState<Organization>(INITIAL_ORGANIZATION);
  const [stores, setStores] = useState<Store[]>(INITIAL_STORES);
  const [currentStore, setCurrentStore] = useState<Store>(INITIAL_STORES[0]);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);

  // Switch Market Context Helper
  const handleSelectMarket = (market: MarketRegion) => {
    setActiveMarket(market);
    if (market === 'china') {
      const chinaStore = stores.find((s) => ['1688', 'taobao', 'jd', 'pinduoduo'].includes(s.marketplace)) || stores[0];
      setCurrentStore(chinaStore);
      showToast('🇨🇳 Рынок Китая установлен как основной (1688 / Taobao / JD, Валюта: ¥)');
    } else if (market === 'russia') {
      const ruStore = stores.find((s) => ['wb', 'ozon'].includes(s.marketplace)) || stores[0];
      setCurrentStore(ruStore);
      showToast('🇷🇺 Переключено на рынок РФ (Wildberries / Ozon, Валюта: ₽)');
    } else if (market === 'global') {
      const globalStore = stores.find((s) => s.marketplace === 'shopify') || stores[0];
      setCurrentStore(globalStore);
      showToast('🌐 Переключено на Глобальный рынок (Shopify / EU, Валюта: €)');
    } else {
      const allStore = stores.find((s) => s.marketplace === 'all') || stores[0];
      setCurrentStore(allStore);
      showToast('⚡ Режим Мульти-хаб: Все рынки и каналы');
    }
  };

  const handleSelectStore = (s: Store) => {
    setCurrentStore(s);
    setIsStoreDropdownOpen(false);
    if (['1688', 'taobao', 'jd', 'pinduoduo'].includes(s.marketplace)) {
      setActiveMarket('china');
    } else if (['wb', 'ozon'].includes(s.marketplace)) {
      setActiveMarket('russia');
    } else if (s.marketplace === 'shopify') {
      setActiveMarket('global');
    }
    showToast(`Переключено на филиал: ${s.name}`);
  };

  // Core Data
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [alerts, setAlerts] = useState<StoreAlert[]>(INITIAL_ALERTS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(getInitialChatMessages);
  const [rules, setRules] = useState<BusinessRule[]>(INITIAL_BUSINESS_RULES);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>(INITIAL_OPPORTUNITIES);
  const [reviewClusters] = useState<ReviewCluster[]>(INITIAL_REVIEW_CLUSTERS);

  // Cache last 10 chat messages to localStorage
  useEffect(() => {
    try {
      const toCache = chatMessages.slice(-10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toCache));
    } catch (e) {
      console.error('Failed to cache chat messages to localStorage:', e);
    }
  }, [chatMessages]);

  // Modals
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDigestOpen, setIsDigestOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<ActionCardData | null>(null);
  const [healthAuditProduct, setHealthAuditProduct] = useState<Product | null>(null);
  const [isContentHealthOpen, setIsContentHealthOpen] = useState(false);

  // Global Search & Deep Navigation State
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>('');
  const [architectureSubTab, setArchitectureSubTab] = useState<'diagram' | 'math_engine' | 'connector' | 'rules' | 'audit' | 'diagnostics' | 'events'>('diagram');
  const [highlightRuleId, setHighlightRuleId] = useState<string | null>(null);
  const [highlightLogId, setHighlightLogId] = useState<string | null>(null);

  // Auto-launch Onboarding Tour for first-time visitors
  useEffect(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!completed) {
        const timer = setTimeout(() => {
          setIsOnboardingOpen(true);
        }, 700);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.error('Failed to read onboarding state:', e);
    }
  }, []);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hasAppliedSolution, setHasAppliedSolution] = useState(false);

  const [config, setConfig] = useState<MarketplaceConfig>({
    wbConnected: true,
    wbApiKey: 'wb_live_9381029481092841029',
    ozonConnected: true,
    ozonClientId: '1849204',
    ozonApiKey: 'oz_live_49204921094021',
    shopifyConnected: true,
    shopifyStoreUrl: 'ecostyle-direct.myshopify.com',
    ali1688Connected: true,
    ali1688AppKey: '1688_live_app_8829104',
    ali1688AppSecret: 'sec_ali_99214810924',
    taobaoConnected: true,
    taobaoAppKey: 'taobao_top_3319024',
    taobaoSessionKey: 'top_sess_99182301048',
    jdConnected: false,
    jdAppKey: 'jd_open_7719204',
    jdAppSecret: 'jd_sec_4410924',
    pinduoduoConnected: false,
    pinduoduoClientId: 'pdd_client_551920',
    cnyExchangeRate: 13.45,
    chinaFulfillmentHub: 'Guangzhou South Logistics Port #4',
    customsClearanceBroker: 'SilkWay DDP Cargo Express (Белая таможня)',
    telegramConnected: true,
    telegramUsername: '@commerce_os_bot',
    autoRepricing: true,
    morningDigestTime: '09:00',
  });

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const product7 = products.find((p) => p.id === 'prod-7');

  // Filter products by current store and active market
  const visibleProducts = products.filter((p) => {
    if (currentStore.marketplace !== 'all') {
      if (p.storeId && p.storeId === currentStore.id) return true;
      if (p.marketplace === currentStore.marketplace) return true;
      return false;
    }
    if (activeMarket === 'china') {
      return ['1688', 'taobao', 'jd', 'pinduoduo'].includes(p.marketplace);
    }
    if (activeMarket === 'russia') {
      return ['wb', 'ozon'].includes(p.marketplace);
    }
    if (activeMarket === 'global') {
      return ['shopify'].includes(p.marketplace);
    }
    return true;
  });

  // Handle sending a message in the Telegram Chat with intent & multi-tenant context
  const handleSendMessage = async (text: string) => {
    const userMsgId = `msg-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsAiLoading(true);

    try {
      const storeContext = {
        storeName: currentStore.name,
        marketplace: currentStore.marketplace,
        totalProducts: visibleProducts.length,
        dailyRevenue: visibleProducts.reduce((acc, p) => acc + p.dailyRevenue, 0),
        criticalStockItems: visibleProducts.filter((p) => p.daysLeft <= 4).map((p) => ({
          name: p.name,
          sku: p.sku,
          daysLeft: p.daysLeft,
          stock: p.stockFbo,
        })),
        topDroppingItems: visibleProducts.filter((p) => p.searchRankDelta < 0).map((p) => ({
          name: p.name,
          sku: p.sku,
          searchRank: p.searchRank,
          drop: p.searchRankDelta,
          competitorPrice: p.competitorPrice,
          ourPrice: p.price,
        })),
        topGrowingItems: visibleProducts.filter((p) => p.searchRankDelta > 0).map((p) => ({
          name: p.name,
          sku: p.sku,
          rank: p.searchRank,
          growth: p.searchRankDelta,
        })),
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: chatMessages.slice(-6),
          storeContext,
          organizationId: organization.id,
          storeId: currentStore.id,
        }),
      });

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: data.reply || 'Не удалось получить ответ от AI-менеджера.',
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        normalizedIntent: data.intent,
        agentChain: data.agentChain,
        actionCard: data.actionCard,
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: '⚠️ Произошла ошибка связи с сервером. Пожалуйста, попробуйте еще раз.',
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Safe Action Execution via Confirmation Dialog
  const handleInitiateAction = (actionType: string, actionData?: any) => {
    if (actionData?.payload) {
      setConfirmModalData(actionData);
    } else {
      // Fallback for simple calls
      setConfirmModalData({
        type: actionType as any,
        title: 'Подтверждение действия AI',
        description: 'Отправка изменений параметров товара в API маркетплейса.',
        buttonLabel: 'Подтвердить',
        permissionLevel: 'WRITE',
        payload: {
          productId: 'prod-7',
          productName: 'Рюкзак городской мужской WB-77291048',
          oldPrice: 2190,
          newPrice: 1990,
          amount: 180,
          targetWarehouse: 'Коледино (WB)',
          reason: 'Компенсация демпинга конкурента и предотвращение out-of-stock',
        }
      });
    }
  };

  // Confirmed Execution -> Apply to Product State + Record in Immutable Audit Log
  const handleExecuteConfirmedAction = (actionCard: ActionCardData) => {
    const payload = actionCard.payload || {};
    const targetProdId = payload.productId || 'prod-7';
    const targetProd = products.find(p => p.id === targetProdId);

    if (payload.newPrice) {
      setProducts(prev => prev.map(p => p.id === targetProdId ? { ...p, price: payload.newPrice!, status: 'stable' } : p));
    }
    if (payload.amount) {
      setProducts(prev => prev.map(p => p.id === targetProdId ? { 
        ...p, 
        stockFbo: p.stockFbo + payload.amount!, 
        daysLeft: p.daysLeft + 18,
        status: 'stable' 
      } : p));
    }

    // Append to Audit Log (Section 12, 13, 34)
    const newLogItem: AuditLogItem = {
      id: `audit-${Date.now()}`,
      timestamp: 'Только что',
      store: currentStore.name,
      actor: 'AI Orchestrator',
      action: actionCard.title,
      permissionLevel: actionCard.permissionLevel || 'WRITE',
      beforeVal: payload.oldPrice ? `${payload.oldPrice} ₽` : 'Текущие параметры',
      afterVal: payload.newPrice ? `${payload.newPrice} ₽` : `+${payload.amount || 100} шт`,
      reason: payload.reason || actionCard.description,
      status: 'verified',
    };
    setAuditLogs(prev => [newLogItem, ...prev]);

    // Mark chat action applied
    setChatMessages(prev => prev.map(msg => ({ ...msg, actionApplied: true })));
    setHasAppliedSolution(true);

    // Resolve any related alerts
    setAlerts(prev => prev.map(a => a.productId === targetProdId ? { ...a, resolved: true } : a));

    showToast(`✓ Действие верифицировано и передано в API ${currentStore.marketplace.toUpperCase()}!`);
  };

  // Update product price
  const handleUpdatePrice = (productId: string, newPrice: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, price: newPrice } : p))
    );
    showToast(`✓ Цена обновлена: ${newPrice.toLocaleString('ru-RU')} ₽`);
  };

  // Batch price updates
  const handleBatchUpdatePrices = (updates: { productId: string; newPrice: number }[], reasonDescription?: string) => {
    const updateMap = new Map(updates.map(u => [u.productId, u.newPrice]));
    setProducts((prev) =>
      prev.map((p) => {
        const newPrice = updateMap.get(p.id);
        if (newPrice !== undefined) {
          return { ...p, price: newPrice };
        }
        return p;
      })
    );

    // Record in Audit Log
    const newLogItem: AuditLogItem = {
      id: `audit-batch-price-${Date.now()}`,
      timestamp: 'Только что',
      store: currentStore.name,
      actor: 'Seller (Manual)',
      action: `Пакетная корректировка цен (${updates.length} SKU)`,
      permissionLevel: 'WRITE',
      beforeVal: 'Прежние розничные цены',
      afterVal: `Обновлено ${updates.length} цен товаров`,
      reason: reasonDescription || 'Массовое изменение цен через плавающую панель каталога',
      status: 'verified',
    };
    setAuditLogs(prev => [newLogItem, ...prev]);

    showToast(`✓ Пакетно обновлены цены для ${updates.length} товаров!`);
  };

  // Restock action
  const handleRestock = (productId: string, amount: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, stockFbo: p.stockFbo + amount, daysLeft: p.daysLeft + 14, status: 'stable' }
          : p
      )
    );
    showToast(`✓ Оформлена поставка на склад: +${amount} единиц`);
  };

  // Batch restock updates
  const handleBatchRestock = (updates: { productId: string; amount: number; isFbs?: boolean }[], reasonDescription?: string) => {
    const updateMap = new Map(updates.map(u => [u.productId, u]));
    let totalItems = 0;
    setProducts((prev) =>
      prev.map((p) => {
        const up = updateMap.get(p.id);
        if (up) {
          totalItems += up.amount;
          if (up.isFbs) {
            return { ...p, stockFbs: p.stockFbs + up.amount, status: 'stable' };
          }
          return { ...p, stockFbo: p.stockFbo + up.amount, daysLeft: p.daysLeft + Math.round(up.amount / Math.max(1, p.dailyOrders)), status: 'stable' };
        }
        return p;
      })
    );

    // Record in Audit Log
    const newLogItem: AuditLogItem = {
      id: `audit-batch-stock-${Date.now()}`,
      timestamp: 'Только что',
      store: currentStore.name,
      actor: 'Seller (Manual)',
      action: `Пакетное пополнение остатков (${updates.length} SKU, +${totalItems} шт)`,
      permissionLevel: 'WRITE',
      beforeVal: 'Прежние складские остатки',
      afterVal: `Добавлено +${totalItems} шт на склады`,
      reason: reasonDescription || 'Массовое оформление поставок через панель каталога',
      status: 'verified',
    };
    setAuditLogs(prev => [newLogItem, ...prev]);

    showToast(`✓ Пакетная поставка (+${totalItems} шт для ${updates.length} товаров) успешно оформлена!`);
  };

  // Audit log approval handlers (Human-in-the-Loop Safe Execution)
  const handleApproveAuditLog = (id: string) => {
    setAuditLogs(prev => prev.map(log => {
      if (log.id === id) {
        return { ...log, status: 'verified', requiresApproval: false };
      }
      return log;
    }));
    showToast('✓ Действие подтверждено и успешно выполнено в API маркетплейса');
  };

  const handleRejectAuditLog = (id: string) => {
    setAuditLogs(prev => prev.map(log => {
      if (log.id === id) {
        return { ...log, status: 'rejected', requiresApproval: false };
      }
      return log;
    }));
    showToast('Действие отклонено оператором');
  };

  // Batch AI Question
  const handleAskAiAboutMultipleProducts = (selectedProducts: Product[]) => {
    setActiveTab('telegram');
    const skuList = selectedProducts.map(p => `«${p.name}» (SKU: ${p.sku}, Позиция: #${p.searchRank}, Остаток: ${p.daysLeft} дн.)`).join('\n• ');
    handleSendMessage(`Сделай сравнительный анализ и план действий по следующим ${selectedProducts.length} выбранным товарам:\n• ${skuList}\n\nЧто нужно срочно скорректировать по ценам, рекламе и поставкам?`);
  };

  // Rule management
  const handleToggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    showToast('Статус бизнес-правила обновлен');
  };

  const handleAddRule = (newRule: Omit<BusinessRule, 'id'>) => {
    const created: BusinessRule = {
      ...newRule,
      id: `rule-${Date.now()}`,
    };
    setRules(prev => [...prev, created]);
    showToast('Новое правило автоматизации добавлено в ядро');
  };

  // Ask AI about specific product
  const handleAskAboutProduct = (p: Product, customPrompt?: string) => {
    setActiveTab('telegram');
    if (customPrompt) {
      handleSendMessage(customPrompt);
    } else {
      handleSendMessage(`Сделай полный разбор по товару «${p.name}» (SKU: ${p.sku}). Почему он сейчас на #${p.searchRank} месте и что нужно улучшить?`);
    }
  };

  // Opportunity click
  const handleApplyOpportunity = (opp: OpportunityItem) => {
    handleInitiateAction('opportunity', {
      title: opp.title,
      description: opp.description,
      buttonLabel: '⚡ Применить стратегию роста',
      permissionLevel: 'WRITE',
      payload: {
        ...opp.payload,
        reason: opp.description,
      }
    });
  };

  // Content Health Inspection Handlers
  const handleInspectContentHealth = (p: Product) => {
    setHealthAuditProduct(p);
    setIsContentHealthOpen(true);
  };

  const handleApplyContentHealthFix = (
    productId: string, 
    updatedTitle: string, 
    updatedDescription: string, 
    addedKeywords: string[]
  ) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          name: updatedTitle,
          description: updatedDescription,
          searchRank: Math.max(1, p.searchRank - 4),
          searchRankDelta: (p.searchRankDelta || 0) + 4,
          keywords: Array.from(new Set([...p.keywords, ...addedKeywords]))
        };
      }
      return p;
    }));

    // Record in Immutable Audit Log
    const newLogItem: AuditLogItem = {
      id: `audit-content-${Date.now()}`,
      timestamp: 'Только что',
      store: currentStore.name,
      actor: 'AI Orchestrator',
      action: `Оптимизация Content Health для карточки ${productId}`,
      permissionLevel: 'WRITE',
      beforeVal: 'Score: 68/100 (Низкое покрытие ключей)',
      afterVal: 'Score: 96/100 (Внедрены 3 ВЧ-кластера + Rich-описание)',
      reason: 'Автоматический аудит и применение AI-оптимизации семантики и структуры',
      status: 'verified',
    };
    setAuditLogs(prev => [newLogItem, ...prev]);

    showToast(`✓ AI-исправление применено! Индекс карточки вырос до 96/100`);
  };

  const handleBatchApplySeo = (
    updates: { 
      productId: string; 
      newTitle: string; 
      newDescription: string; 
      addedKeywords: string[];
    }[],
    reasonDescription?: string
  ) => {
    const updateMap = new Map(updates.map(u => [u.productId, u]));

    setProducts(prev => prev.map(p => {
      const up = updateMap.get(p.id);
      if (up) {
        return {
          ...p,
          name: up.newTitle,
          description: up.newDescription,
          searchRank: Math.max(1, p.searchRank - 5),
          searchRankDelta: (p.searchRankDelta || 0) + 5,
          keywords: Array.from(new Set([...p.keywords, ...up.addedKeywords])),
        };
      }
      return p;
    }));

    // Record in Immutable Audit Log
    const newLogItem: AuditLogItem = {
      id: `audit-batch-seo-${Date.now()}`,
      timestamp: 'Только что',
      store: currentStore.name,
      actor: 'AI Orchestrator',
      action: `Массовая SEO-оптимизация (${updates.length} SKU)`,
      permissionLevel: 'WRITE',
      beforeVal: 'Исходные заголовки и описания',
      afterVal: `Обновлено ${updates.length} карточек (Score: 98/100)`,
      reason: reasonDescription || `Пакетная AI SEO-оптимизация и внедрение Rich-структуры для ${updates.length} товаров`,
      status: 'verified',
    };
    setAuditLogs(prev => [newLogItem, ...prev]);

    showToast(`✓ Массовая SEO-оптимизация успешно применена для ${updates.length} товаров!`);
  };

  const handleAskAiAboutContent = (p: Product, audit: ContentHealthAudit) => {
    setIsContentHealthOpen(false);
    setActiveTab('telegram');
    handleSendMessage(
      `Проведи глубокий аудит контента для товара «${p.name}» (SKU: ${p.sku}). Общий балл Content Health: ${audit.overallScore}/100. ` +
      `Покрытие ключей: ${audit.keywordCoverage.score}%, упущенные кластеры: ${audit.keywordCoverage.missingKeywords.map(k => k.keyword).join(', ')}. ` +
      `Оптимизация фото: ${audit.imageOptimization.score}%. Длина описания: ${audit.descriptionLength.score}%. Что в первую очередь внедрить?`
    );
  };

  // Diagnostics Engine Handlers
  const handleRunDiagnostics = () => {
    const report = runDiagnosticsEngine(products, currentStore);
    if (report.findings.length > 0) {
      // Collect new audit entries not yet logged
      const newEntries: AuditLogItem[] = [];
      report.findings.forEach(f => {
        const exists = auditLogs.some(l => l.diagnosticData?.productId === f.productId && l.diagnosticData?.rankDrop === f.rankDelta);
        if (!exists) {
          newEntries.push(f.auditLogEntry);
        }
      });

      if (newEntries.length > 0) {
        setAuditLogs(prev => [...newEntries, ...prev]);
      }
      showToast(`⚡ Diagnostics Engine: Обнаружено ${report.findings.length} аномалий падения. Записи добавлены в аудит-лог!`);
    } else {
      showToast(`⚡ Diagnostics Engine: Все позиции каталога стабильны. Отклонений не зафиксировано.`);
    }
  };

  const handleSimulateProductRankShift = (product: Product, newRank: number) => {
    const { updatedProduct, finding } = triggerRankShiftSimulation(product, newRank, currentStore);
    
    // Update product in global state
    setProducts(prev => prev.map(p => p.id === product.id ? updatedProduct : p));

    // Append verified entry to audit log
    setAuditLogs(prev => [finding.auditLogEntry, ...prev]);

    // If severe drop, trigger store alert
    if (updatedProduct.searchRankDelta <= -3) {
      const newAlert: StoreAlert = {
        id: `alert-diag-${Date.now()}`,
        severity: 'critical',
        title: `Резкое падение позиций: «${updatedProduct.name.slice(0, 30)}...»`,
        description: finding.primaryRootCause,
        timestamp: 'Только что',
        productId: updatedProduct.id,
        actionLabel: finding.recommendedAction.slice(0, 35) + '...',
        actionType: 'price_adjust',
      };
      setAlerts(prev => [newAlert, ...prev]);
    }

    showToast(`⚡ Diagnostics Engine: Позиция товара #${product.searchRank} → #${newRank}. Причина и расчет упущенной выручки занесены в аудит-лог!`);
  };

  // Reset demo store
  const handleResetDemo = () => {
    setProducts(INITIAL_PRODUCTS);
    setAlerts(INITIAL_ALERTS);
    setChatMessages(INITIAL_CHAT_MESSAGES);
    setRules(INITIAL_BUSINESS_RULES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setHasAppliedSolution(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CHAT_MESSAGES.slice(-10)));
    } catch (e) {}
    showToast('Демо-магазин успешно сброшен к исходным метрикам');
  };

  // Global Search selection handlers
  const handleSearchSelectProduct = (product: Product) => {
    setCatalogSearchQuery(product.sku || product.name);
    setActiveTab('catalog');
    showToast(`✓ Товар найден: «${product.name.slice(0, 32)}...»`);
  };

  const handleSearchSelectRule = (rule: BusinessRule) => {
    setArchitectureSubTab('rules');
    setHighlightRuleId(rule.id);
    setActiveTab('architecture');
    showToast(`✓ Бизнес-правило: «${rule.condition.slice(0, 32)}...»`);
  };

  const handleSearchSelectAuditLog = (log: AuditLogItem) => {
    setArchitectureSubTab('audit');
    setHighlightLogId(log.id);
    setActiveTab('architecture');
    showToast(`✓ Запись аудита: «${log.action.slice(0, 32)}...»`);
  };

  const handleSearchSelectTab = (tab: any) => {
    navigateToTab(tab);
  };

  const unresolvedAlertsCount = alerts.filter((a) => !a.resolved).length;

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header - Clean, Structured & Uncluttered */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 lg:gap-6">
          {/* Brand + Unified Store & Market Selector */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setActiveWorkspace('overview')} 
              className="flex items-center gap-2.5 group cursor-pointer text-left"
              title="Перейти на главную панель"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
                    CommerceOS
                  </span>
                  <span className="text-[9px] uppercase font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                    AI
                  </span>
                </div>
              </div>
            </button>

            {/* Compact Store & Market Dropdown Pill */}
            <div className="relative">
              <button
                id="top-store-dropdown-btn"
                onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
                title="Сменить магазин или целевой рынок"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span className="max-w-[130px] sm:max-w-[170px] truncate">{currentStore.name}</span>
                <span className="text-[10px] uppercase font-mono px-1 rounded bg-white text-slate-600 border border-slate-200 font-bold">
                  {currentStore.marketplace}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isStoreDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-40 animate-in fade-in duration-100">
                  <div className="px-3.5 py-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                    <span>{organization.name}</span>
                    <span>¥1 = {config.cnyExchangeRate} ₽</span>
                  </div>

                  <div className="px-2 py-1 text-[11px] font-bold text-slate-500">Магазины & Филиалы:</div>
                  {stores.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectStore(s)}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                        currentStore.id === s.id ? 'bg-indigo-50/70 text-indigo-700 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate mr-2">{s.name}</span>
                      <span className="text-[10px] uppercase font-mono px-1 rounded bg-slate-100 text-slate-500 shrink-0">
                        {s.marketplace}
                      </span>
                    </button>
                  ))}

                  <div className="mt-2 pt-2 border-t border-slate-100 px-2">
                    <div className="text-[11px] font-bold text-slate-500 mb-1 px-1.5">Операционный регион:</div>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => {
                          handleSelectMarket('china');
                          setIsStoreDropdownOpen(false);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold text-center transition-colors cursor-pointer ${
                          activeMarket === 'china' ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        🇨🇳 Китай
                      </button>
                      <button
                        onClick={() => {
                          handleSelectMarket('russia');
                          setIsStoreDropdownOpen(false);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold text-center transition-colors cursor-pointer ${
                          activeMarket === 'russia' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        🇷🇺 РФ (WB)
                      </button>
                      <button
                        onClick={() => {
                          handleSelectMarket('global');
                          setIsStoreDropdownOpen(false);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold text-center transition-colors cursor-pointer ${
                          activeMarket === 'global' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        🌐 Global
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center 4 Core Workspaces - Streamlined Primary Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80">
            <button
              id="tab-dashboard"
              onClick={() => setActiveWorkspace('overview')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeWorkspace === 'overview'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Обзор</span>
            </button>

            <button
              id="tab-catalog"
              onClick={() => setActiveWorkspace('products')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeWorkspace === 'products'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Товары & Цены</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700 font-mono">
                {visibleProducts.length}
              </span>
            </button>

            <button
              id="tab-china"
              onClick={() => setActiveWorkspace('sourcing')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeWorkspace === 'sourcing'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span>🇨🇳</span>
              <span>Закупки & 1688</span>
            </button>

            <button
              id="tab-architecture"
              onClick={() => setActiveWorkspace('automation')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeWorkspace === 'automation'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>AI-Оркестратор</span>
              {unresolvedAlertsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              )}
            </button>
          </nav>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Command / Global Search Bar */}
            <div className="w-36 sm:w-48 md:w-56 lg:w-64">
              <GlobalSearchBar
                products={products}
                rules={rules}
                auditLogs={auditLogs}
                onSelectTab={handleSearchSelectTab}
                onSelectProduct={handleSearchSelectProduct}
                onSelectRule={handleSearchSelectRule}
                onSelectAuditLog={handleSearchSelectAuditLog}
              />
            </div>

            {/* Morning Brief Trigger */}
            <button
              id="top-morning-digest-btn"
              onClick={() => setIsDigestOpen(true)}
              className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition-all cursor-pointer"
              title="Утренняя сводка и готовое решение"
            >
              <SunMedium className="w-4 h-4" />
            </button>

            {/* Unresolved Alerts Badge */}
            <button
              id="top-alerts-btn"
              onClick={() => {
                setActiveWorkspace('automation');
                setAutomationSubTab('alerts');
              }}
              className="relative p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Сигналы и аномалии"
            >
              <Bell className="w-4 h-4" />
              {unresolvedAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {unresolvedAlertsCount}
                </span>
              )}
            </button>

            {/* Tour & Settings */}
            <button
              id="top-tour-btn"
              onClick={() => setIsOnboardingOpen(true)}
              className="hidden sm:flex p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
              title="Обучающий тур по системе"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              id="top-settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Настройки интеграций и API"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar (shown on small screens) */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-100 px-2 py-1.5 bg-slate-50">
          <button
            onClick={() => setActiveWorkspace('overview')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[11px] font-bold ${
              activeWorkspace === 'overview' ? 'text-indigo-600' : 'text-slate-600'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Обзор</span>
          </button>
          <button
            onClick={() => setActiveWorkspace('products')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[11px] font-bold ${
              activeWorkspace === 'products' ? 'text-indigo-600' : 'text-slate-600'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Товары</span>
          </button>
          <button
            onClick={() => setActiveWorkspace('sourcing')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[11px] font-bold ${
              activeWorkspace === 'sourcing' ? 'text-rose-600' : 'text-slate-600'
            }`}
          >
            <span className="text-xs leading-none">🇨🇳</span>
            <span>1688</span>
          </button>
          <button
            onClick={() => setActiveWorkspace('automation')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[11px] font-bold ${
              activeWorkspace === 'automation' ? 'text-indigo-600' : 'text-slate-600'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>AI Автопилот</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* Workspace: OVERVIEW (Main Dashboard) */}
        {activeWorkspace === 'overview' && (
          <div className="space-y-6">
            {/* Streamlined Smart Intelligence Bar */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border border-indigo-900/50">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <SunMedium className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                      ☀️ Утренняя сводка CommerceOS
                    </span>
                    <span className="text-xs text-indigo-200">
                      • Выручка ↑ 14% • Прибыль ↑ 9% • 3 товара требуют пополнения
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Фокус дня: <strong className="text-white font-semibold">Товар №7 (Рюкзак)</strong>. Демпинг конкурента (-240 ₽). AI подготовил безопасное решение.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
                <button
                  id="open-digest-strip-btn"
                  onClick={() => setIsDigestOpen(true)}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer"
                >
                  <span>Открыть готовое решение</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  id="main-top-wow-audit-btn"
                  onClick={() => setIsAuditModalOpen(true)}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                  <span>⚡ WOW-Аудит</span>
                </button>
              </div>
            </div>

            {/* Core Executive Dashboard */}
            <MainDashboard
              currentStore={currentStore}
              stores={stores}
              onSelectStore={(s) => {
                handleSelectStore(s);
              }}
              products={visibleProducts}
              alerts={alerts}
              opportunities={opportunities}
              onOpenAuditModal={() => setIsAuditModalOpen(true)}
              onOpenDigest={() => setIsDigestOpen(true)}
              onSelectProduct={handleAskAboutProduct}
              onApplyOpportunity={handleApplyOpportunity}
              onSwitchTab={(t) => navigateToTab(t as any)}
              onInspectContentHealth={handleInspectContentHealth}
            />
          </div>
        )}

        {/* Workspace: PRODUCTS & PRICING */}
        {activeWorkspace === 'products' && (
          <div className="space-y-4">
            {/* Sub-Navigation Switcher for Products */}
            <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                id="subtab-catalog"
                onClick={() => setProductsSubTab('catalog')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  productsSubTab === 'catalog'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Остатки FBO & Каталог ({visibleProducts.length})</span>
              </button>

              <button
                id="subtab-repricer"
                onClick={() => setProductsSubTab('repricer')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  productsSubTab === 'repricer'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>Конкуренты & Репрайсер</span>
              </button>

              <button
                id="subtab-seo"
                onClick={() => setProductsSubTab('seo')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  productsSubTab === 'seo'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Позиции & SEO Студия</span>
              </button>
            </div>

            {/* Sub-Tab Content Rendering */}
            {productsSubTab === 'catalog' && (
              <CatalogTable
                products={visibleProducts}
                initialSearchTerm={catalogSearchQuery}
                onAskAiAboutProduct={handleAskAboutProduct}
                onAskAiAboutMultipleProducts={handleAskAiAboutMultipleProducts}
                onUpdateProductPrice={handleUpdatePrice}
                onRestockProduct={handleRestock}
                onBatchUpdatePrices={handleBatchUpdatePrices}
                onBatchRestock={handleBatchRestock}
                onBatchApplySeo={handleBatchApplySeo}
                onAddRule={handleAddRule}
                onInspectContentHealth={handleInspectContentHealth}
                onApplyAiFix={handleApplyContentHealthFix}
              />
            )}

            {productsSubTab === 'repricer' && (
              <CompetitorRepricer
                products={visibleProducts}
                onUpdateProductPrice={handleUpdatePrice}
                onAskAi={handleAskAboutProduct}
                onApplyBatchPriceFix={handleBatchUpdatePrices}
                currentStore={currentStore}
                onAddRule={handleAddRule}
              />
            )}

            {productsSubTab === 'seo' && (
              <RankSeoStudio 
                products={visibleProducts} 
                onOpenFullAudit={handleInspectContentHealth}
                onApplyQuickFix={handleApplyContentHealthFix}
              />
            )}
          </div>
        )}

        {/* Workspace: SOURCING & CHINA 1688 */}
        {activeWorkspace === 'sourcing' && (
          <div className="space-y-4">
            {/* Sub-Navigation Switcher for Sourcing */}
            <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                id="subtab-china"
                onClick={() => setSourcingSubTab('china')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  sourcingSubTab === 'china'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>🇨🇳</span>
                <span>Фабрики Китая & 1688</span>
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
              </button>

              <button
                id="subtab-launch"
                onClick={() => setSourcingSubTab('launch')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  sourcingSubTab === 'launch'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Rocket className="w-4 h-4" />
                <span>Запуск Новинки (Launch Wizard)</span>
              </button>

              <button
                id="subtab-reviews"
                onClick={() => setSourcingSubTab('reviews')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  sourcingSubTab === 'reviews'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Review Intelligence (Брак & Отзывы)</span>
              </button>
            </div>

            {/* Sub-Tab Content Rendering */}
            {sourcingSubTab === 'china' && (
              <ChinaMarketplaceHub
                currentStore={currentStore}
                products={visibleProducts}
                config={config}
                onSendMessageToChat={handleSendMessage}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            )}

            {sourcingSubTab === 'launch' && (
              <LaunchWizard onSendMessageToChat={handleSendMessage} />
            )}

            {sourcingSubTab === 'reviews' && (
              <ReviewIntelligence
                clusters={reviewClusters}
                products={visibleProducts}
                onApplyAction={(cluster) => {
                  showToast(`✓ Рекомендация по кластеру «${cluster.category}» передана в дизайнерский бриф!`);
                }}
              />
            )}
          </div>
        )}

        {/* Workspace: AUTOMATION & AI ORCHESTRATOR */}
        {activeWorkspace === 'automation' && (
          <div className="space-y-4">
            {/* Sub-Navigation Switcher for Automation */}
            <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                id="subtab-telegram"
                onClick={() => setAutomationSubTab('telegram')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  automationSubTab === 'telegram'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>AI-Менеджер в Telegram</span>
              </button>

              <button
                id="subtab-workflows"
                onClick={() => setAutomationSubTab('workflows')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  automationSubTab === 'workflows'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Визуальный редактор процессов (Workflows)</span>
              </button>

              <button
                id="subtab-architecture"
                onClick={() => setAutomationSubTab('architecture')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  automationSubTab === 'architecture'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Бизнес-правила & Архитектура</span>
              </button>

              <button
                id="subtab-alerts"
                onClick={() => setAutomationSubTab('alerts')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  automationSubTab === 'alerts'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>Аномалии ({unresolvedAlertsCount})</span>
              </button>
            </div>

            {/* Sub-Tab Content Rendering */}
            {automationSubTab === 'telegram' && (
              <div className="h-[750px] max-h-[82vh]">
                <TelegramChat
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                  isLoading={isAiLoading}
                  onApplyAction={(type, card) => handleInitiateAction(type, card)}
                  onOpenDigest={() => setIsDigestOpen(true)}
                  products={visibleProducts}
                  onSelectProduct={handleAskAboutProduct}
                  onClearHistory={() => {
                    setChatMessages(INITIAL_CHAT_MESSAGES.slice(0, 1));
                    showToast('История диалога с Telegram-ботом очищена');
                  }}
                />
              </div>
            )}

            {automationSubTab === 'workflows' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
                <div className="mb-4">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Визуальный редактор рабочих процессов (AI Workflow Builder)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Соединяйте триггеры маркетплейсов, условия защитных фильтров и исполняемые действия линиями для гибкой настройки логики оркестратора
                  </p>
                </div>
                <ArchitectureInspector
                  organization={organization}
                  currentStore={currentStore}
                  stores={stores}
                  rules={rules}
                  onToggleRule={handleToggleRule}
                  onAddRule={handleAddRule}
                  auditLogs={auditLogs}
                  onApproveAuditLog={handleApproveAuditLog}
                  onRejectAuditLog={handleRejectAuditLog}
                  products={visibleProducts}
                  onTriggerDiagnostics={handleRunDiagnostics}
                  onSimulateRankDrop={handleSimulateProductRankShift}
                  initialSubTab="workflows"
                  highlightRuleId={highlightRuleId}
                  highlightLogId={highlightLogId}
                />
              </div>
            )}

            {automationSubTab === 'architecture' && (
              <ArchitectureInspector
                organization={organization}
                currentStore={currentStore}
                stores={stores}
                rules={rules}
                onToggleRule={handleToggleRule}
                onAddRule={handleAddRule}
                auditLogs={auditLogs}
                onApproveAuditLog={handleApproveAuditLog}
                onRejectAuditLog={handleRejectAuditLog}
                products={visibleProducts}
                onTriggerDiagnostics={handleRunDiagnostics}
                onSimulateRankDrop={handleSimulateProductRankShift}
                initialSubTab={architectureSubTab}
                highlightRuleId={highlightRuleId}
                highlightLogId={highlightLogId}
              />
            )}

            {automationSubTab === 'alerts' && (
              <AlertsFeed
                alerts={alerts}
                products={visibleProducts}
                onResolveAlert={(alertId, actionType, productId) => {
                  if (productId) {
                    if (actionType === 'price_adjust') handleUpdatePrice(productId, 1990);
                    if (actionType === 'restock') handleRestock(productId, 100);
                  }
                  setAlerts((prev) =>
                    prev.map((a) => (a.id === alertId ? { ...a, resolved: true } : a))
                  );
                  showToast('✓ Сигнал успешно отработан!');
                }}
                onSelectProduct={handleAskAboutProduct}
              />
            )}
          </div>
        )}
      </main>

      {/* Safe Action Confirmation Dialog (RECOMMEND -> CONFIRM -> EXECUTE -> VERIFY -> LOG) */}
      <ActionConfirmModal
        isOpen={!!confirmModalData}
        actionCard={confirmModalData}
        currentStore={currentStore}
        targetProduct={confirmModalData?.payload?.productId ? products.find(p => p.id === confirmModalData.payload?.productId) : undefined}
        onClose={() => setConfirmModalData(null)}
        onConfirm={handleExecuteConfirmedAction}
      />

      {/* First Connect WOW Audit Modal (Section 36 & 37) */}
      <FirstConnectAuditModal
        store={currentStore}
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        onExecutePrimaryAction={() => {
          handleExecuteConfirmedAction({
            type: 'price_adjust',
            title: '🎯 Экспресс-решение первого аудита для Товара №7',
            description: 'Снижение цены до 1 990 ₽ (-200 ₽) и заказ поставки 180 шт в Коледино.',
            buttonLabel: 'Подтвердить',
            permissionLevel: 'WRITE',
            payload: {
              productId: 'prod-7',
              productName: 'Рюкзак городской мужской WB-77291048',
              oldPrice: 2190,
              newPrice: 1990,
              amount: 180,
              targetWarehouse: 'Коледино (WB)',
              reason: 'Устранение просадки по первому аудиту подключения',
            }
          });
        }}
      />

      {/* Morning Digest Modal */}
      <MorningDigestModal
        isOpen={isDigestOpen}
        onClose={() => setIsDigestOpen(false)}
        onSelectProduct={handleAskAboutProduct}
        onApplyAction={(prod, newPrice, newStock) => {
          if (newPrice) handleUpdatePrice(prod.id, newPrice);
          if (newStock) handleRestock(prod.id, newStock);
          setHasAppliedSolution(true);
          setAlerts((prev) =>
            prev.map((a) => (a.productId === prod.id ? { ...a, resolved: true } : a))
          );
        }}
        product7={product7}
        hasAppliedSolution={hasAppliedSolution}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={(newConfig) => {
          setConfig(newConfig);
          showToast('Настройки подключения сохранены');
        }}
        onResetDemoData={handleResetDemo}
      />

      {/* Automated Content Health Check Modal */}
      <ContentHealthModal
        isOpen={isContentHealthOpen}
        product={healthAuditProduct}
        onClose={() => setIsContentHealthOpen(false)}
        onApplyAiFix={handleApplyContentHealthFix}
        onAskAiAboutContent={handleAskAiAboutContent}
      />

      {/* Onboarding System Tour */}
      <OnboardingTour
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSwitchTab={(tab) => setActiveTab(tab)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            CommerceOS • AI E-Commerce Operator (Multi-Tenant Engine, Connectors & Safe Execution)
          </span>
          <span className="text-slate-600 font-medium">
            «Пользователь говорит о результате — система сама разбирается в способе его достижения.»
          </span>
        </div>
      </footer>
    </div>
  );
}

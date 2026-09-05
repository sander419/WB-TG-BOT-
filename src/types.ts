export type MarketplaceType = 'wb' | 'ozon' | 'shopify' | '1688' | 'taobao' | 'jd' | 'pinduoduo' | 'temu' | 'all';

export type MarketRegion = 'china' | 'russia' | 'global' | 'all';

export interface Store {
  id: string;
  name: string;
  marketplace: MarketplaceType;
  organizationId: string;
  currency: string;
  connected: boolean;
  apiKeyMasked: string;
  productsCount: number;
  dailyRevenue: number;
  dailyOrders: number;
  activeAlerts: number;
  warehouseFbo: string;
  country?: string; // 'RU' | 'CN' | 'EU' | 'US'
  lastSyncedAt?: string;
}

export interface ChinaFactorySource {
  id: string;
  factoryName: string;
  city: string; // 'Guangzhou' | 'Yiwu' | 'Shenzhen' | 'Dongguan' | 'Hangzhou'
  platform: '1688' | 'taobao' | 'jd' | 'pinduoduo';
  factoryPriceCny: number;
  factoryPriceRub: number;
  moq: number; // Minimum Order Quantity
  landedCostRub: number; // Factory + Freight + Customs + Certification
  estimatedMarginPotential: number; // %
  verifiedSupplierRating: number; // e.g. 4.95
  yearsInBusiness: number;
  leadTimeDays: number;
  sampleAvailable: boolean;
  oemCustomization: boolean;
  productTitleCn: string;
  productTitleRu: string;
  imageUrl: string;
  factoryAreaSqMeters?: number;
  workersCount?: number;
  dailyProductionUnits?: number;
  defectRatePercent?: number;
  certifications?: string[];
  exportSharePercent?: number;
  wechatContactMasked?: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: string;
  membersCount: number;
}

export interface Product {
  id: string;
  storeId?: string;
  sku: string;
  marketplace: 'wb' | 'ozon' | 'shopify' | '1688' | 'taobao' | 'jd' | 'pinduoduo' | 'temu' | 'all';
  name: string;
  category: string;
  image: string;
  price: number;
  currency?: string; // '¥' | '₽' | '$' | '€'
  oldPrice?: number;
  competitorPrice: number;
  competitorName: string;
  costPrice: number;
  stockFbo: number;
  stockFbs: number;
  daysLeft: number;
  searchRank: number;
  searchRankDelta: number; // +2 or -7
  mainKeyword: string;
  keywordVolume: number;
  rating: number;
  reviewsCount: number;
  dailyOrders: number;
  dailyRevenue: number;
  drr: number; // Доля рекламных расходов, %
  margin: number; // %
  status: 'growing' | 'stable' | 'dropping' | 'low_stock';
  aiDiagnosis?: string;
  aiRecommendation?: string;
  suggestedPrice?: number;
  suggestedStock?: number;
  description?: string;
  contentHealth?: ContentHealthAudit;
  // China Market & Sourcing Specifics
  moq?: number;
  factoryCity?: string;
  leadTimeDays?: number;
  wechatSupplier?: string;
  productTitleCn?: string;
  landedCostRub?: number;
}

export interface KeywordAuditItem {
  keyword: string;
  searchVolume: number;
  density: string;
  inTitle: boolean;
  inDescription: boolean;
  relevance: 'HIGH' | 'MEDIUM' | 'LOW';
  cluster: 'ВЧ' | 'СЧ' | 'НЧ';
}

export interface MissingKeywordItem {
  keyword: string;
  estimatedVolume: number;
  potentialTrafficGain: string;
  reason: string;
}

export interface ImageSlideAudit {
  slideIndex: number;
  title: string;
  type: string;
  status: 'optimal' | 'warning' | 'missing';
  notes: string;
  previewUrl?: string;
}

export interface ContentHealthAudit {
  overallScore: number; // e.g. 74
  grade: 'optimal' | 'good' | 'needs_work' | 'critical';
  lastAuditedAt: string;
  
  keywordCoverage: {
    score: number; // 0-100
    status: 'good' | 'warning' | 'critical';
    titleKeywordsCount: number;
    descriptionKeywordsCount: number;
    primaryKeywordRank: number;
    coveredKeywords: KeywordAuditItem[];
    missingKeywords: MissingKeywordItem[];
    recommendation: string;
  };

  imageOptimization: {
    score: number; // 0-100
    status: 'good' | 'warning' | 'critical';
    totalSlides: number;
    recommendedSlides: number;
    hasInfographics: boolean;
    aspectRatio: string;
    aspectRatioValid: boolean;
    contrastScore: number; // 0-100
    mobileReadability: 'passed' | 'warning' | 'failed';
    slides: ImageSlideAudit[];
    recommendation: string;
  };

  descriptionLength: {
    score: number; // 0-100
    status: 'good' | 'warning' | 'critical';
    characterCount: number;
    recommendedMinChars: number;
    recommendedMaxChars: number;
    wordCount: number;
    keywordDensity: number; // % e.g. 1.3
    optimalDensityRange: string; // "2.2% — 2.8%"
    hasBulletPoints: boolean;
    hasUspSection: boolean;
    hasCareInstructions: boolean;
    sampleText: string;
    recommendation: string;
  };

  aiAutoFixProposal?: {
    optimizedTitle: string;
    optimizedDescription: string;
    newKeywordsAdded: string[];
    infographicBriefs: string[];
    projectedScore: number;
  };
}

export interface StoreAlert {
  id: string;
  storeId?: string;
  severity: 'critical' | 'warning' | 'opportunity' | 'info';
  title: string;
  description: string;
  timestamp: string;
  productId?: string;
  actionLabel: string;
  actionType: 'price_adjust' | 'restock' | 'seo_update' | 'ad_boost' | 'review_reply';
  resolved?: boolean;
}

export interface ActionCardData {
  type: 'price_adjust' | 'restock' | 'seo_copy' | 'ad_adjust' | 'launch_plan' | 'opportunity';
  title: string;
  description: string;
  buttonLabel: string;
  permissionLevel?: 'READ' | 'ANALYZE' | 'PREPARE' | 'WRITE' | 'HIGH_RISK';
  targetApi?: string;
  payload?: {
    productId?: string;
    productName?: string;
    oldPrice?: number;
    newPrice?: number;
    amount?: number;
    targetWarehouse?: string;
    keywords?: string[];
    reason?: string;
    drrLimit?: number;
    campaignId?: string;
  };
}

export interface FactItem {
  metric: string;
  value: string | number;
  period: string;
  source: string;
  synced_at: string;
}

export interface HypothesisItem {
  id: string;
  title: string;
  status: 'verified' | 'rejected' | 'primary' | 'investigating';
  delta: string;
  evidence: string;
}

export interface RecommendationItem {
  id: string;
  title: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  urgency: 'IMMEDIATE' | 'TODAY' | 'THIS_WEEK';
  confidence: number; // 0.0 - 1.0
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  priorityScore: number;
  actionCard?: ActionCardData;
}

export interface StructuredAiResponse {
  intent: string;
  summary: string;
  facts: FactItem[];
  hypotheses: HypothesisItem[];
  recommendations: RecommendationItem[];
  next_best_action?: ActionCardData;
  confidence: number;
  data_freshness: string;
  agentChain: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  normalizedIntent?: string;
  agentChain?: string[];
  actionCard?: ActionCardData;
  actionApplied?: boolean;
  structuredData?: Partial<StructuredAiResponse>;
  quickCommands?: Array<{ label: string; actionText: string }>;
}

export interface MarketplaceConfig {
  wbConnected: boolean;
  wbApiKey: string;
  ozonConnected: boolean;
  ozonClientId: string;
  ozonApiKey: string;
  shopifyConnected: boolean;
  shopifyStoreUrl: string;
  // China Marketplaces & Sourcing Core
  ali1688Connected: boolean;
  ali1688AppKey: string;
  ali1688AppSecret: string;
  taobaoConnected: boolean;
  taobaoAppKey: string;
  taobaoSessionKey: string;
  jdConnected: boolean;
  jdAppKey: string;
  jdAppSecret: string;
  pinduoduoConnected: boolean;
  pinduoduoClientId: string;
  cnyExchangeRate: number; // e.g. 13.45
  chinaFulfillmentHub: string;
  customsClearanceBroker: string;
  telegramConnected: boolean;
  telegramUsername: string;
  autoRepricing: boolean;
  morningDigestTime: string;
  demoMode?: boolean;
  activeScenario?: 'scenario_sales_drop' | 'scenario_stockout' | 'scenario_ad_waste' | 'scenario_high_growth';
}

export interface BusinessRule {
  id: string;
  storeId?: string;
  condition: string;
  action: string;
  description: string;
  enabled: boolean;
  category: 'inventory' | 'pricing' | 'advertising' | 'rank' | 'safety';
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  store: string;
  actor: 'AI Orchestrator' | 'Seller (Manual)' | 'Diagnostics Engine' | 'Auto-Workflow';
  action: string;
  permissionLevel: 'READ' | 'SUGGEST' | 'WRITE' | 'HIGH_RISK' | 'ANALYZE' | 'PREPARE';
  beforeVal: string;
  afterVal: string;
  reason: string;
  status: 'verified' | 'pending' | 'rejected';
  requiresApproval?: boolean;
  impactScore?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  diagnosticData?: {
    productId: string;
    productName: string;
    rankDrop: number;
    primaryRootCause: string;
    contributingDrivers: string[];
    lossEstimateDaily: number;
    recommendedRemedy: string;
  };
}

export interface DiagnosticFinding {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  previousRank: number;
  currentRank: number;
  rankDelta: number;
  dropPercentage: number;
  primaryRootCause: string;
  category: 'COMPETITOR_DUMPING' | 'STOCKOUT_RISK' | 'AD_INEFFICIENCY' | 'CONTENT_DEGRADATION' | 'RATING_DROP' | 'SEASONAL_SHIFT';
  contributingDrivers: string[];
  evidenceData: {
    priceDelta?: number;
    competitorPrice?: number;
    daysLeftStock?: number;
    adDrr?: number;
    ratingScore?: number;
  };
  recommendedAction: string;
  estimatedDailyLostRevenue: number;
  auditLogEntry: AuditLogItem;
}

export interface DiagnosticsEngineReport {
  timestamp: string;
  scannedProductsCount: number;
  anomaliesDetected: number;
  findings: DiagnosticFinding[];
  summaryNote: string;
}

export type OrchestratorEventType = 
  | 'TASK_INITIATED'
  | 'CONTEXT_LOADED'
  | 'RULES_EVALUATED'
  | 'LLM_REASONING_STEP'
  | 'CONNECTOR_DISPATCH'
  | 'CONNECTOR_RESPONSE'
  | 'CALCULATION_STEP'
  | 'GUARDRAIL_CHECK'
  | 'ACTION_PREPARED'
  | 'ACTION_COMMITTED'
  | 'TASK_COMPLETED'
  | 'CRITICAL_ERROR'
  | 'RETRY_ATTEMPT'
  | 'ANOMALY_DETECTED';

export type OrchestratorEventSeverity = 'info' | 'success' | 'warning' | 'error' | 'decision';

export interface OrchestratorEvent {
  id: string;
  timestamp: string;
  isoTime: string;
  taskId: string;
  taskName: string;
  stepNumber: number;
  totalSteps: number;
  type: OrchestratorEventType;
  severity: OrchestratorEventSeverity;
  sourceModule: 'Orchestrator Core' | 'Rule Engine' | 'Decision Brain' | '1688 Connector' | 'WB API v3' | 'Ozon Connector' | 'SCM & Logistics' | 'Safety Guardrails';
  title: string;
  details: string;
  executionMs: number;
  payload?: Record<string, any>;
  decisionPath?: {
    ruleId?: string;
    ruleName?: string;
    conditionPassed?: boolean;
    confidenceScore?: number;
    marginBefore?: number;
    marginAfter?: number;
    safetyChecks?: string[];
  };
  errorStack?: string;
}

export interface OpportunityItem {
  id: string;
  storeId: string;
  title: string;
  potentialImpact: string;
  description: string;
  type: 'stock_loss' | 'traffic_boost' | 'margin_expansion';
  productId?: string;
  actionTitle: string;
  payload?: any;
}

export interface ReviewCluster {
  id: string;
  category: string;
  percentage: number;
  sentiment: 'negative' | 'positive' | 'neutral';
  count: number;
  sampleQuotes: string[];
  suggestedAction: string;
}

export interface StoreHealthScore {
  overall: number; // e.g. 78
  status: 'optimal' | 'stable' | 'attention_needed' | 'critical';
  metrics: {
    salesTrend: { score: number; label: string; trend: 'up' | 'down' | 'flat'; note: string };
    profitability: { score: number; label: string; trend: 'up' | 'down' | 'flat'; note: string };
    adEfficiency: { score: number; label: string; trend: 'up' | 'down' | 'flat'; note: string };
    inventoryHealth: { score: number; label: string; trend: 'up' | 'down' | 'flat'; note: string };
    searchVisibility: { score: number; label: string; trend: 'up' | 'down' | 'flat'; note: string };
    customerReputation: { score: number; label: string; trend: 'up' | 'down' | 'flat'; note: string };
  };
  positives: string[];
  negatives: string[];
}

export interface SeoAuditResult {
  overallScore: number; // 72 / 100
  titleAudit: { score: number; status: 'good' | 'warning' | 'error'; message: string };
  descriptionAudit: { score: number; status: 'good' | 'warning' | 'error'; message: string };
  characteristicsAudit: { score: number; status: 'good' | 'warning' | 'error'; message: string };
  imagesAudit: { score: number; status: 'good' | 'warning' | 'error'; message: string };
  keywordsFound: Array<{ term: string; volume: number; relevance: 'HIGH' | 'MEDIUM' | 'LOW'; rank: number }>;
  missingHighValueTerms: Array<{ term: string; estimatedVolume: number; reason: string }>;
  recommendedTitle: string;
  recommendedDescription: string;
}

export interface DailySalesRecord {
  date: string; // e.g. "05.08" or "2026-08-05"
  dayLabel: string; // e.g. "5 авг"
  fullDate: string; // e.g. "5 августа 2026"
  revenue: number; // daily revenue in store currency
  orders: number; // count of orders
  units: number; // items sold
  profit: number; // net profit in store currency
  adSpend: number; // advertising spend
  drr: number; // advertising spend / revenue %
  growthVsAvg: number; // % relative to 30d rolling average
  isPeak?: boolean;
}

export interface CompetitorBenchmarkItem {
  id: string;
  rank: number; // 1, 2, 3
  sku: string;
  name: string;
  brand: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviewsCount: number;
  deliverySpeed: string; // e.g. "Завтра (1 день, Коледино FBO)"
  deliveryDays: number;
  warehouse: string;
  isSponsored?: boolean;
  dailyRevenue: number;
  dailyOrders: number;
  strengths: string[];
  weaknesses: string[];
}

export interface CompetitorBenchmarkReport {
  productId: string;
  productName: string;
  searchQuery: string;
  searchVolume: number;
  ourProduct: {
    sku: string;
    name: string;
    price: number;
    rating: number;
    reviewsCount: number;
    deliverySpeed: string;
    deliveryDays: number;
    searchRank: number;
    warehouse: string;
    dailyOrders: number;
    dailyRevenue: number;
  };
  topCompetitors: CompetitorBenchmarkItem[]; // Top 3
  metricsSummary: {
    priceComparison: { ourPrice: number; topCompetitorPrice: number; diff: number; diffPercent: number; position: 'cheaper' | 'more_expensive' | 'equal' };
    ratingComparison: { ourRating: number; avgTopRating: number; diff: number; status: 'higher' | 'lower' | 'equal' };
    reviewsComparison: { ourReviews: number; avgTopReviews: number; gap: number };
    deliveryComparison: { ourDays: number; topCompetitorDays: number; status: 'faster' | 'slower' | 'equal' };
  };
  aiAnalysis: {
    verdict: string;
    keyRisk: string;
    growthOpportunity: string;
    actionSteps: Array<{ title: string; desc: string; buttonLabel?: string; actionType?: 'price' | 'restock' | 'seo' | 'ask_ai'; payload?: any }>;
  };
}

export interface CompetitorPriceShift {
  previousPrice: number;
  currentPrice: number;
  deltaRub: number;
  deltaPercent: number;
  direction: 'down' | 'up' | 'stable';
  changedAt: string; // e.g. "45 мин назад"
  isCriticalDumping: boolean;
  promoTag?: string; // e.g. "Акция Хиты WB -20%"
}

export interface CompetitorRatingShift {
  previousRating: number;
  currentRating: number;
  ratingDelta: number; // e.g. +0.2
  previousReviews: number;
  currentReviews: number;
  reviewsDelta: number; // e.g. +45
  growthTrend: 'surging' | 'steady' | 'negative';
}

export interface CompetitorIntelItem {
  id: string;
  rank: number; // 1, 2, 3
  sku: string;
  brand: string;
  title: string;
  marketplace: 'wb' | 'ozon' | 'shopify' | string;
  priceShift: CompetitorPriceShift;
  ratingShift: CompetitorRatingShift;
  deliverySpeed: string;
  warehouse: string;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  threatLevel: 'critical' | 'warning' | 'neutral' | 'opportunity';
  threatScore: number; // 0-100
  keyThreatReason: string;
  counterStrategy: string;
  suggestedActionPrice: number;
}

export interface CompetitorIntelRecord {
  productId: string;
  productName: string;
  productSku: string;
  productMarketplace: 'wb' | 'ozon' | 'shopify' | 'all' | string;
  ourPrice: number;
  ourRating: number;
  ourReviewsCount: number;
  costPrice: number;
  minSafePrice: number;
  maxDumpingCompetitor: CompetitorIntelItem;
  topCompetitors: CompetitorIntelItem[]; // Exactly 3 main competitors
  isCriticalDumpingAlert: boolean;
  dumpingSeverity: 'critical' | 'warning' | 'moderate' | 'safe';
  priceGapToLeaderRub: number;
  priceGapToLeaderPercent: number;
  estimatedWeeklyRevenueLoss: number;
  projectedRankDrop: { from: number; to: number };
  aiCounterRecommendation: string;
  lastUpdated: string;
}

export interface CompetitorEventLog {
  id: string;
  productId: string;
  productName: string;
  competitorBrand: string;
  competitorSku: string;
  eventType: 'price_drop' | 'price_hike' | 'rating_surge' | 'stock_drop' | 'promo_join';
  severity: 'critical' | 'warning' | 'info';
  headline: string;
  detail: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    actionType: 'price_match' | 'protect_margin' | 'ask_ai';
    newPrice?: number;
  };
}

export interface CompetitorIntelSummary {
  totalTrackedProducts: number;
  totalCompetitorsTracked: number;
  criticalDumpingCount: number;
  warningDumpingCount: number;
  safeCount: number;
  totalAtRiskRevenue: number;
  avgCompetitorDiscountPercent: number;
  mostAggressiveCompetitor: string;
}



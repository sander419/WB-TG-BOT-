import { Product, Store, AuditLogItem, DiagnosticFinding, DiagnosticsEngineReport } from '../types';

/**
 * Diagnostics Engine for CommerceOS
 * 
 * Automatically identifies root causes of sales drops whenever sharp rank
 * fluctuations or traffic anomalies are detected for a product, and emits
 * verified audit log entries with concrete operational remedies.
 */

export function analyzeProductPositionDrop(
  product: Product,
  currentStore: Store
): DiagnosticFinding | null {
  const rankDelta = product.searchRankDelta;
  // Trigger on noticeable position degradation (e.g. dropped by 3+ positions or rank > 15)
  if (rankDelta >= -2 && product.status !== 'dropping') {
    return null;
  }

  const currentRank = product.searchRank;
  const previousRank = Math.max(1, currentRank - rankDelta); // if delta is -19, prev was 26 - (-19) = 7
  const dropPercentage = Math.round((Math.abs(rankDelta) / previousRank) * 100);

  const priceDiff = product.price - product.competitorPrice;
  const hasCompetitorDumping = priceDiff > 70;
  const hasStockoutRisk = product.daysLeft <= 5 || product.stockFbo <= 25;
  const hasHighDrr = product.drr >= 12.0;
  const hasLowRating = product.rating < 4.7;

  let primaryRootCause = '';
  let category: DiagnosticFinding['category'] = 'COMPETITOR_DUMPING';
  let severity: DiagnosticFinding['severity'] = Math.abs(rankDelta) >= 10 ? 'CRITICAL' : 'HIGH';
  const contributingDrivers: string[] = [];
  let recommendedAction = '';

  // 1. Check Primary Root Cause: Competitor Price Pressure & Undercutting
  if (hasCompetitorDumping) {
    category = 'COMPETITOR_DUMPING';
    primaryRootCause = `Демпинг ключевого конкурента «${product.competitorName}» (разница в цене -${priceDiff.toLocaleString('ru-RU')} ${currentStore.currency}). Покупатели переходят к конкуренту, что обрушило конверсию карточки (CR) и привело к пессимизации в выдаче.`;
    contributingDrivers.push(`Цена конкурента ${product.competitorPrice.toLocaleString('ru-RU')} ${currentStore.currency} ниже нашей на ${priceDiff.toLocaleString('ru-RU')} ${currentStore.currency}`);
    recommendedAction = `Выровнять цену до ${product.competitorPrice.toLocaleString('ru-RU')} ${currentStore.currency} через Competitor Repricer или запустить целевую скидку 10% с акцией маркетплейса.`;
  } 
  // 2. Check Primary Root Cause: Warehouse FBO Depletion
  else if (hasStockoutRisk) {
    category = 'STOCKOUT_RISK';
    primaryRootCause = `Критический остаток на складе ${currentStore.warehouseFbo} (${product.stockFbo} шт, запас на ${product.daysLeft} дн.). Алгоритмы маркетплейса снижают позиции товаров с высоким риском обнуления.`;
    contributingDrivers.push(`Остаток FBO: всего ${product.stockFbo} шт при скорости продаж ${product.dailyOrders} шт/день`);
    recommendedAction = `Сформировать и забронировать срочную поставку FBO на ${Math.max(100, product.dailyOrders * 20)} шт для восстановления складского запаса.`;
  }
  // 3. Check Primary Root Cause: Ad Waste & Low CTR
  else if (hasHighDrr) {
    category = 'AD_INEFFICIENCY';
    primaryRootCause = `Неэффективная автореклама (ДРР ${product.drr}% при норме 10%). Мусорные поисковые фразы снижают общий CTR карточки.`;
    contributingDrivers.push(`ДРР ${product.drr}% превышает целевой порог, снижая маржинальность`);
    recommendedAction = `Исключить нерелевантные минус-фразы из кампании АРК и повысить ставку на целевой кластер «${product.mainKeyword}».`;
  }
  // 4. Default: Organic rank & SEO shift
  else {
    category = 'CONTENT_DEGRADATION';
    primaryRootCause = `Смещение в поисковой выдаче по запросу «${product.mainKeyword}» (частотность ${product.keywordVolume.toLocaleString('ru-RU')}/мес) из-за роста активности конкурентов в категории.`;
    contributingDrivers.push(`Основной ключ «${product.mainKeyword}» потерял позиции с #${previousRank} до #${currentRank}`);
    recommendedAction = `Провести автоматический аудит Content Health и оптимизировать поисковые кластеры в заголовке и описании.`;
  }

  // Collect secondary contributing drivers
  if (hasStockoutRisk && category !== 'STOCKOUT_RISK') {
    contributingDrivers.push(`Дополнительный фактор: низкий остаток (${product.stockFbo} шт, ${product.daysLeft} дн. до out-of-stock)`);
  }
  if (hasHighDrr && category !== 'AD_INEFFICIENCY') {
    contributingDrivers.push(`Дополнительный фактор: повышенный ДРР рекламы (${product.drr}%)`);
  }
  if (hasLowRating) {
    contributingDrivers.push(`Дополнительный фактор: рейтинг ${product.rating}★ с недавними отзывами`);
  }

  // Estimate daily lost revenue due to rank drop
  const baselineDailyRev = product.dailyRevenue || (product.price * product.dailyOrders);
  const lostFraction = Math.min(0.75, (Math.abs(rankDelta) / Math.max(10, currentRank)) * 0.5 + 0.15);
  const estimatedDailyLostRevenue = Math.round(baselineDailyRev * lostFraction);

  const now = new Date();
  const timeStr = `Сегодня, ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;

  const auditLogEntry: AuditLogItem = {
    id: `diag-audit-${Date.now()}-${product.id}`,
    timestamp: timeStr,
    store: currentStore.name,
    actor: 'Diagnostics Engine',
    action: `Авто-диагностика падения: «${product.name.slice(0, 32)}...»`,
    permissionLevel: 'ANALYZE',
    beforeVal: `Позиция #${previousRank}`,
    afterVal: `Позиция #${currentRank} (${rankDelta})`,
    reason: `Причина: ${primaryRootCause.slice(0, 120)}... Потери: ~${estimatedDailyLostRevenue.toLocaleString('ru-RU')} ${currentStore.currency}/день. Решение: ${recommendedAction.slice(0, 80)}...`,
    status: 'verified',
    diagnosticData: {
      productId: product.id,
      productName: product.name,
      rankDrop: rankDelta,
      primaryRootCause,
      contributingDrivers,
      lossEstimateDaily: estimatedDailyLostRevenue,
      recommendedRemedy: recommendedAction,
    },
  };

  return {
    id: `diag-${Date.now()}-${product.id}`,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    severity,
    previousRank,
    currentRank,
    rankDelta,
    dropPercentage,
    primaryRootCause,
    category,
    contributingDrivers,
    evidenceData: {
      priceDelta: priceDiff,
      competitorPrice: product.competitorPrice,
      daysLeftStock: product.daysLeft,
      adDrr: product.drr,
      ratingScore: product.rating,
    },
    recommendedAction,
    estimatedDailyLostRevenue,
    auditLogEntry,
  };
}

/**
 * Runs full Diagnostics Engine check across all catalog products for a store.
 */
export function runDiagnosticsEngine(
  products: Product[],
  currentStore: Store
): DiagnosticsEngineReport {
  const findings: DiagnosticFinding[] = [];

  for (const product of products) {
    const finding = analyzeProductPositionDrop(product, currentStore);
    if (finding) {
      findings.push(finding);
    }
  }

  const now = new Date();
  const timestamp = `Сегодня, ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  
  const totalLostEst = findings.reduce((sum, f) => sum + f.estimatedDailyLostRevenue, 0);

  const summaryNote = findings.length > 0
    ? `Обнаружено ${findings.length} аномалий падения позиций. Суммарная упущенная выручка оценивается в ~${totalLostEst.toLocaleString('ru-RU')} ${currentStore.currency}/день. Все причины зафиксированы в журнале аудита.`
    : `Все позиции каталога стабильны. Аномальных падений не зафиксировано.`;

  return {
    timestamp,
    scannedProductsCount: products.length,
    anomaliesDetected: findings.length,
    findings,
    summaryNote,
  };
}

/**
 * Triggers a real-time position change test and runs the Diagnostics Engine on the product,
 * producing immediate verified diagnostic entries in the audit trail.
 */
export function triggerRankShiftSimulation(
  product: Product,
  newRank: number,
  currentStore: Store
): { updatedProduct: Product; finding: DiagnosticFinding } {
  const oldRank = product.searchRank;
  const delta = -(newRank - oldRank); // if was #7 and became #26, delta is -19

  const updatedProduct: Product = {
    ...product,
    searchRank: newRank,
    searchRankDelta: delta,
    status: delta <= -3 ? 'dropping' : product.status,
  };

  const finding = analyzeProductPositionDrop(updatedProduct, currentStore);

  if (!finding) {
    // Fallback finding if delta is small
    const now = new Date();
    const timeStr = `Сегодня, ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    const fallbackAudit: AuditLogItem = {
      id: `diag-audit-${Date.now()}-${product.id}`,
      timestamp: timeStr,
      store: currentStore.name,
      actor: 'Diagnostics Engine',
      action: `Проверка позиций: «${product.name.slice(0, 30)}»`,
      permissionLevel: 'ANALYZE',
      beforeVal: `Позиция #${oldRank}`,
      afterVal: `Позиция #${newRank}`,
      reason: `Позиция скорректирована. Отклонений выше критического порога не выявлено.`,
      status: 'verified',
    };

    return {
      updatedProduct,
      finding: {
        id: `diag-${Date.now()}-${product.id}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        severity: 'MEDIUM',
        previousRank: oldRank,
        currentRank: newRank,
        rankDelta: delta,
        dropPercentage: Math.round((Math.abs(delta) / oldRank) * 100),
        primaryRootCause: `Плановое изменение поисковой позиции товара.`,
        category: 'SEASONAL_SHIFT',
        contributingDrivers: [`Позиция изменилась с #${oldRank} на #${newRank}`],
        evidenceData: {},
        recommendedAction: `Продолжить мониторинг конверсии и позиций в течение 24 часов.`,
        estimatedDailyLostRevenue: 0,
        auditLogEntry: fallbackAudit,
      },
    };
  }

  return {
    updatedProduct,
    finding,
  };
}

import { 
  Product, 
  CompetitorIntelRecord, 
  CompetitorIntelItem, 
  CompetitorEventLog, 
  CompetitorIntelSummary 
} from '../types';

export function getCompetitorIntelForProduct(
  product: Product,
  criticalThresholdPercent: number = 12
): CompetitorIntelRecord {
  const isWb = product.marketplace === 'wb';
  const basePrice = product.price;
  const cost = product.costPrice || Math.round(basePrice * 0.38);
  const minSafePrice = Math.round(cost * 1.32); // minimum price for 24% safe margin

  // Competitor 1 (Direct rival / Price Leader)
  const isProd7 = product.id === 'prod-7';
  const isProd1 = product.id === 'prod-1';
  const isProd2 = product.id === 'prod-2';

  // Seed realistic dynamic prices & previous prices
  let comp1CurrentPrice = product.competitorPrice || Math.round(basePrice * 0.88);
  let comp1PrevPrice = Math.round(comp1CurrentPrice * 1.16);
  let comp1Promo = 'Вход в акцию «Хиты WB» (-15%)';
  let comp1ChangedAt = '25 мин назад';

  if (isProd7) {
    comp1CurrentPrice = 1890;
    comp1PrevPrice = 2490;
    comp1Promo = 'Агрессивный демпинг (-600 ₽, СПП 28%)';
    comp1ChangedAt = '15 мин назад';
  } else if (isProd1) {
    comp1CurrentPrice = 2390;
    comp1PrevPrice = 2690;
    comp1Promo = 'Скидка дня (-300 ₽)';
    comp1ChangedAt = '1 час назад';
  } else if (isProd2) {
    comp1CurrentPrice = 1750;
    comp1PrevPrice = 2100;
    comp1Promo = 'Распродажа остатков FBO';
    comp1ChangedAt = '40 мин назад';
  }

  // Competitor 2
  const comp2CurrentPrice = Math.round(basePrice * 0.94);
  const comp2PrevPrice = Math.round(comp2CurrentPrice * 1.05);

  // Competitor 3
  const comp3CurrentPrice = Math.round(basePrice * 1.06);
  const comp3PrevPrice = Math.round(comp3CurrentPrice * 0.98);

  // Price deltas
  const comp1DeltaRub = comp1CurrentPrice - comp1PrevPrice;
  const comp1DeltaPercent = Math.round((comp1DeltaRub / comp1PrevPrice) * 100);

  const comp2DeltaRub = comp2CurrentPrice - comp2PrevPrice;
  const comp2DeltaPercent = Math.round((comp2DeltaRub / comp2PrevPrice) * 100);

  const comp3DeltaRub = comp3CurrentPrice - comp3PrevPrice;
  const comp3DeltaPercent = Math.round((comp3DeltaRub / comp3PrevPrice) * 100);

  // Rating deltas
  const comp1CurrentRating = isProd7 ? 4.9 : 4.8;
  const comp1PrevRating = isProd7 ? 4.8 : 4.7;
  const comp1Reviews = product.reviewsCount > 500 ? Math.round(product.reviewsCount * 2.2) : 1540;
  const comp1ReviewsDelta = +38;

  const comp2CurrentRating = 4.7;
  const comp2PrevRating = 4.7;
  const comp2Reviews = Math.round(comp1Reviews * 0.62);
  const comp2ReviewsDelta = +12;

  const comp3CurrentRating = 4.9;
  const comp3PrevRating = 4.9;
  const comp3Reviews = Math.round(comp1Reviews * 1.7);
  const comp3ReviewsDelta = +22;

  // Compute threat score & dumping detection for Comp 1
  const priceGapToLeaderRub = basePrice - comp1CurrentPrice;
  const priceGapToLeaderPercent = Math.round((priceGapToLeaderRub / basePrice) * 100);

  const isCriticalDumping = priceGapToLeaderPercent >= criticalThresholdPercent || comp1CurrentPrice < (cost + 150);

  const threatLevel1 = isCriticalDumping ? 'critical' : priceGapToLeaderPercent >= 5 ? 'warning' : 'neutral';
  const threatScore1 = isCriticalDumping ? 94 : priceGapToLeaderPercent >= 5 ? 68 : 35;

  const comp1: CompetitorIntelItem = {
    id: `${product.id}-intel-1`,
    rank: 1,
    sku: isWb ? `WB-${product.sku.replace(/[^0-9]/g, '') || '9182391'}` : `OZ-8829104`,
    brand: product.competitorName || 'UrbanLeader Official',
    title: `${product.name.split(' ').slice(0, 3).join(' ')} Pro Active`,
    marketplace: isWb ? 'wb' : 'ozon',
    priceShift: {
      previousPrice: comp1PrevPrice,
      currentPrice: comp1CurrentPrice,
      deltaRub: comp1DeltaRub,
      deltaPercent: comp1DeltaPercent,
      direction: comp1DeltaRub < 0 ? 'down' : comp1DeltaRub > 0 ? 'up' : 'stable',
      changedAt: comp1ChangedAt,
      isCriticalDumping: isCriticalDumping,
      promoTag: comp1Promo,
    },
    ratingShift: {
      previousRating: comp1PrevRating,
      currentRating: comp1CurrentRating,
      ratingDelta: Number((comp1CurrentRating - comp1PrevRating).toFixed(1)),
      previousReviews: comp1Reviews - comp1ReviewsDelta,
      currentReviews: comp1Reviews,
      reviewsDelta: comp1ReviewsDelta,
      growthTrend: 'surging',
    },
    deliverySpeed: 'Завтра (1 день, FBO Коледино)',
    warehouse: isWb ? 'Коледино (WB)' : 'Хоругвино (Ozon)',
    stockStatus: 'in_stock',
    threatLevel: threatLevel1,
    threatScore: threatScore1,
    keyThreatReason: isCriticalDumping 
      ? `Демпинг -${priceGapToLeaderPercent}% (${priceGapToLeaderRub} ₽) при высоком рейтинге ${comp1CurrentRating} ★ перетягивает до 45% органического трафика`
      : `Конкурент удерживает цену на ${priceGapToLeaderRub} ₽ ниже нашей`,
    counterStrategy: `Снизить цену до ${Math.max(minSafePrice, comp1CurrentPrice)} ₽ с сохранением маржи ${Math.round(((Math.max(minSafePrice, comp1CurrentPrice) - cost) / Math.max(minSafePrice, comp1CurrentPrice)) * 100)}% и подключить АРК`,
    suggestedActionPrice: Math.max(minSafePrice, comp1CurrentPrice),
  };

  const comp2: CompetitorIntelItem = {
    id: `${product.id}-intel-2`,
    rank: 2,
    sku: isWb ? `WB-${parseInt(product.sku.replace(/[^0-9]/g, '') || '772192', 10) + 1100}` : `OZ-7719201`,
    brand: 'TopStyle Prime',
    title: `${product.name.split(' ').slice(0, 3).join(' ')} Trend Comfort`,
    marketplace: isWb ? 'wb' : 'ozon',
    priceShift: {
      previousPrice: comp2PrevPrice,
      currentPrice: comp2CurrentPrice,
      deltaRub: comp2DeltaRub,
      deltaPercent: comp2DeltaPercent,
      direction: comp2DeltaRub < 0 ? 'down' : 'stable',
      changedAt: '2 часа назад',
      isCriticalDumping: false,
      promoTag: 'Базовый СПП 21%',
    },
    ratingShift: {
      previousRating: comp2PrevRating,
      currentRating: comp2CurrentRating,
      ratingDelta: 0.0,
      previousReviews: comp2Reviews - comp2ReviewsDelta,
      currentReviews: comp2Reviews,
      reviewsDelta: comp2ReviewsDelta,
      growthTrend: 'steady',
    },
    deliverySpeed: 'Завтра (1 день, FBO Подольск)',
    warehouse: isWb ? 'Подольск (WB)' : 'Тверь (Ozon)',
    stockStatus: 'in_stock',
    threatLevel: basePrice > comp2CurrentPrice ? 'warning' : 'neutral',
    threatScore: 58,
    keyThreatReason: 'Стабильные позиции в ТОП-2 за счет агрессивной рекламы в поиске (АРК ставка 340 ₽/1000)',
    counterStrategy: 'Оптимизировать SEO-кластеры и усилить ставку авторекламы в вечерние пики',
    suggestedActionPrice: comp2CurrentPrice,
  };

  const comp3: CompetitorIntelItem = {
    id: `${product.id}-intel-3`,
    rank: 3,
    sku: isWb ? `WB-${parseInt(product.sku.replace(/[^0-9]/g, '') || '661829', 10) + 2400}` : `OZ-6638192`,
    brand: 'Nordic Studio Home',
    title: `${product.name.split(' ').slice(0, 3).join(' ')} Eco Classic`,
    marketplace: isWb ? 'wb' : 'ozon',
    priceShift: {
      previousPrice: comp3PrevPrice,
      currentPrice: comp3CurrentPrice,
      deltaRub: comp3DeltaRub,
      deltaPercent: comp3DeltaPercent,
      direction: comp3DeltaRub > 0 ? 'up' : 'stable',
      changedAt: 'Вчера в 18:30',
      isCriticalDumping: false,
      promoTag: 'Ограниченный тираж',
    },
    ratingShift: {
      previousRating: comp3PrevRating,
      currentRating: comp3CurrentRating,
      ratingDelta: 0.0,
      previousReviews: comp3Reviews - comp3ReviewsDelta,
      currentReviews: comp3Reviews,
      reviewsDelta: comp3ReviewsDelta,
      growthTrend: 'steady',
    },
    deliverySpeed: '2 дня (FBO Казань)',
    warehouse: isWb ? 'Казань (WB)' : 'Казань (Ozon)',
    stockStatus: 'in_stock',
    threatLevel: 'opportunity',
    threatScore: 28,
    keyThreatReason: `Цена выше нашей на ${comp3CurrentPrice - basePrice} ₽, доставка 2 дня (мы выигрываем по скорости)`,
    counterStrategy: 'Удерживать преимущество в скорости FBO и позиционировать товар как лучшее соотношение цена/качество',
    suggestedActionPrice: basePrice,
  };

  const estimatedWeeklyLoss = isCriticalDumping ? Math.round(product.dailyRevenue * 7 * 0.35) : priceGapToLeaderRub > 0 ? Math.round(product.dailyRevenue * 7 * 0.12) : 0;

  return {
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    productMarketplace: product.marketplace,
    ourPrice: basePrice,
    ourRating: product.rating,
    ourReviewsCount: product.reviewsCount,
    costPrice: cost,
    minSafePrice: minSafePrice,
    maxDumpingCompetitor: comp1,
    topCompetitors: [comp1, comp2, comp3],
    isCriticalDumpingAlert: isCriticalDumping,
    dumpingSeverity: isCriticalDumping ? 'critical' : priceGapToLeaderPercent >= 6 ? 'warning' : priceGapToLeaderPercent > 0 ? 'moderate' : 'safe',
    priceGapToLeaderRub: priceGapToLeaderRub,
    priceGapToLeaderPercent: priceGapToLeaderPercent,
    estimatedWeeklyRevenueLoss: estimatedWeeklyLoss,
    projectedRankDrop: {
      from: product.searchRank,
      to: isCriticalDumping ? Math.min(50, product.searchRank + 8) : product.searchRank
    },
    aiCounterRecommendation: isCriticalDumping 
      ? `Критический демпинг со стороны ${comp1.brand} (-${priceGapToLeaderPercent}%). Рекомендуется установить цену ${comp1.suggestedActionPrice} ₽ с контролем минимальной маржи ${minSafePrice} ₽, либо запустить промо-комбо с подарком.`
      : `Ценовое давление умеренное. Текущая цена ${basePrice} ₽ обеспечивает маржинальность ${product.margin}%. Рекомендуется мониторинг утренних торгов.`,
    lastUpdated: 'Только что (Live-синхронизация)',
  };
}

export function getAllCompetitorIntelRecords(
  products: Product[],
  criticalThresholdPercent: number = 12
): CompetitorIntelRecord[] {
  return products.map(p => getCompetitorIntelForProduct(p, criticalThresholdPercent));
}

export function getCompetitorIntelSummary(
  records: CompetitorIntelRecord[]
): CompetitorIntelSummary {
  const criticalCount = records.filter(r => r.dumpingSeverity === 'critical').length;
  const warningCount = records.filter(r => r.dumpingSeverity === 'warning').length;
  const safeCount = records.length - criticalCount - warningCount;
  const totalLoss = records.reduce((sum, r) => sum + r.estimatedWeeklyRevenueLoss, 0);

  const discounts = records
    .map(r => r.maxDumpingCompetitor.priceShift.deltaPercent)
    .filter(d => d < 0);
  const avgDiscount = discounts.length > 0 
    ? Math.round(Math.abs(discounts.reduce((a, b) => a + b, 0) / discounts.length)) 
    : 14;

  const aggressiveBrand = records.find(r => r.dumpingSeverity === 'critical')?.maxDumpingCompetitor.brand || 'UrbanLeader Official';

  return {
    totalTrackedProducts: records.length,
    totalCompetitorsTracked: records.length * 3,
    criticalDumpingCount: criticalCount,
    warningDumpingCount: warningCount,
    safeCount: safeCount,
    totalAtRiskRevenue: totalLoss,
    avgCompetitorDiscountPercent: avgDiscount,
    mostAggressiveCompetitor: aggressiveBrand,
  };
}

export function getCompetitorLiveEvents(products: Product[]): CompetitorEventLog[] {
  const events: CompetitorEventLog[] = [];

  products.forEach((p, idx) => {
    const intel = getCompetitorIntelForProduct(p);
    const comp1 = intel.topCompetitors[0];
    const comp2 = intel.topCompetitors[1];

    if (intel.isCriticalDumpingAlert) {
      events.push({
        id: `ev-crit-${p.id}`,
        productId: p.id,
        productName: p.name,
        competitorBrand: comp1.brand,
        competitorSku: comp1.sku,
        eventType: 'price_drop',
        severity: 'critical',
        headline: `🚨 Критический демпинг: ${comp1.brand} снизил цену до ${comp1.priceShift.currentPrice} ₽ (-${Math.abs(comp1.priceShift.deltaPercent)}%)`,
        detail: `Товар «${p.name.slice(0, 32)}...» рискует потерять поисковый ранг #${p.searchRank} → #${intel.projectedRankDrop.to}. Разрыв в цене: -${intel.priceGapToLeaderRub} ₽.`,
        timestamp: comp1.priceShift.changedAt,
        suggestedAction: {
          label: `Выровнять цену до ${comp1.suggestedActionPrice} ₽`,
          actionType: 'price_match',
          newPrice: comp1.suggestedActionPrice,
        }
      });
    }

    if (idx % 2 === 0 && comp1.ratingShift.ratingDelta > 0) {
      events.push({
        id: `ev-rating-${p.id}`,
        productId: p.id,
        productName: p.name,
        competitorBrand: comp1.brand,
        competitorSku: comp1.sku,
        eventType: 'rating_surge',
        severity: 'warning',
        headline: `⭐ Рост рейтинга у ${comp1.brand}: ${comp1.ratingShift.previousRating} → ${comp1.ratingShift.currentRating} ★ (+${comp1.ratingShift.reviewsDelta} отзывов)`,
        detail: `Конкурент наращивает органический социальный вес карточки по запросу «${p.mainKeyword}».`,
        timestamp: '1 час назад',
        suggestedAction: {
          label: 'Сгенерировать AI-ответы на отзывы',
          actionType: 'ask_ai',
        }
      });
    }

    if (idx === 1 && comp2) {
      events.push({
        id: `ev-promo-${p.id}`,
        productId: p.id,
        productName: p.name,
        competitorBrand: comp2.brand,
        competitorSku: comp2.sku,
        eventType: 'promo_join',
        severity: 'info',
        headline: `🏷️ ${comp2.brand} подключился к акции «Хиты Маркетплейса»`,
        detail: `Установлена промо-скидка с компенсацией СПП от площадки. Текущая цена: ${comp2.priceShift.currentPrice} ₽.`,
        timestamp: '3 часа назад',
      });
    }
  });

  return events.sort((a, b) => (a.severity === 'critical' ? -1 : 1));
}

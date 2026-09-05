/**
 * Детерминированная диагностика просадки продаж.
 *
 * Отвечает на вопрос «почему упало» кодом, а не языковой моделью. Модель
 * пересказывает вывод продавцу; придумывать причины ей нельзя — она делает это
 * убедительно и неверно.
 *
 * Каждая гипотеза проверяется по данным, которые у нас есть, и несёт с собой
 * доказательство и оценку вклада в падение выручки. Гипотезы, которые проверить
 * нечем (позиции в поиске, ставки конкурентов), не выдумываются, а попадают
 * в список `unavailable` — так видно, чего не хватает.
 */
import { money, type Money } from '../core/money';
import { isRevenue, percentDelta, skuMovements, type OrderFact, type StockCoverage } from './metrics';

export interface ReviewFact {
  externalId: string;
  productExternalId: string;
  sellerSku: string | null;
  rating: number;
  createdAt: Date;
  answered: boolean;
}

export type DiagnosisCode =
  | 'stockout'
  | 'price_up'
  | 'negative_reviews'
  | 'cancellations'
  | 'demand'
  | 'systemic';

export interface DiagnosticFinding {
  code: DiagnosisCode;
  sellerSku?: string;
  /** Вклад в изменение выручки, минорные единицы. Отрицательный — просадка. */
  revenueImpact: Money;
  /** 0..1. Числа фиксированные и объяснимые, а не подобранные «на глаз». */
  confidence: number;
  /** Числа для подстановки в текст: остаток, дни, проценты. */
  evidence: Record<string, string | number>;
}

export interface DiagnosisReport {
  hasDrop: boolean;
  revenueDelta: Money;
  revenueDeltaPercent: number | null;
  /** Просадка сидит в паре товаров или размазана по всему магазину. */
  breadth: 'none' | 'concentrated' | 'spread';
  findings: DiagnosticFinding[];
  /** Гипотезы, которые нечем проверить: нет источника данных. */
  unavailable: string[];
}

export interface DiagnosisInput {
  current: OrderFact[];
  previous: OrderFact[];
  coverage: StockCoverage[];
  /** Отзывы, созданные в текущем периоде. */
  reviews: ReviewFact[];
  currency: string;
  /** Есть ли синхронизация позиций в поиске. Пока нет — гипотеза недоступна. */
  hasSearchPositions?: boolean;
  /** Есть ли данные по ценам конкурентов. */
  hasCompetitorPrices?: boolean;
}

/** Падение меньше этого не считаем просадкой: обычный дневной шум. */
const DROP_THRESHOLD_PERCENT = -10;
/** Товар считаем виновником, если он забрал хотя бы столько процентов падения. */
const CONTRIBUTION_THRESHOLD = 0.15;
/** Рост средней цены продажи, начиная с которого он мог сбить конверсию. */
const PRICE_UP_THRESHOLD_PERCENT = 5;
const LOW_RATING = 2;

/** Средняя фактическая цена продажи по артикулу. Не цена в карточке — та, что заплатили. */
function averagePriceBySku(lines: OrderFact[]): Map<string, number> {
  const totals = new Map<string, { revenue: number; units: number }>();

  for (const line of lines) {
    if (!isRevenue(line)) continue;
    const current = totals.get(line.sellerSku) ?? { revenue: 0, units: 0 };
    current.revenue += line.totalMinor;
    current.units += line.quantity;
    totals.set(line.sellerSku, current);
  }

  const result = new Map<string, number>();
  for (const [sku, total] of totals) {
    if (total.units > 0) result.set(sku, total.revenue / total.units);
  }
  return result;
}

function cancellationRate(lines: OrderFact[]): number {
  if (lines.length === 0) return 0;
  const cancelled = lines.filter((line) => !isRevenue(line)).length;
  return cancelled / lines.length;
}

export function diagnoseSalesDrop(input: DiagnosisInput): DiagnosisReport {
  const { current, previous, coverage, reviews, currency } = input;

  const movements = skuMovements(current, previous, currency);
  const currentRevenue = movements.reduce((sum, item) => sum + item.currentRevenue.amount, 0);
  const previousRevenue = movements.reduce((sum, item) => sum + item.previousRevenue.amount, 0);
  const deltaMinor = currentRevenue - previousRevenue;
  const deltaPercent = percentDelta(currentRevenue, previousRevenue);

  const unavailable: string[] = [];
  if (!input.hasSearchPositions) unavailable.push('search_positions');
  if (!input.hasCompetitorPrices) unavailable.push('competitor_prices');

  const hasDrop = deltaPercent !== null && deltaPercent <= DROP_THRESHOLD_PERCENT;

  if (!hasDrop) {
    return {
      hasDrop: false,
      revenueDelta: money(deltaMinor, currency),
      revenueDeltaPercent: deltaPercent,
      breadth: 'none',
      findings: [],
      unavailable,
    };
  }

  const coverageBySku = new Map(coverage.map((item) => [item.sellerSku, item]));
  const currentPrices = averagePriceBySku(current);
  const previousPrices = averagePriceBySku(previous);

  const lowRatingsBySku = new Map<string, number>();
  for (const review of reviews) {
    if (review.rating > LOW_RATING || !review.sellerSku) continue;
    lowRatingsBySku.set(review.sellerSku, (lowRatingsBySku.get(review.sellerSku) ?? 0) + 1);
  }

  const totalDrop = Math.abs(deltaMinor);
  const droppers = movements.filter((item) => item.deltaMinor < 0);
  const findings: DiagnosticFinding[] = [];

  for (const movement of droppers) {
    const contribution = Math.abs(movement.deltaMinor) / totalDrop;
    if (contribution < CONTRIBUTION_THRESHOLD) continue;

    const sku = movement.sellerSku;
    const stock = coverageBySku.get(sku);
    const revenueImpact = money(movement.deltaMinor, currency);
    const base = { sellerSku: sku, revenueImpact };

    // Порядок проверок — от самой однозначной причины к самой размытой.
    if (stock && (stock.risk === 'out' || stock.quantity === 0)) {
      findings.push({
        ...base,
        code: 'stockout',
        // Нет товара — нет продаж. Тут гадать не о чем.
        confidence: 0.95,
        evidence: { quantity: stock.quantity },
      });
      continue;
    }

    const currentPrice = currentPrices.get(sku);
    const previousPrice = previousPrices.get(sku);
    const priceChange =
      currentPrice !== undefined && previousPrice !== undefined
        ? percentDelta(currentPrice, previousPrice)
        : null;

    if (priceChange !== null && priceChange >= PRICE_UP_THRESHOLD_PERCENT) {
      findings.push({
        ...base,
        code: 'price_up',
        confidence: 0.7,
        evidence: { pricePercent: Number(priceChange.toFixed(1)) },
      });
      continue;
    }

    const lowRatings = lowRatingsBySku.get(sku) ?? 0;
    if (lowRatings > 0) {
      findings.push({
        ...base,
        code: 'negative_reviews',
        confidence: 0.55,
        evidence: { count: lowRatings },
      });
      continue;
    }

    if (stock && stock.quantity > 0) {
      findings.push({
        ...base,
        code: 'demand',
        // Товар есть, цена та же, отзывы не портились — остаётся видимость
        // или спрос. Без позиций в поиске точнее сказать нечем, отсюда низкая уверенность.
        confidence: 0.35,
        evidence: { quantity: stock.quantity, daysOfCover: Math.floor(stock.daysOfCover ?? 0) },
      });
      continue;
    }

    findings.push({ ...base, code: 'demand', confidence: 0.25, evidence: {} });
  }

  // Рост доли отмен — причина уровня магазина, не товара.
  const currentCancelRate = cancellationRate(current);
  const previousCancelRate = cancellationRate(previous);
  if (currentCancelRate > 0.1 && currentCancelRate > previousCancelRate * 1.5) {
    findings.push({
      code: 'cancellations',
      revenueImpact: money(0, currency),
      confidence: 0.6,
      evidence: {
        currentPercent: Number((currentCancelRate * 100).toFixed(1)),
        previousPercent: Number((previousCancelRate * 100).toFixed(1)),
      },
    });
  }

  /**
   * Считаем объяснённой только ту часть падения, под которую нашлась внятная
   * причина. Гипотеза «просел спрос» ничего не объясняет — это констатация
   * падения другими словами, и включать её в объяснённое значит обманывать себя.
   */
  const explained = findings
    .filter((finding) => finding.sellerSku !== undefined && finding.confidence >= 0.5)
    .reduce((sum, finding) => sum + Math.abs(finding.revenueImpact.amount), 0);
  const breadth: DiagnosisReport['breadth'] = explained / totalDrop >= 0.5 ? 'concentrated' : 'spread';

  if (breadth === 'spread') {
    findings.push({
      code: 'systemic',
      revenueImpact: money(deltaMinor + explained, currency),
      confidence: 0.5,
      evidence: {
        skuCount: droppers.length,
        explainedPercent: Number(((explained / totalDrop) * 100).toFixed(0)),
      },
    });
  }

  // Сначала то, что сильнее ударило по деньгам; при равном вкладе — увереннее.
  findings.sort(
    (a, b) =>
      Math.abs(b.revenueImpact.amount) - Math.abs(a.revenueImpact.amount) || b.confidence - a.confidence,
  );

  return {
    hasDrop: true,
    revenueDelta: money(deltaMinor, currency),
    revenueDeltaPercent: deltaPercent,
    breadth,
    findings,
    unavailable,
  };
}

/**
 * Превращение сводки в текст сообщения.
 *
 * Отдельно от расчёта и от обработчиков команд: это чистые функции, их можно
 * проверять тестами и переиспользовать для алертов и веб-интерфейса.
 * Ни одной строки текста здесь не написано напрямую — только ключи каталога.
 */
import { formatMoney, type Money } from '../core/money';
import { t, type Locale } from '../i18n';
import type { StockCoverage, SkuMovement } from '../analytics/metrics';
import type { DailyDigest, StockReport } from '../services/digest';

/** Локаль форматирования чисел по локали интерфейса. */
const numberLocale: Record<Locale, string> = { ru: 'ru-RU', en: 'en-US' };

export function formatPercent(value: number | null, locale: Locale): string {
  if (value === null) return t(locale, 'delta.no_base');
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatMoneyFor(value: Money, locale: Locale): string {
  return formatMoney(value, numberLocale[locale]);
}

/** Человекочитаемая давность: «3 ч», «25 мин», «2 дн». */
export function formatAgo(from: Date, locale: Locale, now = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - from.getTime()) / 60_000));
  if (minutes < 60) return t(locale, 'time.minutes', { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 48) return t(locale, 'time.hours', { count: hours });
  return t(locale, 'time.days', { count: Math.round(hours / 24) });
}

function formatStockLine(item: StockCoverage, locale: Locale): string {
  if (item.risk === 'out') return t(locale, 'digest.stock_out', { sku: item.sellerSku });
  if (item.daysOfCover === null) {
    return t(locale, 'digest.stock_unknown', { sku: item.sellerSku, quantity: item.quantity });
  }
  return t(locale, 'digest.stock_days', {
    sku: item.sellerSku,
    quantity: item.quantity,
    days: Math.floor(item.daysOfCover),
  });
}

function formatMovementLine(item: SkuMovement, locale: Locale): string {
  const delta = formatMoneyFor({ amount: item.deltaMinor, currency: item.currentRevenue.currency }, locale);
  const percent = item.deltaPercent === null ? '' : ` (${formatPercent(item.deltaPercent, locale)})`;
  return t(locale, 'digest.movement_line', { sku: item.sellerSku, delta: `${delta}${percent}` });
}

export function formatDigest(digest: DailyDigest, locale: Locale, now = new Date()): string {
  const lines: string[] = [t(locale, 'digest.title', { store: digest.storeName })];

  if (digest.neverSynced) {
    lines.push('', t(locale, 'digest.never_synced'));
    return lines.join('\n');
  }

  if (digest.stale) {
    const lastSuccess = digest.freshness
      .map((item) => item.lastSuccessAt)
      .filter((date): date is Date => date !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    if (lastSuccess) lines.push(t(locale, 'digest.stale', { ago: formatAgo(lastSuccess, locale, now) }));
  }

  lines.push('');

  if (digest.sales.current.orders === 0) {
    lines.push(t(locale, 'digest.no_sales'));
  } else {
    lines.push(
      t(locale, 'digest.revenue', {
        revenue: formatMoneyFor(digest.sales.current.revenue, locale),
        delta: formatPercent(digest.sales.revenueDeltaPercent, locale),
      }),
      t(locale, 'digest.orders', {
        orders: digest.sales.current.orders,
        delta: formatPercent(digest.sales.ordersDeltaPercent, locale),
        average: formatMoneyFor(digest.sales.current.averageCheck, locale),
      }),
    );
  }

  if (digest.sales.current.cancelled > 0) {
    lines.push(t(locale, 'digest.cancelled', { count: digest.sales.current.cancelled }));
  }

  lines.push('', t(locale, 'digest.stock_title'));
  if (digest.stockAlerts.length === 0) {
    lines.push(t(locale, 'digest.stock_ok'));
  } else {
    lines.push(...digest.stockAlerts.map((item) => formatStockLine(item, locale)));
  }

  if (digest.topDrops.length > 0) {
    lines.push('', t(locale, 'digest.drops_title'));
    lines.push(...digest.topDrops.map((item) => formatMovementLine(item, locale)));
  }

  if (digest.topGrowth.length > 0) {
    lines.push('', t(locale, 'digest.growth_title'));
    lines.push(...digest.topGrowth.map((item) => formatMovementLine(item, locale)));
  }

  if (digest.reviews.newCount > 0 || digest.reviews.unanswered > 0) {
    let reviewLine = t(locale, 'digest.reviews', {
      new: digest.reviews.newCount,
      unanswered: digest.reviews.unanswered,
    });
    if (digest.reviews.worstRating !== null && digest.reviews.worstRating <= 3) {
      reviewLine += `, ${t(locale, 'digest.reviews_worst', { rating: digest.reviews.worstRating })}`;
    }
    lines.push('', reviewLine);
  }

  return lines.join('\n');
}

export function formatStockReport(report: StockReport, locale: Locale): string {
  const lines: string[] = [t(locale, 'digest.stock_title')];

  if (report.neverSynced) {
    lines.push('', t(locale, 'digest.never_synced'));
    return lines.join('\n');
  }

  if (report.items.length === 0) {
    lines.push(t(locale, 'digest.stock_ok'));
    return lines.join('\n');
  }

  lines.push(...report.items.map((item) => formatStockLine(item, locale)));
  return lines.join('\n');
}

export function formatStores(
  stores: Array<{ name: string; marketplace: string; status: string }>,
  locale: Locale,
): string {
  const lines: string[] = [t(locale, 'digest.stores_title')];
  lines.push(
    ...stores.map((store) =>
      t(locale, 'digest.store_line', {
        name: store.name,
        marketplace: store.marketplace,
        status: store.status,
      }),
    ),
  );
  return lines.join('\n');
}

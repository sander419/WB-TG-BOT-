/**
 * Превращение сводки в текст сообщения.
 *
 * Отдельно от расчёта и от обработчиков команд: это чистые функции, их можно
 * проверять тестами и переиспользовать для алертов и веб-интерфейса.
 * Ни одной строки текста здесь не написано напрямую — только ключи каталога.
 */
import { formatMoney, type Money } from '../core/money';
import { t, type Locale, type MessageKey } from '../i18n';
import type { StockCoverage, SkuMovement } from '../analytics/metrics';
import type { Alert } from '../analytics/alerts';
import type { DiagnosisReport } from '../analytics/diagnostics';
import type { DailyDigest, StockReport } from '../services/digest';
import type { ReviewFeed } from '../services/reviews';

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

/** Алерт в сообщение: заголовок и тело — два ключа одного кода. */
export function formatAlert(alert: Alert, locale: Locale): string {
  const title = t(locale, `alert.${alert.code}.title` as MessageKey);
  const body = t(locale, `alert.${alert.code}.body` as MessageKey, alert.params);
  return `${title}\n${body}`;
}

export function formatDiagnosis(
  report: DiagnosisReport,
  storeName: string,
  locale: Locale,
): string {
  const delta = formatMoneyFor(report.revenueDelta, locale);
  const percent = formatPercent(report.revenueDeltaPercent, locale);

  if (!report.hasDrop) {
    return `${t(locale, 'diagnosis.title', { store: storeName })}\n\n${t(locale, 'diagnosis.no_drop', {
      delta,
      percent,
    })}`;
  }

  const lines: string[] = [
    t(locale, 'diagnosis.title', { store: storeName }),
    '',
    t(locale, 'diagnosis.summary', { delta, percent }),
  ];

  // Разбор запустил отдельный товар — об этом надо сказать прямо, иначе
  // ровная общая цифра рядом со списком причин выглядит противоречием.
  if (report.trigger === 'sku') lines.push(t(locale, 'diagnosis.sku_trigger'));
  lines.push('');

  for (const finding of report.findings) {
    const impact =
      finding.revenueImpact.amount === 0 ? '' : formatMoneyFor(finding.revenueImpact, locale);
    const text = t(locale, `diagnosis.cause.${finding.code}` as MessageKey, {
      sku: finding.sellerSku ?? '—',
      impact,
      ...finding.evidence,
    });
    // Уверенность показываем только там, где она не очевидна.
    const confidence =
      finding.confidence >= 0.9
        ? ''
        : ` · ${t(locale, 'diagnosis.confidence', { percent: Math.round(finding.confidence * 100) })}`;
    lines.push(`• ${text}${confidence}`);
  }

  if (report.unavailable.length > 0) {
    const list = report.unavailable
      .map((source) => t(locale, `diagnosis.source.${source}` as MessageKey))
      .join(', ');
    lines.push('', t(locale, 'diagnosis.unavailable', { list }));
  }

  return lines.join('\n');
}

/** Дата в таймзоне магазина: «6 сент., 14:20». */
function formatDateTime(date: Date, locale: Locale, timeZone: string): string {
  return new Intl.DateTimeFormat(numberLocale[locale], {
    timeZone,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const REVIEW_EXCERPT_LENGTH = 300;

export function formatReviewFeed(feed: ReviewFeed, locale: Locale): string {
  const lines: string[] = [t(locale, 'reviews.title', { store: feed.storeName })];

  if (feed.neverSynced) {
    lines.push('', t(locale, 'digest.never_synced'));
    return lines.join('\n');
  }

  lines.push(
    '',
    feed.summary.averageRating === null
      ? t(locale, 'reviews.summary_no_rating', {
          unanswered: feed.summary.unanswered,
          total: feed.summary.total,
          days: feed.summaryDays,
        })
      : t(locale, 'reviews.summary', {
          unanswered: feed.summary.unanswered,
          total: feed.summary.total,
          days: feed.summaryDays,
          rating: feed.summary.averageRating.toFixed(1),
        }),
  );

  if (feed.summary.negativeUnanswered > 0) {
    lines.push(t(locale, 'reviews.negative_warning', { count: feed.summary.negativeUnanswered }));
  }

  if (feed.items.length === 0) {
    lines.push('', t(locale, 'reviews.none'));
    return lines.join('\n');
  }

  for (const item of feed.items) {
    const product =
      item.productTitle ?? item.sellerSku ?? t(locale, 'reviews.unknown_product');
    const text = item.text.replace(/\s+/g, ' ').trim();
    const excerpt =
      text.length === 0
        ? t(locale, 'reviews.no_text')
        : text.length <= REVIEW_EXCERPT_LENGTH
          ? text
          : `${text.slice(0, REVIEW_EXCERPT_LENGTH - 1)}…`;

    lines.push(
      '',
      t(locale, 'reviews.item_header', {
        rating: item.rating,
        product,
        date: formatDateTime(item.createdAt, locale, feed.timezone),
      }),
      excerpt,
    );

    if (item.draftReply) {
      lines.push(t(locale, 'reviews.draft', { draft: item.draftReply }));
    }
  }

  if (feed.hidden > 0) {
    lines.push('', t(locale, 'reviews.more', { count: feed.hidden }));
  }

  // Пока коннектор не умеет писать, честно предупреждаем: подготовить ответ
  // можно, отправить — нет. Молчание тут выглядело бы как «сейчас отправлю».
  lines.push('', t(locale, 'reviews.cannot_answer'));

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

/**
 * Кто перед ботом: локаль, организация, активный магазин.
 *
 * Два источника: БД, если она настроена, и память процесса как запасной
 * вариант для локальной разработки без Postgres. Обработчики команд не должны
 * знать, какой из них сработал, — поэтому оба спрятаны за одним интерфейсом.
 */
import { env } from '../config/env';
import { logger } from '../core/logger';
import { resolveLocale, type Locale } from '../i18n';
import { isDatabaseConfigured } from '../db/client';
import { consumeLinkCode, findAccount, saveAccountLocale } from '../db/repositories/telegram';
import { getPreferences, setPreferences } from './state';

export interface BotSession {
  telegramUserId: number;
  chatId: number;
  locale: Locale;
  organizationId: string | null;
  activeStoreId: string | null;
  /** Работаем без БД: часть команд недоступна. */
  ephemeral: boolean;
}

export async function loadSession(
  telegramUserId: number,
  chatId: number,
  languageCode: string | undefined,
): Promise<BotSession> {
  const fallbackLocale = resolveLocale(languageCode, env.DEFAULT_LOCALE);

  if (!isDatabaseConfigured()) {
    const preferences = getPreferences(telegramUserId);
    return {
      telegramUserId,
      chatId,
      locale: preferences?.locale ?? fallbackLocale,
      organizationId: preferences?.organizationId ?? null,
      activeStoreId: preferences?.activeStoreId ?? null,
      ephemeral: true,
    };
  }

  try {
    const account = await findAccount(BigInt(telegramUserId));
    return {
      telegramUserId,
      chatId,
      locale: account?.locale ?? fallbackLocale,
      organizationId: account?.organizationId ?? null,
      activeStoreId: account?.activeStoreId ?? null,
      ephemeral: false,
    };
  } catch (error) {
    // Падение БД не должно превращать бота в молчащий кирпич.
    logger.error({ err: error }, 'Не удалось прочитать аккаунт Telegram, работаю без привязки');
    return {
      telegramUserId,
      chatId,
      locale: fallbackLocale,
      organizationId: null,
      activeStoreId: null,
      ephemeral: true,
    };
  }
}

export async function rememberLocale(session: BotSession, locale: Locale): Promise<void> {
  if (session.ephemeral) {
    setPreferences(session.telegramUserId, { locale });
    return;
  }
  await saveAccountLocale(BigInt(session.telegramUserId), BigInt(session.chatId), locale);
}

export interface LinkOutcome {
  ok: boolean;
  organizationId?: string;
  storeId?: string | null;
}

export async function linkByCode(session: BotSession, code: string): Promise<LinkOutcome> {
  if (session.ephemeral) return { ok: false };

  const result = await consumeLinkCode(
    code,
    BigInt(session.telegramUserId),
    BigInt(session.chatId),
    session.locale,
  );

  if (!result) return { ok: false };
  return { ok: true, organizationId: result.organizationId, storeId: result.storeId };
}

export interface StoreScope {
  organizationId: string;
  activeStoreId: string;
}

/**
 * Контекст магазина, без которого команды данных бессмысленны.
 * Возвращает объект, а не type guard: сужение по пересечению типов
 * TypeScript в отрицательной ветке схлопывает в never.
 */
export function storeScope(session: BotSession): StoreScope | undefined {
  if (session.organizationId === null || session.activeStoreId === null) return undefined;
  return { organizationId: session.organizationId, activeStoreId: session.activeStoreId };
}

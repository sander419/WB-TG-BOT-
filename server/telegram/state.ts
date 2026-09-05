/**
 * Временное хранилище настроек пользователей бота — в памяти процесса.
 *
 * Это осознанная заглушка на период, пока не поднята БД: она позволяет
 * отлаживать команды локально. Как только появится Postgres, весь файл
 * заменяется запросами к telegram_accounts (server/db/schema.ts) — интерфейс
 * функций специально совпадает с будущим сервисным слоем.
 *
 * Ограничение: настройки теряются при рестарте и не разъезжаются между инстансами.
 */
import type { Locale } from '../i18n';

export interface TelegramPreferences {
  locale: Locale;
  organizationId?: string;
  activeStoreId?: string;
  alertsEnabled: boolean;
}

const preferences = new Map<number, TelegramPreferences>();

export function getPreferences(telegramUserId: number): TelegramPreferences | undefined {
  return preferences.get(telegramUserId);
}

export function setPreferences(telegramUserId: number, patch: Partial<TelegramPreferences>): TelegramPreferences {
  const current: TelegramPreferences = preferences.get(telegramUserId) ?? { locale: 'ru', alertsEnabled: true };
  const next: TelegramPreferences = { ...current, ...patch };
  preferences.set(telegramUserId, next);
  return next;
}

export function hasLinkedStore(telegramUserId: number): boolean {
  return Boolean(preferences.get(telegramUserId)?.activeStoreId);
}

/** Для диагностики: сколько пользователей бот видел с момента старта. */
export function knownUsersCount(): number {
  return preferences.size;
}

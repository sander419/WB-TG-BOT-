/**
 * Аккаунты Telegram и одноразовые коды привязки.
 *
 * Привязка идёт через код, а не через номер телефона: номер не доказывает прав
 * на магазин, а код выдаётся уже вошедшему пользователю в веб-интерфейсе.
 * Код одноразовый и с коротким сроком жизни — перехваченный в чате код
 * не должен работать завтра.
 */
import { randomInt } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { getDb } from '../client';
import { stores, telegramAccounts, telegramLinkCodes } from '../schema';
import type { Locale } from '../../i18n';

/** Без похожих символов: 0/O и 1/I/l в чате не различить. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const DEFAULT_TTL_MINUTES = 15;

export interface TelegramAccount {
  telegramUserId: bigint;
  chatId: bigint;
  organizationId: string | null;
  activeStoreId: string | null;
  locale: Locale;
  alertsEnabled: boolean;
}

export function generateLinkCode(): string {
  let code = '';
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export async function createLinkCode(input: {
  organizationId: string;
  storeId?: string;
  createdByUserId?: string;
  ttlMinutes?: number;
}): Promise<{ code: string; expiresAt: Date }> {
  const code = generateLinkCode();
  const expiresAt = new Date(Date.now() + (input.ttlMinutes ?? DEFAULT_TTL_MINUTES) * 60_000);

  await getDb()
    .insert(telegramLinkCodes)
    .values({
      code,
      organizationId: input.organizationId,
      ...(input.storeId === undefined ? {} : { storeId: input.storeId }),
      ...(input.createdByUserId === undefined ? {} : { createdByUserId: input.createdByUserId }),
      expiresAt,
    });

  return { code, expiresAt };
}

/**
 * Гасит код и привязывает к нему аккаунт Telegram.
 *
 * Всё одной транзакцией: код должен сгореть ровно один раз, даже если два
 * сообщения с ним пришли одновременно.
 */
export async function consumeLinkCode(
  code: string,
  telegramUserId: bigint,
  chatId: bigint,
  locale: Locale,
): Promise<{ organizationId: string; storeId: string | null } | undefined> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const claimed = await tx
      .update(telegramLinkCodes)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(telegramLinkCodes.code, code.trim().toUpperCase()),
          isNull(telegramLinkCodes.usedAt),
          gt(telegramLinkCodes.expiresAt, new Date()),
        ),
      )
      .returning();

    const row = claimed[0];
    if (!row) return undefined;

    // Если магазин в коде не указан, берём первый магазин организации.
    let storeId = row.storeId;
    if (!storeId) {
      const firstStore = await tx
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.organizationId, row.organizationId))
        .limit(1);
      storeId = firstStore[0]?.id ?? null;
    }

    await tx
      .insert(telegramAccounts)
      .values({
        telegramUserId,
        chatId,
        organizationId: row.organizationId,
        ...(storeId === null ? {} : { activeStoreId: storeId }),
        locale,
      })
      .onConflictDoUpdate({
        target: telegramAccounts.telegramUserId,
        set: {
          chatId,
          organizationId: row.organizationId,
          activeStoreId: storeId,
        },
      });

    return { organizationId: row.organizationId, storeId };
  });
}

export async function findAccount(telegramUserId: bigint): Promise<TelegramAccount | undefined> {
  const rows = await getDb()
    .select()
    .from(telegramAccounts)
    .where(eq(telegramAccounts.telegramUserId, telegramUserId))
    .limit(1);

  const row = rows[0];
  if (!row) return undefined;

  return {
    telegramUserId: row.telegramUserId,
    chatId: row.chatId,
    organizationId: row.organizationId,
    activeStoreId: row.activeStoreId,
    locale: (row.locale === 'en' ? 'en' : 'ru') as Locale,
    alertsEnabled: row.alertsEnabled,
  };
}

export async function saveAccountLocale(
  telegramUserId: bigint,
  chatId: bigint,
  locale: Locale,
): Promise<void> {
  await getDb()
    .insert(telegramAccounts)
    .values({ telegramUserId, chatId, locale })
    .onConflictDoUpdate({ target: telegramAccounts.telegramUserId, set: { locale, chatId } });
}

export async function setActiveStore(telegramUserId: bigint, storeId: string): Promise<void> {
  await getDb()
    .update(telegramAccounts)
    .set({ activeStoreId: storeId })
    .where(eq(telegramAccounts.telegramUserId, telegramUserId));
}

/** Кому рассылать алерты. */
export async function accountsForAlerts(organizationId: string): Promise<TelegramAccount[]> {
  const rows = await getDb()
    .select()
    .from(telegramAccounts)
    .where(
      and(eq(telegramAccounts.organizationId, organizationId), eq(telegramAccounts.alertsEnabled, true)),
    );

  return rows.map((row) => ({
    telegramUserId: row.telegramUserId,
    chatId: row.chatId,
    organizationId: row.organizationId,
    activeStoreId: row.activeStoreId,
    locale: (row.locale === 'en' ? 'en' : 'ru') as Locale,
    alertsEnabled: row.alertsEnabled,
  }));
}

/** Выключает алерты после ошибки «бот заблокирован пользователем». */
export async function disableAlerts(telegramUserId: bigint): Promise<void> {
  await getDb()
    .update(telegramAccounts)
    .set({ alertsEnabled: false })
    .where(eq(telegramAccounts.telegramUserId, telegramUserId));
}

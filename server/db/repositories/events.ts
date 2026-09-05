/**
 * Журнал событий: то, что система заметила и о чём сообщила.
 *
 * Он же служит защитой от повторных алертов: перед отправкой смотрим, не писали
 * ли мы это же событие в пределах окна подавления. Отдельной таблицы «что уже
 * отправлено» не заводим — событие и есть факт отправки.
 */
import { and, desc, eq, gte, isNotNull } from 'drizzle-orm';
import { getDb } from '../client';
import { events } from '../schema';

export interface EventInput {
  organizationId: string;
  storeId?: string;
  type: string;
  severity: 'info' | 'success' | 'warning' | 'error' | 'decision';
  title: string;
  dedupKey?: string;
  payload?: Record<string, unknown>;
}

export async function recordEvent(input: EventInput): Promise<string> {
  const rows = await getDb()
    .insert(events)
    .values({
      organizationId: input.organizationId,
      ...(input.storeId === undefined ? {} : { storeId: input.storeId }),
      type: input.type,
      severity: input.severity,
      title: input.title,
      ...(input.dedupKey === undefined ? {} : { dedupKey: input.dedupKey }),
      ...(input.payload === undefined ? {} : { payload: input.payload }),
    })
    .returning({ id: events.id });

  const id = rows[0]?.id;
  if (!id) throw new Error('Не удалось записать событие');
  return id;
}

/**
 * Ключи, по которым событие уже писалось в пределах окна.
 * Одним запросом на все ключи разом: алертов за проход бывает десятки,
 * и спрашивать базу по одному — лишние round-trip'ы на ровном месте.
 */
export async function recentDedupKeys(storeId: string, withinMs: number): Promise<Set<string>> {
  const since = new Date(Date.now() - withinMs);

  const rows = await getDb()
    .select({ dedupKey: events.dedupKey })
    .from(events)
    .where(
      and(eq(events.storeId, storeId), isNotNull(events.dedupKey), gte(events.createdAt, since)),
    );

  return new Set(rows.map((row) => row.dedupKey).filter((key): key is string => key !== null));
}

/** Лента событий магазина — для интерфейса и отладки. */
export async function listEvents(organizationId: string, limit = 50) {
  return getDb()
    .select()
    .from(events)
    .where(eq(events.organizationId, organizationId))
    .orderBy(desc(events.createdAt))
    .limit(limit);
}

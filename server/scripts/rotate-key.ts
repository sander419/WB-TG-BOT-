/**
 * Перешифровка секретов продавцов под новый ключ.
 *
 *   1. Старый ключ переносим в SECRETS_ENCRYPTION_KEY_PREVIOUS
 *   2. Новый кладём в SECRETS_ENCRYPTION_KEY (npm run gen:key)
 *   3. npm run rotate:key            — показать, что будет сделано
 *   4. npm run rotate:key -- --apply — выполнить
 *   5. Убрать SECRETS_ENCRYPTION_KEY_PREVIOUS из окружения
 *
 * По умолчанию ничего не пишет: сначала показывает план. Запись идёт одной
 * транзакцией — либо перешифровано всё, либо не тронуто ничего. Наполовину
 * перешифрованная таблица без обоих ключей означала бы потерю части токенов.
 */
import { eq } from 'drizzle-orm';
import { closeDatabase, getDb, isDatabaseConfigured } from '../db/client';
import { storeCredentials } from '../db/schema';
import {
  decryptSecret,
  encryptSecret,
  isEncryptedWithCurrentKey,
  isRotationInProgress,
} from '../core/crypto';
import { env } from '../config/env';

const out = (line: string) => process.stdout.write(`${line}\n`);
const fail = (line: string): never => {
  process.stderr.write(`${line}\n`);
  process.exit(1);
};

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');

  if (!isDatabaseConfigured()) fail('DATABASE_URL не задан — перешифровывать негде.');
  if (!env.SECRETS_ENCRYPTION_KEY) fail('SECRETS_ENCRYPTION_KEY не задан.');

  if (!isRotationInProgress()) {
    out('SECRETS_ENCRYPTION_KEY_PREVIOUS не задан.');
    out('Это нормально, если ключ не менялся: тогда перешифровывать нечего.');
    out('Если ключ уже сменили — верните старый в SECRETS_ENCRYPTION_KEY_PREVIOUS,');
    out('иначе старые записи расшифровать будет нечем.\n');
  }

  const db = getDb();
  const rows = await db
    .select({ id: storeCredentials.id, storeId: storeCredentials.storeId, apiKey: storeCredentials.encryptedApiKey, extra: storeCredentials.encryptedExtra })
    .from(storeCredentials);

  out(`Записей с учётными данными: ${rows.length}`);
  if (rows.length === 0) {
    out('Перешифровывать нечего.');
    return;
  }

  const stale: typeof rows = [];
  const broken: Array<{ storeId: string; reason: string }> = [];

  for (const row of rows) {
    const onCurrent =
      isEncryptedWithCurrentKey(row.apiKey) &&
      (row.extra === null || isEncryptedWithCurrentKey(row.extra));

    if (onCurrent) continue;

    // Проверяем заранее, что запись вообще читается: иначе транзакция упадёт
    // на середине и мы не узнаем, какой именно магазин сломан.
    try {
      decryptSecret(row.apiKey);
      if (row.extra !== null) decryptSecret(row.extra);
      stale.push(row);
    } catch (error) {
      broken.push({ storeId: row.storeId, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  out(`На актуальном ключе: ${rows.length - stale.length - broken.length}`);
  out(`Нужно перешифровать: ${stale.length}`);
  if (broken.length > 0) {
    out(`\nНе расшифровываются ни одним из ключей: ${broken.length}`);
    for (const item of broken) out(`  магазин ${item.storeId}: ${item.reason}`);
    fail('\nОстановка. Перешифровка не начата: сначала разберись с этими записями.');
  }

  if (stale.length === 0) {
    out('\nВсё уже на актуальном ключе.');
    return;
  }

  if (!apply) {
    out('\nЭто предварительный просмотр. Чтобы выполнить: npm run rotate:key -- --apply');
    return;
  }

  await db.transaction(async (tx) => {
    for (const row of stale) {
      await tx
        .update(storeCredentials)
        .set({
          encryptedApiKey: encryptSecret(decryptSecret(row.apiKey)),
          encryptedExtra: row.extra === null ? null : encryptSecret(decryptSecret(row.extra)),
        })
        .where(eq(storeCredentials.id, row.id));
    }
  });

  out(`\nПерешифровано записей: ${stale.length}`);
  out('Теперь убери SECRETS_ENCRYPTION_KEY_PREVIOUS из окружения и перезапусти сервис.');
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Ротация не выполнена: ${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    void closeDatabase();
  });

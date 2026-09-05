/**
 * Проверка боевого токена маркетплейса без записи и без БД.
 *
 *   MARKETPLACE=wildberries WB_TEST_TOKEN=... npm run check:connection
 *
 * Токен берётся из переменной окружения, а не из аргументов командной строки:
 * аргументы видны в списке процессов и попадают в историю shell.
 * Это первый шаг подключения магазина — см. docs/INTEGRATION-WILDBERRIES.md.
 */
import { env } from '../config/env';
import { getConnector } from '../connectors/registry';
import { maskSecret } from '../core/logger';
import type { ConnectorContext, MarketplaceId } from '../connectors/types';

const TOKEN_ENV_BY_MARKETPLACE: Record<string, string> = {
  wildberries: 'WB_TEST_TOKEN',
  ozon: 'OZON_TEST_TOKEN',
  shopify: 'SHOPIFY_TEST_TOKEN',
};

async function main(): Promise<void> {
  const marketplace = (process.env.MARKETPLACE ?? 'wildberries') as MarketplaceId;
  const tokenEnvName = TOKEN_ENV_BY_MARKETPLACE[marketplace] ?? 'MARKETPLACE_TEST_TOKEN';
  const token = process.env[tokenEnvName];

  if (!token) {
    process.stderr.write(
      `Не задан ${tokenEnvName}. Пример:\n  MARKETPLACE=${marketplace} ${tokenEnvName}=<токен> npm run check:connection\n`,
    );
    process.exit(1);
  }

  const connector = getConnector(marketplace);
  const ctx: ConnectorContext = {
    organizationId: 'cli',
    storeId: 'cli-check',
    credentials: { apiKey: token },
    currency: env.DEFAULT_CURRENCY,
    timezone: env.DEFAULT_TIMEZONE,
    allowWrites: false,
  };

  process.stdout.write(`Площадка: ${marketplace}\nТокен: ${maskSecret(token)}\n\n`);

  const result = await connector.testConnection(ctx);
  process.stdout.write(
    [
      `Результат: ${result.ok ? 'OK' : 'ОШИБКА'}`,
      result.accountName ? `Аккаунт: ${result.accountName}` : null,
      result.scopes?.length ? `Права: ${result.scopes.join(', ')}` : null,
      result.message ? `Сообщение: ${result.message}` : null,
      '',
    ]
      .filter((line) => line !== null)
      .join('\n'),
  );

  // Не process.exit: он рвёт ещё живые таймеры fetch и Node ругается ассертом.
  process.exitCode = result.ok ? 0 : 2;
}

main().catch((error: unknown) => {
  process.stderr.write(`Сбой проверки: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

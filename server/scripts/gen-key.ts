/**
 * Генерация ключа шифрования секретов: npm run gen:key
 * Вывод положить в .env как SECRETS_ENCRYPTION_KEY.
 *
 * Смена ключа делает нечитаемыми уже сохранённые токены продавцов —
 * их придётся ввести заново.
 */
import { generateEncryptionKey } from '../core/crypto';

process.stdout.write(`SECRETS_ENCRYPTION_KEY="${generateEncryptionKey()}"\n`);

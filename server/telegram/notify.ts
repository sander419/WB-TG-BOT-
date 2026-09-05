/**
 * Отправка сообщений от бота наружу (алерты, отчёты по расписанию).
 *
 * Отдельно от обработчиков команд: там мы отвечаем на входящее сообщение,
 * здесь — пишем первыми, и правила другие. Блокировка бота пользователем —
 * не сбой, а сигнал перестать ему писать.
 */
import { GrammyError } from 'grammy';
import { logger } from '../core/logger';
import { getBot } from './bot';

export type DeliveryResult = 'sent' | 'blocked' | 'skipped' | 'failed';

/** Телеграм ограничивает частоту; при массовой рассылке шлём с паузой. */
const SEND_INTERVAL_MS = 120;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function sendMessage(chatId: bigint, text: string): Promise<DeliveryResult> {
  const bot = getBot();
  if (!bot) return 'skipped';

  try {
    await bot.api.sendMessage(Number(chatId), text, { link_preview_options: { is_disabled: true } });
    return 'sent';
  } catch (error) {
    if (error instanceof GrammyError) {
      // 403 — пользователь заблокировал бота или удалил чат. Писать больше некому.
      if (error.error_code === 403) {
        logger.info({ chatId: String(chatId) }, 'Бот заблокирован получателем, выключаю рассылку');
        return 'blocked';
      }
      logger.warn(
        { chatId: String(chatId), code: error.error_code, description: error.description },
        'Telegram отклонил сообщение',
      );
      return 'failed';
    }
    logger.error({ err: error, chatId: String(chatId) }, 'Не удалось отправить сообщение');
    return 'failed';
  }
}

/**
 * Рассылка пачкой с паузой между сообщениями.
 * Цикл без паузы упирается в лимит Telegram (около 30 сообщений в секунду)
 * и часть адресатов не получает ничего.
 */
export async function sendBatch(
  messages: Array<{ chatId: bigint; text: string }>,
): Promise<Map<bigint, DeliveryResult>> {
  const results = new Map<bigint, DeliveryResult>();

  for (const [index, message] of messages.entries()) {
    if (index > 0) await sleep(SEND_INTERVAL_MS);
    results.set(message.chatId, await sendMessage(message.chatId, message.text));
  }

  return results;
}

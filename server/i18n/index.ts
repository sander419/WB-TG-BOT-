/**
 * Интернационализация backend-слоя: сообщения Telegram-бота, тексты алертов, ошибки.
 *
 * Проект международный, поэтому ни одна пользовательская строка не пишется
 * в коде напрямую — только ключ + каталог. Добавление языка = новый файл в locales/
 * и строка в SUPPORTED_LOCALES; забытый ключ падает на типах, а не в проде.
 */
import { ru } from './locales/ru';
import { en } from './locales/en';

export const SUPPORTED_LOCALES = ['ru', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type MessageKey = keyof typeof ru;

/** Каталоги обязаны иметь одинаковый набор ключей — это проверяется типом. */
const CATALOGS: Record<Locale, Record<MessageKey, string>> = { ru, en };

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Приводит код языка Telegram ('ru-RU', 'en', 'zh-CN') к поддерживаемой локали. */
export function resolveLocale(input: string | undefined, fallback: Locale = 'ru'): Locale {
  if (!input) return fallback;
  const short = input.split('-')[0]?.toLowerCase();
  return isLocale(short) ? short : fallback;
}

/**
 * Подстановка параметров: t('bot.greeting', { name: 'Саша' }) → «Привет, Саша».
 * В каталогах плейсхолдеры пишутся как {name}.
 */
export function t(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
  const template = CATALOGS[locale][key] ?? CATALOGS.ru[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** Хелпер для передачи в обработчики: один раз зафиксировали локаль, дальше t(key). */
export function translatorFor(locale: Locale) {
  return (key: MessageKey, params?: Record<string, string | number>) => t(locale, key, params);
}

export type Translator = ReturnType<typeof translatorFor>;

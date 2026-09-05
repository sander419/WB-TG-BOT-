/**
 * Деньги в минорных единицах (копейки, центы, фыни) + код валюты ISO 4217.
 *
 * Правило проекта: во всём backend-слое и в БД деньги — целое число минорных
 * единиц. Никаких float. Проект международный: RUB, CNY, USD, EUR, KZT живут
 * рядом, а у части валют другое число знаков после запятой.
 */

export interface Money {
  /** Целое число минорных единиц. 1990.50 ₽ → 199050. */
  amount: number;
  /** ISO 4217, три буквы в верхнем регистре: RUB, CNY, USD. */
  currency: string;
}

/** Валюты с нестандартным числом знаков. По умолчанию 2. */
const CURRENCY_DECIMALS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  CLP: 0,
  VND: 0,
  ISK: 0,
  BHD: 3,
  KWD: 3,
  OMR: 3,
  TND: 3,
};

export function decimalsFor(currency: string): number {
  return CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2;
}

export function money(amount: number, currency: string): Money {
  if (!Number.isInteger(amount)) {
    throw new TypeError(`Money.amount должен быть целым числом минорных единиц, получено ${amount}`);
  }
  return { amount, currency: currency.toUpperCase() };
}

/** Из «человеческого» числа (1990.5) в Money. Использовать только на границе с внешними API. */
export function fromMajor(value: number, currency: string): Money {
  const factor = 10 ** decimalsFor(currency);
  return money(Math.round(value * factor), currency);
}

export function toMajor(value: Money): number {
  return value.amount / 10 ** decimalsFor(value.currency);
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Нельзя складывать разные валюты: ${a.currency} и ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

export function multiply(value: Money, factor: number): Money {
  return money(Math.round(value.amount * factor), value.currency);
}

/** Форматирование для UI и сообщений бота. Локаль влияет на разделители. */
export function formatMoney(value: Money, locale = 'ru-RU'): string {
  const decimals = decimalsFor(value.currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(toMajor(value));
}

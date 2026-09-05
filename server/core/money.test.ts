import { test } from 'node:test';
import assert from 'node:assert/strict';
import { add, decimalsFor, formatMoney, fromMajor, money, multiply, subtract, toMajor } from './money';

test('money не принимает дробные минорные единицы', () => {
  assert.throws(() => money(199.5, 'RUB'), TypeError);
});

test('код валюты нормализуется в верхний регистр', () => {
  assert.equal(money(100, 'rub').currency, 'RUB');
});

test('число знаков зависит от валюты', () => {
  assert.equal(decimalsFor('RUB'), 2);
  assert.equal(decimalsFor('JPY'), 0);
  assert.equal(decimalsFor('KWD'), 3);
  assert.equal(decimalsFor('cny'), 2);
});

test('перевод из мажорных единиц и обратно не теряет копейки', () => {
  const price = fromMajor(1990.5, 'RUB');
  assert.equal(price.amount, 199050);
  assert.equal(toMajor(price), 1990.5);
});

test('перевод из мажорных единиц округляет, а не отбрасывает', () => {
  // 0.1 + 0.2 в float даёт 0.30000000000000004 — округление обязано это съесть.
  assert.equal(fromMajor(0.1 + 0.2, 'RUB').amount, 30);
  assert.equal(fromMajor(19.999, 'RUB').amount, 2000);
});

test('валюта без дробной части не получает лишних множителей', () => {
  assert.equal(fromMajor(1500, 'JPY').amount, 1500);
});

test('сложение разных валют запрещено', () => {
  assert.throws(() => add(money(100, 'RUB'), money(100, 'CNY')), TypeError);
});

test('арифметика в минорных единицах точная', () => {
  assert.equal(add(money(199050, 'RUB'), money(50, 'RUB')).amount, 199100);
  assert.equal(subtract(money(199050, 'RUB'), money(20000, 'RUB')).amount, 179050);
  assert.equal(multiply(money(199050, 'RUB'), 0.9).amount, 179145);
});

test('формат учитывает локаль и валюту', () => {
  const formatted = formatMoney(money(199050, 'RUB'), 'ru-RU');
  // Intl ставит неразрывные пробелы — сравниваем по цифрам, а не по строке целиком.
  assert.match(formatted.replace(/\s/g, ''), /1990,50/);
  assert.match(formatMoney(money(1500, 'JPY'), 'en-US'), /1,500/);
});

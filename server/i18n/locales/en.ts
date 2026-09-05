import type { ru } from './ru';

/** English catalogue. Must cover every key of `ru` — enforced by the type. */
export const en: Record<keyof typeof ru, string> = {
  'bot.start.greeting':
    'CommerceOS here.\n\nI help you run marketplace sales: daily digest, sales drops, stock levels, reviews, pricing.\n\nNo store is connected yet. Send /link to attach your account.',
  'bot.start.linked': 'Hi {name}. Active store: {store}.',
  'bot.help.title': 'What I can do',
  'bot.help.body':
    '/digest — 24h digest\n/sales — sales and revenue\n/stocks — stock levels and out-of-stock risk\n/problems — what dropped and why\n/reviews — new reviews and complaints\n/stores — list your stores\n/link — connect a store\n/lang — change language\n/help — this message',
  'bot.link.prompt': 'Send the linking code from the web app: /link CODE',
  'bot.link.invalid': 'Code not found or expired. Generate a new one in store settings.',
  'bot.link.success': 'Store "{store}" linked. Digests and alerts are on.',
  'bot.lang.prompt': 'Выбери язык / Choose a language:',
  'bot.lang.changed': 'Interface language: English.',
  'bot.error.generic': 'That request failed. The error is logged — please try again in a minute.',
  'bot.error.no_store': 'Connect a store first: /link',
  'bot.error.rate_limited': 'The marketplace throttled us. Retrying in {seconds}s.',
  'bot.not_implemented': 'The {command} command lands once the marketplace connector is wired up.',
  'bot.stub.notice': 'This is a scaffold stub — real data arrives once the store API is connected.',

  'alert.rank_drop.title': '📉 Search rank drop',
  'alert.rank_drop.body': '{product}: rank for "{keyword}" fell from {from} to {to}.',
  'alert.stockout.title': '📦 Out-of-stock risk',
  'alert.stockout.body': '{product}: {days} days of stock left at {warehouse}.',
  'alert.price_undercut.title': '💸 Competitor undercut you',
  'alert.price_undercut.body': '{competitor} is now at {price} — {delta} below yours.',
  'alert.negative_review.title': '⚠️ Negative review',
  'alert.negative_review.body': '{product}: rated {rating}. "{excerpt}"',

  'common.yes': 'Yes',
  'common.no': 'No',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
};

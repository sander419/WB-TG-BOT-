/** Русский каталог. Эталонный: набор ключей здесь определяет тип MessageKey. */
export const ru = {
  'bot.start.greeting':
    'CommerceOS на связи.\n\nЯ помогаю управлять продажами на маркетплейсах: сводка, просадки, остатки, отзывы, цены.\n\nСейчас магазин не подключён. Отправь /link, чтобы привязать аккаунт.',
  'bot.start.linked': 'Привет, {name}. Активный магазин: {store}.',
  'bot.help.title': 'Что я умею',
  'bot.help.body':
    '/digest — сводка за сутки\n/sales — продажи и выручка\n/stocks — остатки и риск out-of-stock\n/problems — что просело и почему\n/reviews — новые отзывы и претензии\n/stores — список магазинов\n/link — привязать магазин\n/lang — сменить язык\n/help — эта справка',
  'bot.link.prompt': 'Отправь код привязки из веб-интерфейса: /link КОД',
  'bot.link.invalid': 'Код не найден или истёк. Сгенерируй новый в настройках магазина.',
  'bot.link.success': 'Магазин «{store}» привязан. Теперь доступны сводки и алерты.',
  'bot.lang.prompt': 'Выбери язык / Choose a language:',
  'bot.lang.changed': 'Язык интерфейса: русский.',
  'bot.error.generic': 'Не получилось выполнить запрос. Я записал ошибку, попробуй ещё раз через минуту.',
  'bot.error.no_store': 'Сначала привяжи магазин: /link',
  'bot.error.rate_limited': 'Маркетплейс временно ограничил запросы. Повторю через {seconds} с.',
  'bot.not_implemented': 'Команда {command} появится, когда подключим коннектор маркетплейса.',
  'bot.stub.notice': 'Пока это заглушка каркаса: реальные данные пойдут после подключения API магазина.',

  'alert.rank_drop.title': '📉 Падение позиций',
  'alert.rank_drop.body': '{product}: позиция по «{keyword}» упала с {from} на {to}.',
  'alert.stockout.title': '📦 Риск out-of-stock',
  'alert.stockout.body': '{product}: остатка хватит на {days} дн. Склад: {warehouse}.',
  'alert.price_undercut.title': '💸 Конкурент снизил цену',
  'alert.price_undercut.body': '{competitor} поставил {price} — на {delta} ниже вашей.',
  'alert.negative_review.title': '⚠️ Негативный отзыв',
  'alert.negative_review.body': '{product}: оценка {rating}. «{excerpt}»',

  'common.yes': 'Да',
  'common.no': 'Нет',
  'common.cancel': 'Отмена',
  'common.confirm': 'Подтвердить',
} as const;

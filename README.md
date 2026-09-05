# CommerceOS

AI-платформа управления продажами на маркетплейсах: Wildberries, Ozon, Shopify
и закупка на китайских площадках. Веб-интерфейс + Telegram-бот.

## Состояние на 2026-09-05

Честно: **маркетплейс ещё не подключён.**

- Веб-интерфейс работает на демо-данных (`src/data/mockStore.ts`).
- Из внешних сервисов реально вызывается только Gemini (генерация SEO, планов
  запуска, ответов на отзывы).
- Backend-каркас под подключение готов: конфиг, хранилище, шифрование секретов,
  контракт коннекторов, Telegram-бот, i18n.
- Коннектор WB умеет только проверять токен; методы чтения и записи бросают
  `NotImplementedError` с указанием, что дописать.

Что настроено в конкретной установке, показывает `GET /api/platform/health` —
он не врёт про «всё ACTIVE», а перечисляет недостающие переменные.

План работ — [docs/ROADMAP.md](docs/ROADMAP.md).

## Быстрый старт

```bash
npm install
cp .env.example .env
npm run dev
```

Откроется на <http://localhost:3000>. Без секретов приложение поднимается:
неготовые подсистемы просто выключены и говорят об этом в логе.

### С базой данных

```bash
docker compose up -d db
npm run gen:key          # вывод положить в .env как SECRETS_ENCRYPTION_KEY
npm run db:migrate
```

### С Telegram-ботом

В `.env`: `TELEGRAM_BOT_TOKEN` от [@BotFather](https://t.me/BotFather) и
`TELEGRAM_MODE="polling"`. Подробности — [docs/INTEGRATION-TELEGRAM.md](docs/INTEGRATION-TELEGRAM.md).

### Проверить токен маркетплейса

```bash
MARKETPLACE=wildberries WB_TEST_TOKEN=<токен> npm run check:connection
```

Ничего не меняет на площадке. Токен читается из переменной окружения, а не из
аргументов команды.

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | Дев-сервер: Vite + express в одном процессе |
| `npm run build` | Сборка фронтенда и бандла сервера в `dist/` |
| `npm start` | Запуск собранного сервера |
| `npm run lint` | Проверка типов: фронтенд + backend (strict) |
| `npm run db:generate` | Сгенерировать миграцию из `server/db/schema.ts` |
| `npm run db:migrate` | Применить миграции |
| `npm run gen:key` | Ключ шифрования секретов продавцов |
| `npm run check:connection` | Проверка боевого токена площадки |

## Структура

```
src/                      Фронтенд: React 19, Vite, Tailwind 4 (демо-данные)
server.ts                 Существующий express-сервер (демо-эндпоинты + Gemini)
server/
  config/env.ts           Типизированное окружение с валидацией
  core/                   Ошибки, логи, шифрование, HTTP-клиент, лимитер, деньги
  connectors/             Контракт площадок + реестр
    types.ts              ← главный шов проекта
    wildberries/          Клиент, карта эндпоинтов, коннектор
  db/                     Схема Drizzle + миграции
  telegram/               Бот на grammY, команды, вебхук
  i18n/                   Каталоги ru/en
  http/platform.ts        /api/platform/* — честная диагностика
docs/                     Архитектура, подключение WB и Telegram, дорожная карта
```

## Документация

- [Архитектура](docs/ARCHITECTURE.md) — слои, решения и почему именно так
- [Подключение Wildberries](docs/INTEGRATION-WILDBERRIES.md) — токен, эндпоинты, грабли
- [Подключение Telegram](docs/INTEGRATION-TELEGRAM.md) — бот, вебхук, алерты
- [Дорожная карта](docs/ROADMAP.md) — этапы и критерии готовности

## Правила проекта

- Деньги — целые минорные единицы плюс код валюты. Никаких float.
- Время в БД — UTC. Локальные сутки считаются по таймзоне магазина.
- Секреты продавцов шифруются перед записью и не попадают в логи.
- Цифры считает код, а не языковая модель. Модель формулирует, но не считает.
- Данных нет — так и сказать. Не показывать правдоподобные выдуманные числа.
- Запись в маркетплейс по умолчанию запрещена (`ALLOW_MARKETPLACE_WRITES=false`).

## CI

Готовый workflow лежит в [docs/ci.workflow.yml](docs/ci.workflow.yml) — проверка
типов, сборка и контроль того, что миграции не отстали от схемы.

Он не в `.github/workflows/`, потому что у токена, которым делался коммит, нет
права `workflow`. Активировать одной командой:

```bash
mkdir -p .github/workflows && git mv docs/ci.workflow.yml .github/workflows/ci.yml
```

## Замечание о пакетном менеджере

В репозитории лежат и `bun.lock` (от генератора в AI Studio), и
`package-lock.json`. Канонический — npm. `bun.lock` можно удалить, чтобы не
разъезжались версии.

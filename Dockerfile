# Продакшен-образ CommerceOS.
#
# Две стадии: в первой ставим все зависимости и собираем, во вторую переносим
# только собранное и продакшен-зависимости. Инструменты сборки (vite, esbuild,
# typescript) в рантайм не попадают.
#
# Сборка: docker build -t commerceos .
# Запуск: см. docker-compose.prod.yml

# --- Стадия 1: сборка -------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Сначала манифесты: слой с npm ci переиспользуется, пока зависимости не менялись.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Собирает фронтенд в dist/ и сервер в dist/server.cjs
RUN npm run build

# --- Стадия 2: рантайм ------------------------------------------------------
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# tini как init: без него Node получает PID 1 и не обрабатывает SIGTERM,
# из-за чего graceful shutdown (остановка воркера и бота) не срабатывает.
RUN apk add --no-cache tini

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# dist содержит и сервер, и мигратор; drizzle-kit в рантайм не попадает.
COPY --from=build /app/dist ./dist
# SQL-файлы миграций читает мигратор на старте.
COPY --from=build /app/server/db/migrations ./server/db/migrations
COPY --from=build /app/docker/entrypoint.sh ./docker/entrypoint.sh

RUN chmod +x ./docker/entrypoint.sh && chown -R node:node /app

# Не root: контейнер, работающий от root, — лишний способ превратить баг в захват хоста.
USER node

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--", "./docker/entrypoint.sh"]

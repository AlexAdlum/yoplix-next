# Dockerfile для Yoplix
FROM node:18-alpine AS base

# Устанавливаем зависимости только когда они нужны
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Устанавливаем зависимости на основе предпочитаемого менеджера пакетов
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Пересобираем исходный код только когда нужно
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Создаем переменные окружения для сборки
ENV NEXT_PUBLIC_SITE_URL=https://yoplix.ru
ENV NEXT_PUBLIC_SITE_NAME=Yoplix
ENV NODE_ENV=production

RUN npm run build

# Продакшен образ, скопируем все файлы и запустим next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Автоматически используем output traces для уменьшения размера образа
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]




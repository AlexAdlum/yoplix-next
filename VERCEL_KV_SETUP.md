# Настройка Upstash Redis

Для работы с Redis хранилищем необходимо настроить Upstash Redis:

## 1. Установка Upstash Redis

Upstash Redis уже установлен в проекте:
```bash
npm install @upstash/redis
```

## 2. Настройка в Upstash Dashboard

1. Перейдите на [upstash.com](https://upstash.com)
2. Войдите в аккаунт (можно через GitHub)
3. Нажмите "Create Database"
4. Выберите "Global" и регион "eu-west-1"
5. Введите название: `yoplix-redis`
6. Нажмите "Create"
7. Скопируйте переменные окружения:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## 3. Установка переменных окружения

В Vercel Dashboard:
1. Перейдите в Settings → Environment Variables
2. Добавьте следующие переменные:
   ```
   UPSTASH_REDIS_REST_URL=your_upstash_rest_url_here
   UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token_here
   ```

## 4. Локальная разработка

Для локальной разработки создайте файл `.env.local`:
```bash
UPSTASH_REDIS_REST_URL=your_upstash_rest_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token_here
```

## 5. Проверка работы

После настройки переменных окружения:
1. Перезапустите приложение
2. Создайте комнату
3. Попробуйте присоединиться к игре
4. Проверьте логи в Vercel Functions

## Важно

- Vercel KV работает только в production окружении
- Для локальной разработки может потребоваться дополнительная настройка
- Все данные хранятся в Redis и доступны между всеми экземплярами функций

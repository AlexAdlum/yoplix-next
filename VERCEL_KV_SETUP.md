# Настройка Vercel KV

Для работы с Redis хранилищем необходимо настроить Vercel KV:

## 1. Установка Vercel KV

Vercel KV уже установлен в проекте:
```bash
npm install @vercel/kv
```

## 2. Настройка в Vercel Dashboard

1. Перейдите в [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите ваш проект `yoplix-next`
3. Перейдите в раздел "Storage"
4. Создайте новую KV базу данных
5. Скопируйте переменные окружения:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

## 3. Установка переменных окружения

В Vercel Dashboard:
1. Перейдите в Settings → Environment Variables
2. Добавьте следующие переменные:
   ```
   KV_REST_API_URL=your_kv_rest_api_url_here
   KV_REST_API_TOKEN=your_kv_rest_api_token_here
   KV_REST_API_READ_ONLY_TOKEN=your_kv_read_only_token_here
   ```

## 4. Локальная разработка

Для локальной разработки создайте файл `.env.local`:
```bash
KV_REST_API_URL=your_kv_rest_api_url_here
KV_REST_API_TOKEN=your_kv_rest_api_token_here
KV_REST_API_READ_ONLY_TOKEN=your_kv_read_only_token_here
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

#!/bin/bash

# Скрипт деплоя Yoplix
set -e

echo "🚀 Начинаем деплой Yoplix..."

# Проверяем наличие необходимых файлов
if [ ! -f "package.json" ]; then
    echo "❌ Файл package.json не найден!"
    exit 1
fi

if [ ! -f "next.config.ts" ]; then
    echo "❌ Файл next.config.ts не найден!"
    exit 1
fi

# Устанавливаем зависимости
echo "📦 Устанавливаем зависимости..."
npm ci --only=production

# Проверяем линтер
echo "🔍 Проверяем код..."
npm run lint

# Собираем проект
echo "🏗️ Собираем проект..."
npm run build

# Проверяем, что сборка прошла успешно
if [ ! -d ".next" ]; then
    echo "❌ Сборка не удалась!"
    exit 1
fi

echo "✅ Сборка завершена успешно!"

# Создаем архив для деплоя
echo "📦 Создаем архив для деплоя..."
tar -czf yoplix-deploy.tar.gz \
    .next \
    public \
    package.json \
    package-lock.json \
    next.config.ts \
    tsconfig.json \
    postcss.config.mjs \
    tailwind.config.js \
    app \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.next/cache

echo "📁 Архив создан: yoplix-deploy.tar.gz"

# Показываем размер архива
ARCHIVE_SIZE=$(du -h yoplix-deploy.tar.gz | cut -f1)
echo "📊 Размер архива: $ARCHIVE_SIZE"

echo "🎉 Деплой готов!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Загрузите архив yoplix-deploy.tar.gz на сервер"
echo "2. Распакуйте архив: tar -xzf yoplix-deploy.tar.gz"
echo "3. Установите зависимости: npm ci --only=production"
echo "4. Запустите приложение: npm start"
echo "5. Настройте Nginx для проксирования на порт 3000"
echo ""
echo "🌐 После деплоя проверьте:"
echo "- https://yoplix.ru"
echo "- https://yoplix.ru/sitemap.xml"
echo "- https://yoplix.ru/robots.txt"
echo "- https://yoplix.ru/privacy"



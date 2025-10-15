# PowerShell скрипт деплоя Yoplix для Windows
param(
    [switch]$Docker,
    [switch]$Archive
)

Write-Host "🚀 Начинаем деплой Yoplix..." -ForegroundColor Green

# Проверяем наличие необходимых файлов
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Файл package.json не найден!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "next.config.ts")) {
    Write-Host "❌ Файл next.config.ts не найден!" -ForegroundColor Red
    exit 1
}

# Устанавливаем зависимости
Write-Host "📦 Устанавливаем зависимости..." -ForegroundColor Yellow
npm ci --only=production

# Проверяем линтер
Write-Host "🔍 Проверяем код..." -ForegroundColor Yellow
npm run lint

# Собираем проект
Write-Host "🏗️ Собираем проект..." -ForegroundColor Yellow
npm run build

# Проверяем, что сборка прошла успешно
if (-not (Test-Path ".next")) {
    Write-Host "❌ Сборка не удалась!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Сборка завершена успешно!" -ForegroundColor Green

if ($Docker) {
    Write-Host "🐳 Создаем Docker образ..." -ForegroundColor Yellow
    docker build -t yoplix:latest .
    
    Write-Host "🚀 Запускаем контейнер..." -ForegroundColor Yellow
    docker run -d -p 3000:3000 --name yoplix-app yoplix:latest
    
    Write-Host "✅ Docker контейнер запущен!" -ForegroundColor Green
    Write-Host "🌐 Приложение доступно по адресу: http://localhost:3000" -ForegroundColor Cyan
}

if ($Archive) {
    Write-Host "📦 Создаем архив для деплоя..." -ForegroundColor Yellow
    
    # Создаем временную папку для архива
    $tempDir = "yoplix-deploy-temp"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    
    # Копируем необходимые файлы
    Copy-Item ".next" -Destination "$tempDir\.next" -Recurse -Force
    Copy-Item "public" -Destination "$tempDir\public" -Recurse -Force
    Copy-Item "package.json" -Destination "$tempDir\package.json" -Force
    Copy-Item "package-lock.json" -Destination "$tempDir\package-lock.json" -Force
    Copy-Item "next.config.ts" -Destination "$tempDir\next.config.ts" -Force
    Copy-Item "tsconfig.json" -Destination "$tempDir\tsconfig.json" -Force
    Copy-Item "postcss.config.mjs" -Destination "$tempDir\postcss.config.mjs" -Force
    Copy-Item "app" -Destination "$tempDir\app" -Recurse -Force
    
    # Создаем архив
    Compress-Archive -Path "$tempDir\*" -DestinationPath "yoplix-deploy.zip" -Force
    
    # Удаляем временную папку
    Remove-Item $tempDir -Recurse -Force
    
    $archiveSize = (Get-Item "yoplix-deploy.zip").Length / 1MB
    Write-Host "📁 Архив создан: yoplix-deploy.zip" -ForegroundColor Green
    Write-Host "📊 Размер архива: $([math]::Round($archiveSize, 2)) MB" -ForegroundColor Cyan
}

if (-not $Docker -and -not $Archive) {
    Write-Host "🎉 Деплой готов!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Доступные команды:" -ForegroundColor Yellow
    Write-Host "  .\deploy.ps1 -Docker    # Деплой через Docker" -ForegroundColor White
    Write-Host "  .\deploy.ps1 -Archive   # Создать архив для деплоя" -ForegroundColor White
    Write-Host "  npm start              # Запустить приложение" -ForegroundColor White
    Write-Host ""
    Write-Host "🌐 После деплоя проверьте:" -ForegroundColor Yellow
    Write-Host "- https://yoplix.ru" -ForegroundColor White
    Write-Host "- https://yoplix.ru/sitemap.xml" -ForegroundColor White
    Write-Host "- https://yoplix.ru/robots.txt" -ForegroundColor White
    Write-Host "- https://yoplix.ru/privacy" -ForegroundColor White
}

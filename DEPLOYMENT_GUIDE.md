# 🚀 Инструкции по деплою Yoplix

## 📋 Предварительная подготовка

### 1. Сервер требования
- **Node.js**: версия 18.0.0 или выше
- **npm**: версия 8.0.0 или выше
- **RAM**: минимум 512MB
- **Диск**: минимум 1GB свободного места
- **Порты**: 80, 443, 3000

### 2. Домен и SSL
- Настройте DNS записи для yoplix.ru
- Получите SSL сертификат (Let's Encrypt рекомендуется)
- Настройте редирект с www на основной домен

## 🐳 Деплой через Docker (Рекомендуется)

### Быстрый старт
```bash
# Сборка и запуск
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f yoplix
```

### Ручная сборка Docker образа
```bash
# Сборка образа
docker build -t yoplix:latest .

# Запуск контейнера
docker run -d -p 3000:3000 --name yoplix-app yoplix:latest

# Проверка
curl http://localhost:3000
```

## 📦 Деплой через архив

### Windows (PowerShell)
```powershell
# Создание архива
.\deploy.ps1 -Archive

# Загрузка архива на сервер и распаковка
# Установка зависимостей
npm ci --only=production

# Запуск
npm start
```

### Linux/macOS (Bash)
```bash
# Создание архива
chmod +x deploy.sh
./deploy.sh

# На сервере:
tar -xzf yoplix-deploy.tar.gz
npm ci --only=production
npm start
```

## ⚙️ Настройка Nginx

### 1. Установка Nginx
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. Конфигурация
```bash
# Копируем конфигурацию
sudo cp nginx.conf /etc/nginx/nginx.conf

# Проверяем конфигурацию
sudo nginx -t

# Перезапускаем Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 3. SSL сертификат (Let's Encrypt)
```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d yoplix.ru -d www.yoplix.ru

# Автообновление
sudo crontab -e
# Добавить: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 Настройка переменных окружения

### Создание .env.local
```bash
# На сервере создайте файл .env.local
nano .env.local
```

### Содержимое .env.local
```env
NEXT_PUBLIC_SITE_URL=https://yoplix.ru
NEXT_PUBLIC_SITE_NAME=Yoplix
NEXT_PUBLIC_SITE_DESCRIPTION=Yoplix - увлекательная онлайн платформа викторин
NODE_ENV=production
PORT=3000

# Добавьте ваши коды верификации
GOOGLE_VERIFICATION_CODE=your-google-code
YANDEX_VERIFICATION_CODE=your-yandex-code
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_YANDEX_METRIKA_ID=XXXXXXXX
```

## 🚀 Процесс деплоя

### 1. Подготовка сервера
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка Docker (опционально)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 2. Загрузка проекта
```bash
# Клонирование репозитория или загрузка архива
git clone <your-repo-url> yoplix
cd yoplix

# Или распаковка архива
tar -xzf yoplix-deploy.tar.gz
```

### 3. Установка и запуск
```bash
# Установка зависимостей
npm ci --only=production

# Сборка проекта
npm run build

# Запуск в продакшене
npm start
```

### 4. Настройка автозапуска (PM2)
```bash
# Установка PM2
npm install -g pm2

# Создание конфигурации PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'yoplix',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/yoplix',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Запуск через PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔍 Проверка деплоя

### Основные проверки
```bash
# Проверка доступности
curl -I https://yoplix.ru
curl -I https://yoplix.ru/sitemap.xml
curl -I https://yoplix.ru/robots.txt

# Проверка SSL
openssl s_client -connect yoplix.ru:443 -servername yoplix.ru

# Проверка производительности
curl -w "@curl-format.txt" -o /dev/null -s https://yoplix.ru
```

### Мониторинг
```bash
# Логи приложения
pm2 logs yoplix

# Статус процессов
pm2 status

# Мониторинг ресурсов
htop
df -h
free -h
```

## 🛠️ Обслуживание

### Обновление приложения
```bash
# Остановка приложения
pm2 stop yoplix

# Обновление кода
git pull origin main
npm ci --only=production
npm run build

# Запуск
pm2 start yoplix
```

### Резервное копирование
```bash
# Создание бэкапа
tar -czf yoplix-backup-$(date +%Y%m%d).tar.gz \
    .next \
    public \
    package.json \
    .env.local
```

## 🆘 Устранение неполадок

### Частые проблемы
1. **Порт 3000 занят**: `sudo lsof -i :3000`
2. **Ошибки сборки**: Проверьте версию Node.js
3. **SSL ошибки**: Проверьте сертификаты
4. **Nginx ошибки**: `sudo nginx -t`

### Логи
```bash
# Логи Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Логи приложения
pm2 logs yoplix --lines 100
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи приложения
2. Убедитесь в корректности переменных окружения
3. Проверьте настройки DNS и SSL
4. Обратитесь к документации Next.js

**Удачного деплоя! 🎉**

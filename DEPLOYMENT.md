# Инструкции по подключению домена yoplix.ru

## 🚀 Шаги для деплоя на домен yoplix.ru

### 1. Настройка DNS
Убедитесь, что DNS записи домена yoplix.ru указывают на ваш хостинг:
- A-запись: @ → IP адрес сервера
- CNAME: www → yoplix.ru
- A-запись: yoplix.ru → IP адрес сервера

### 2. SSL сертификат
Настройте SSL сертификат для домена:
- Используйте Let's Encrypt для бесплатного SSL
- Или приобретите коммерческий сертификат

### 3. Переменные окружения
Создайте файл `.env.local` с настройками:
```env
NEXT_PUBLIC_SITE_URL=https://yoplix.ru
NEXT_PUBLIC_SITE_NAME=Yoplix
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_YANDEX_METRIKA_ID=XXXXXXXX
GOOGLE_VERIFICATION_CODE=your-google-verification-code
YANDEX_VERIFICATION_CODE=your-yandex-verification-code
```

### 4. Сборка и деплой
```bash
# Сборка для продакшена
npm run build

# Запуск в продакшене
npm start
```

### 5. Проверка работы
После деплоя проверьте:
- ✅ https://yoplix.ru - главная страница
- ✅ https://yoplix.ru/sitemap.xml - карта сайта
- ✅ https://yoplix.ru/robots.txt - инструкции для роботов
- ✅ https://yoplix.ru/privacy - политика конфиденциальности
- ✅ https://yoplix.ru/quiz/movie-trivia - страница викторины

### 6. SEO оптимизация
1. Зарегистрируйте сайт в Google Search Console
2. Добавьте код верификации в переменные окружения
3. Зарегистрируйте сайт в Яндекс.Вебмастере
4. Добавьте код верификации в переменные окружения
5. Настройте Google Analytics и Яндекс.Метрику

### 7. Мониторинг
- Настройте мониторинг доступности сайта
- Проверяйте скорость загрузки
- Следите за ошибками в консоли браузера

## 📋 Чек-лист готовности к продакшену

- [ ] DNS записи настроены
- [ ] SSL сертификат установлен
- [ ] Переменные окружения настроены
- [ ] Сайт собирается без ошибок
- [ ] Все страницы доступны
- [ ] Мета-теги корректны
- [ ] Sitemap и robots.txt работают
- [ ] Google Analytics настроен
- [ ] Яндекс.Метрика настроена
- [ ] Сайт зарегистрирован в поисковых системах

## 🔧 Дополнительные настройки

### Nginx конфигурация (пример)
```nginx
server {
    listen 80;
    server_name yoplix.ru www.yoplix.ru;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yoplix.ru www.yoplix.ru;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### PM2 конфигурация
```json
{
  "apps": [{
    "name": "yoplix",
    "script": "npm",
    "args": "start",
    "cwd": "/path/to/yoplix",
    "instances": 1,
    "exec_mode": "cluster",
    "env": {
      "NODE_ENV": "production",
      "PORT": 3000
    }
  }]
}
```

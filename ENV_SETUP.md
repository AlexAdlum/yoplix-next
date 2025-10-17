# Переменные окружения для домена yoplix.ru

## 📋 Обязательные переменные

Создайте файл `.env.local` в корне проекта со следующими переменными:

```env
# Основные настройки сайта
NEXT_PUBLIC_SITE_URL=https://yoplix.ru
NEXT_PUBLIC_SITE_NAME=Yoplix
NEXT_PUBLIC_SITE_DESCRIPTION=Yoplix - увлекательная онлайн платформа викторин. Играй, угадывай, побеждай!

# Аналитика (замените на ваши ID)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_YANDEX_METRIKA_ID=XXXXXXXX

# Коды верификации поисковых систем
GOOGLE_VERIFICATION_CODE=your-google-verification-code
YANDEX_VERIFICATION_CODE=your-yandex-verification-code

# Настройки для продакшена
NODE_ENV=production
PORT=3000
```

## 🔧 Как получить коды верификации

### Google Search Console
1. Перейдите на https://search.google.com/search-console
2. Добавьте свойство yoplix.ru
3. Выберите метод "HTML-тег"
4. Скопируйте код верификации
5. Добавьте его в переменную `GOOGLE_VERIFICATION_CODE`

### Яндекс.Вебмастер
1. Перейдите на https://webmaster.yandex.ru
2. Добавьте сайт yoplix.ru
3. Выберите метод "HTML-файл" или "Мета-тег"
4. Скопируйте код верификации
5. Добавьте его в переменную `YANDEX_VERIFICATION_CODE`

### Google Analytics
1. Перейдите на https://analytics.google.com
2. Создайте новое свойство для yoplix.ru
3. Скопируйте ID отслеживания (G-XXXXXXXXXX)
4. Добавьте его в переменную `NEXT_PUBLIC_GA_ID`

### Яндекс.Метрика
1. Перейдите на https://metrica.yandex.ru
2. Создайте новый счетчик для yoplix.ru
3. Скопируйте ID счетчика
4. Добавьте его в переменную `NEXT_PUBLIC_YANDEX_METRIKA_ID`

## ⚠️ Важные замечания

- **НЕ добавляйте файл `.env.local` в Git** - он содержит конфиденциальную информацию
- **Используйте HTTPS** для всех URL в продакшене
- **Проверьте все ссылки** после деплоя
- **Обновите коды верификации** в метаданных после получения реальных кодов

## 🚀 Проверка после настройки

После настройки переменных окружения проверьте:

1. **Мета-теги**: Откройте исходный код страницы и убедитесь, что все мета-теги корректны
2. **Sitemap**: Перейдите на https://yoplix.ru/sitemap.xml
3. **Robots.txt**: Перейдите на https://yoplix.ru/robots.txt
4. **Аналитика**: Проверьте работу Google Analytics и Яндекс.Метрики
5. **Поисковые системы**: Убедитесь, что сайт прошел верификацию в Google и Яндекс


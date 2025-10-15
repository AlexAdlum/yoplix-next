import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link 
              href="/"
              className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-blue-500 hover:scale-105 transition-transform"
            >
              Yoplix
            </Link>
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              На главную
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-8">
            Политика конфиденциальности
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Дата последнего обновления:</strong> 15 октября 2025 г.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Общие положения</h2>
              <p className="text-gray-600 mb-4">
                Настоящая Политика конфиденциальности определяет порядок обработки персональных данных 
                пользователей сайта yoplix.ru (далее — «Сайт»), принадлежащего Yoplix.
              </p>
              <p className="text-gray-600">
                Используя наш Сайт, вы соглашаетесь с условиями настоящей Политики конфиденциальности.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Какие данные мы собираем</h2>
              <ul className="list-disc list-inside text-gray-600 mb-4">
                <li>Информация, которую вы предоставляете при регистрации</li>
                <li>Результаты прохождения викторин</li>
                <li>Техническая информация (IP-адрес, тип браузера, операционная система)</li>
                <li>Информация о взаимодействии с Сайтом</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">3. Как мы используем ваши данные</h2>
              <ul className="list-disc list-inside text-gray-600 mb-4">
                <li>Предоставление доступа к викторинам</li>
                <li>Сохранение результатов и статистики</li>
                <li>Улучшение функциональности Сайта</li>
                <li>Обеспечение безопасности</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Защита данных</h2>
              <p className="text-gray-600 mb-4">
                Мы применяем современные методы защиты информации и не передаем ваши персональные данные 
                третьим лицам без вашего согласия, за исключением случаев, предусмотренных законодательством.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">5. Ваши права</h2>
              <p className="text-gray-600 mb-4">
                Вы имеете право запросить доступ к вашим персональным данным, их исправление или удаление. 
                Для этого свяжитесь с нами по адресу: privacy@yoplix.ru
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">6. Контактная информация</h2>
              <p className="text-gray-600 mb-4">
                Если у вас есть вопросы по настоящей Политике конфиденциальности, 
                обращайтесь к нам:
              </p>
              <ul className="list-disc list-inside text-gray-600">
                <li>Email: privacy@yoplix.ru</li>
                <li>Сайт: yoplix.ru</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="text-sm text-gray-300 mb-4 sm:mb-0">
              © Yoplix, 2025
            </div>
            <div className="flex space-x-6">
              <Link 
                href="/privacy" 
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                Политика конфиденциальности
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";

// Статичные данные викторин
const quizzes = [
  {
    id: 1,
    slug: "movie-trivia",
    title: "Кино-викторина",
    description: "Проверь свои знания о фильмах и актёрах! От классики до современных блокбастеров.",
    type: "Развлечения",
    price: 0,
  },
  {
    id: 2,
    slug: "science-quiz",
    title: "Научные факты",
    description: "Узнай интересные факты из мира науки и техники. От физики до биологии!",
    type: "Образование",
    price: 150,
  },
  {
    id: 3,
    slug: "history-challenge",
    title: "Исторический вызов",
    description: "Путешествие сквозь века: от древних цивилизаций до современности.",
    type: "История",
    price: 200,
  },
  {
    id: 4,
    slug: "sports-master",
    title: "Спортивный мастер",
    description: "Все о спорте: футбол, баскетбол, олимпиады и спортивные рекорды.",
    type: "Спорт",
    price: 0,
  },
  {
    id: 5,
    slug: "music-notes",
    title: "Музыкальные ноты",
    description: "Угадай исполнителей, песни и музыкальные жанры разных эпох.",
    type: "Музыка",
    price: 100,
  },
  {
    id: 6,
    slug: "geography-world",
    title: "География мира",
    description: "Исследуй страны, столицы, флаги и достопримечательности планеты.",
    type: "География",
    price: 0,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-blue-500">
              Yoplix
            </h1>
            <p className="mt-2 text-lg sm:text-xl text-gray-600 font-medium">
              Играй. Угадывай. Побеждай.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
            Выбери свою викторину
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Открой для себя мир увлекательных викторин! Проверь свои знания, 
            соревнуйся с друзьями и узнавай что-то новое каждый день.
          </p>
        </div>

        {/* Quiz Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/quiz/${quiz.slug}`}
              className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <span className="inline-block px-3 py-1 text-xs font-semibold text-white rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                    {quiz.type}
                  </span>
                  <span className="text-lg font-bold text-gray-800">
                    {quiz.price === 0 ? (
                      <span className="text-green-600">Бесплатно</span>
                    ) : (
                      <span className="text-yellow-600">{quiz.price}₽</span>
                    )}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors">
                  {quiz.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {quiz.description}
                </p>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Нажми для подробностей
                  </span>
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-pink-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
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

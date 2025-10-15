import Link from "next/link";
import { notFound } from "next/navigation";

// Статичные данные викторин (дублируем для простоты)
const quizzes = [
  {
    id: 1,
    slug: "movie-trivia",
    title: "Кино-викторина",
    description: "Проверь свои знания о фильмах и актёрах! От классики до современных блокбастеров.",
    type: "Развлечения",
    price: 0,
    questions: 15,
    duration: "10 минут",
  },
  {
    id: 2,
    slug: "science-quiz",
    title: "Научные факты",
    description: "Узнай интересные факты из мира науки и техники. От физики до биологии!",
    type: "Образование",
    price: 150,
    questions: 20,
    duration: "15 минут",
  },
  {
    id: 3,
    slug: "history-challenge",
    title: "Исторический вызов",
    description: "Путешествие сквозь века: от древних цивилизаций до современности.",
    type: "История",
    price: 200,
    questions: 25,
    duration: "20 минут",
  },
  {
    id: 4,
    slug: "sports-master",
    title: "Спортивный мастер",
    description: "Все о спорте: футбол, баскетбол, олимпиады и спортивные рекорды.",
    type: "Спорт",
    price: 0,
    questions: 18,
    duration: "12 минут",
  },
  {
    id: 5,
    slug: "music-notes",
    title: "Музыкальные ноты",
    description: "Угадай исполнителей, песни и музыкальные жанры разных эпох.",
    type: "Музыка",
    price: 100,
    questions: 16,
    duration: "10 минут",
  },
  {
    id: 6,
    slug: "geography-world",
    title: "География мира",
    description: "Исследуй страны, столицы, флаги и достопримечательности планеты.",
    type: "География",
    price: 0,
    questions: 22,
    duration: "18 минут",
  },
];

interface QuizPageProps {
  params: {
    slug: string;
  };
}

export default function QuizPage({ params }: QuizPageProps) {
  const quiz = quizzes.find((q) => q.slug === params.slug);

  if (!quiz) {
    notFound();
  }

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
              Назад к каталогу
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Quiz Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-white">
            <div className="flex justify-between items-start mb-4">
              <span className="inline-block px-4 py-2 text-sm font-semibold bg-white/20 rounded-full">
                {quiz.type}
              </span>
              <span className="text-2xl font-bold">
                {quiz.price === 0 ? (
                  <span className="text-green-300">Бесплатно</span>
                ) : (
                  <span className="text-yellow-300">{quiz.price}₽</span>
                )}
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              {quiz.title}
            </h1>
            
            <p className="text-lg text-blue-100 mb-6">
              {quiz.description}
            </p>
            
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {quiz.questions} вопросов
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {quiz.duration}
              </div>
            </div>
          </div>

          {/* Quiz Content */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Готов начать викторину?
              </h2>
              <p className="text-gray-600 mb-6">
                Проверь свои знания и узнай что-то новое! 
                {quiz.price > 0 && " После оплаты ты получишь доступ к полной версии викторины."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {quiz.price > 0 ? (
                <>
                  <button className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-pink-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg">
                    Оплатить {quiz.price}₽
                  </button>
                  <button className="px-8 py-4 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors">
                    Демо-версия
                  </button>
                </>
              ) : (
                <button className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg">
                  Начать игру
                </button>
              )}
            </div>

            {/* Additional Info */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Мгновенная проверка</h3>
                <p className="text-sm text-gray-600">Получай результаты сразу после каждого ответа</p>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Быстрая игра</h3>
                <p className="text-sm text-gray-600">Играй в любое время, где угодно</p>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Соревнуйся</h3>
                <p className="text-sm text-gray-600">Сравни результаты с друзьями</p>
              </div>
            </div>
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

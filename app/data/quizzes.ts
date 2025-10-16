export type Quiz = {
  id: number;
  slug: string;
  title: string;
  description: string;
  type: string;
  price: number;
  questions?: number;
  duration?: string;
};

export const quizzes: Quiz[] = [
  {
    id: 1,
    slug: "movie-trivia",
    title: "Кино-викторина",
    description:
      "Проверь свои знания о фильмах и актёрах! От классики до современных блокбастеров.",
    type: "Развлечения",
    price: 0,
    questions: 15,
    duration: "10 минут",
  },
  {
    id: 2,
    slug: "science-quiz",
    title: "Научные факты",
    description:
      "Узнай интересные факты из мира науки и техники. От физики до биологии!",
    type: "Образование",
    price: 150,
    questions: 20,
    duration: "15 минут",
  },
  {
    id: 3,
    slug: "history-challenge",
    title: "Исторический вызов",
    description:
      "Путешествие сквозь века: от древних цивилизаций до современности.",
    type: "История",
    price: 200,
    questions: 25,
    duration: "20 минут",
  },
  {
    id: 4,
    slug: "sports-master",
    title: "Спортивный мастер",
    description:
      "Все о спорте: футбол, баскетбол, олимпиады и спортивные рекорды.",
    type: "Спорт",
    price: 0,
    questions: 18,
    duration: "12 минут",
  },
  {
    id: 5,
    slug: "music-notes",
    title: "Музыкальные ноты",
    description:
      "Угадай исполнителей, песни и музыкальные жанры разных эпох.",
    type: "Музыка",
    price: 100,
    questions: 16,
    duration: "10 минут",
  },
  {
    id: 6,
    slug: "geography-world",
    title: "География мира",
    description:
      "Исследуй страны, столицы, флаги и достопримечательности планеты.",
    type: "География",
    price: 0,
    questions: 22,
    duration: "18 минут",
  },
  {
    id: 7,
    slug: "party-quizz",
    title: "Весёлая викторина для вечеринки",
    description: "Увлекательные вопросы о мемах, трендах и современной культуре. Отлично подходит для дружеских посиделок!",
    type: "Развлечения",
    price: 0,
    questions: 15,
    duration: "10 минут",
  },
];

export function getQuizBySlug(slug: string) {
  return quizzes.find((q) => q.slug === slug);
}


import questionsData from '@/app/data/questions.json';
import mechanicsData from '@/app/data/mechanics.json';

export type Question = {
  Slug: string;
  questionID: number;
  question: string;
  mechanicsType: string;
  answerCost: number;
  answer1: string | number;
  comment: string;
  category: string;
  wrong1: string;
  wrong2: string;
  wrong3: string;
};

export type Mechanics = {
  mechanicsType: string;
  script: string;
  promptText: string;
};

export type GameSession = {
  roomId: string;
  currentQuestionIndex: number;
  questions: Question[];
  mechanics: Mechanics | null;
  isActive: boolean;
  isGameStarted: boolean;
  questionStartTime: number;
};

// Хранилище активных игровых сессий
const gameSessions = new Map<string, GameSession>();

// Функция для генерации псевдослучайного числа на основе seed
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Функция для перемешивания массива с использованием seed
function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let currentSeed = seed;
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const j = Math.floor(seededRandom(currentSeed) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

export function startQuiz(roomId: string, slug: string): GameSession {
  // Фильтруем вопросы по slug и механике
  const filteredQuestions = questionsData.filter((q: unknown) => (q as Question).Slug === slug) as Question[];
  
  if (filteredQuestions.length === 0) {
    throw new Error(`No questions found for quiz: ${slug}`);
  }
  
  // Получаем механику для первого вопроса (предполагаем, что все вопросы одной викторины используют одну механику)
  const mechanicsType = filteredQuestions[0]?.mechanicsType;
  const mechanics = mechanicsData.find((m: Mechanics) => m.mechanicsType === mechanicsType) || null;
  
  // Создаем seed на основе roomId для консистентной случайности
  const seed = roomId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Выбираем 15 случайных вопросов для этой сессии с использованием seed
  const shuffled = seededShuffle(filteredQuestions, seed);
  const selectedQuestions = shuffled.slice(0, 15);
  
  const session: GameSession = {
    roomId,
    currentQuestionIndex: 0,
    questions: selectedQuestions,
    mechanics,
    isActive: true,
    isGameStarted: true,
    questionStartTime: Date.now(),
  };
  
  gameSessions.set(roomId, session);
  return session;
}

export function getCurrentQuestion(roomId: string): Question | null {
  const session = gameSessions.get(roomId);
  if (!session || !session.isActive || session.currentQuestionIndex >= session.questions.length) {
    return null;
  }
  return session.questions[session.currentQuestionIndex];
}

export function getGameSession(roomId: string): GameSession | null {
  return gameSessions.get(roomId) || null;
}

export function nextQuestion(roomId: string): Question | null {
  const session = gameSessions.get(roomId);
  if (!session || !session.isActive) return null;
  
  session.currentQuestionIndex++;
  session.questionStartTime = Date.now();
  
  if (session.currentQuestionIndex >= session.questions.length) {
    // Викторина завершена
    session.isActive = false;
    return null;
  }
  
  return session.questions[session.currentQuestionIndex];
}

export function generateRandomAnswers(question: Question, roomId?: string): string[] {
  const answers = [String(question.answer1), question.wrong1, question.wrong2, question.wrong3];
  
  if (roomId) {
    // Используем seed на основе roomId и questionID для консистентности
    const seed = roomId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + question.questionID;
    return seededShuffle(answers, seed);
  }
  
  // Если roomId не передан, используем обычную случайность (для обратной совместимости)
  return answers.sort(() => Math.random() - 0.5);
}

export function checkAnswer(question: Question, selectedAnswer: string): boolean {
  return selectedAnswer === String(question.answer1);
}

export function endQuiz(roomId: string) {
  const session = gameSessions.get(roomId);
  if (session) {
    session.isActive = false;
  }
}

export function getGameStatus(roomId: string): { isGameStarted: boolean; isActive: boolean } | null {
  const session = gameSessions.get(roomId);
  if (!session) return null;
  
  return {
    isGameStarted: session.isGameStarted,
    isActive: session.isActive,
  };
}

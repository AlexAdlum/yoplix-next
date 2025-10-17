import { RedisStorage } from './redis';
import questionsData from '../data/questions.json';
import mechanicsData from '../data/mechanics.json';

export type Question = {
  questionID: number;
  question: string;
  answer1: string;
  wrong1: string;
  wrong2: string;
  wrong3: string;
  answerCost: number;
  Slug: string;
  mechanicsType: string;
  comment: string;
  category: string;
};

export type Mechanics = {
  mechanicsType: string;
  name: string;
  description: string;
  rules: string;
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

// Функция для генерации псевдослучайного числа на основе seed
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Функция для перемешивания массива с использованием seed
function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function startQuiz(roomId: string, slug: string): Promise<GameSession> {
  console.log('quizEngineRedis - startQuiz - roomId:', roomId, 'slug:', slug);
  console.log('quizEngineRedis - environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
    hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
  });
  
  // Фильтруем вопросы по slug и механике
  const filteredQuestions = questionsData.filter((q: unknown) => (q as Question).Slug === slug) as Question[];
  
  console.log('quizEngineRedis - filtered questions count:', filteredQuestions.length);
  
  if (filteredQuestions.length === 0) {
    throw new Error(`No questions found for quiz: ${slug}`);
  }
  
  // Получаем механику для первого вопроса
  const mechanicsType = filteredQuestions[0]?.mechanicsType;
  const mechanics = mechanicsData.find((m: Record<string, unknown>) => m.mechanicsType === mechanicsType) || null;
  
  console.log('quizEngineRedis - mechanicsType:', mechanicsType);
  
  // Создаем seed на основе roomId для консистентной случайности
  const seed = roomId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  console.log('quizEngineRedis - seed:', seed);
  
  // Выбираем 15 случайных вопросов для этой сессии с использованием seed
  const shuffled = seededShuffle(filteredQuestions, seed);
  const selectedQuestions = shuffled.slice(0, 15);
  
  console.log('quizEngineRedis - selected questions count:', selectedQuestions.length);
  console.log('quizEngineRedis - selected question IDs:', selectedQuestions.map(q => q.questionID));
  
  const session: GameSession = {
    roomId,
    currentQuestionIndex: 0,
    questions: selectedQuestions,
    mechanics: mechanics as Mechanics | null,
    isActive: true,
    isGameStarted: true,
    questionStartTime: Date.now(),
  };
  
  await RedisStorage.setGameSession(roomId, session);
  console.log('quizEngineRedis - session created and stored in Redis');
  
  // Проверяем, что сессия действительно сохранилась
  const savedSession = await RedisStorage.getGameSession(roomId);
  console.log('quizEngineRedis - verification - session saved correctly:', savedSession ? 'YES' : 'NO');
  if (savedSession) {
    console.log('quizEngineRedis - verification - session details:', {
      isActive: savedSession.isActive,
      isGameStarted: savedSession.isGameStarted,
      questionsCount: savedSession.questions?.length || 0
    });
  }
  
  return session;
}

export async function getCurrentQuestion(roomId: string): Promise<Question | null> {
  console.log('quizEngineRedis - getCurrentQuestion - roomId:', roomId);
  
  const session = await RedisStorage.getGameSession(roomId);
  console.log('quizEngineRedis - session found:', session ? 'YES' : 'NO');
  
  if (!session) {
    console.log('quizEngineRedis - no session found for roomId:', roomId);
    return null;
  }
  
  console.log('quizEngineRedis - session details:', {
    isActive: session.isActive,
    isGameStarted: session.isGameStarted,
    currentQuestionIndex: session.currentQuestionIndex,
    questionsLength: session.questions?.length || 0
  });
  
  if (!session.isActive) {
    console.log('quizEngineRedis - session is not active');
    return null;
  }
  
  if (!session.isGameStarted) {
    console.log('quizEngineRedis - game not started yet');
    return null;
  }
  
  if (session.currentQuestionIndex >= session.questions.length) {
    console.log('quizEngineRedis - no more questions available');
    return null;
  }
  
  const question = session.questions[session.currentQuestionIndex];
  console.log('quizEngineRedis - returning question ID:', question.questionID);
  
  return question;
}

export async function getGameSession(roomId: string): Promise<GameSession | null> {
  console.log('quizEngineRedis - getGameSession - roomId:', roomId);
  
  const session = await RedisStorage.getGameSession(roomId);
  console.log('quizEngineRedis - session found:', session ? 'YES' : 'NO');
  
  if (session) {
    console.log('quizEngineRedis - session details:', {
      roomId: session.roomId,
      currentQuestionIndex: session.currentQuestionIndex,
      questionsCount: session.questions.length,
      isActive: session.isActive,
      isGameStarted: session.isGameStarted
    });
  }
  
  return session;
}

export async function nextQuestion(roomId: string): Promise<Question | null> {
  try {
    console.log('quizEngineRedis - nextQuestion - roomId:', roomId);
    
    const session = await RedisStorage.getGameSession(roomId);
    console.log('quizEngineRedis - session found:', session ? 'YES' : 'NO');
    
    if (!session || !session.isActive) {
      console.log('quizEngineRedis - no active session');
      return null;
    }
    
    console.log('quizEngineRedis - current index:', session.currentQuestionIndex, 'total questions:', session.questions.length);
    
    session.currentQuestionIndex++;
    session.questionStartTime = Date.now();
    
    console.log('quizEngineRedis - new index:', session.currentQuestionIndex);
    
    if (session.currentQuestionIndex >= session.questions.length) {
      // Викторина завершена
      console.log('quizEngineRedis - quiz finished!');
      session.isActive = false;
      await RedisStorage.setGameSession(roomId, session);
      return null;
    }
    
    const nextQuestion = session.questions[session.currentQuestionIndex];
    console.log('quizEngineRedis - returning question ID:', nextQuestion.questionID);
    
    // Сохраняем обновленную сессию
    await RedisStorage.setGameSession(roomId, session);
    
    return nextQuestion;
  } catch (error) {
    console.error('quizEngineRedis - nextQuestion error:', error);
    return null;
  }
}

export function generateRandomAnswers(question: Question, roomId?: string): string[] {
  const answers = [String(question.answer1), question.wrong1, question.wrong2, question.wrong3];
  
  if (roomId) {
    const seed = roomId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + question.questionID;
    return seededShuffle(answers, seed);
  }
  
  return answers.sort(() => Math.random() - 0.5);
}

export function checkAnswer(question: Question, answer: string): boolean {
  return String(question.answer1) === answer;
}

export async function getGameStatus(roomId: string): Promise<{ isGameStarted: boolean; isActive: boolean } | null> {
  console.log('quizEngineRedis - getGameStatus - roomId:', roomId);
  
  const session = await RedisStorage.getGameSession(roomId);
  if (!session) {
    console.log('quizEngineRedis - no session found');
    return null;
  }
  
  const status = {
    isGameStarted: session.isGameStarted,
    isActive: session.isActive,
  };
  
  console.log('quizEngineRedis - game status:', status);
  
  return status;
}

export async function endQuiz(roomId: string): Promise<void> {
  console.log('quizEngineRedis - endQuiz - roomId:', roomId);
  
  const session = await RedisStorage.getGameSession(roomId);
  if (session) {
    session.isActive = false;
    await RedisStorage.setGameSession(roomId, session);
    console.log('quizEngineRedis - quiz ended');
  }
}

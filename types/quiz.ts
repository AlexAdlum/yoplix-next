/**
 * Типы данных для системы механик викторин
 */

export type MechanicsType = 'simple4' | 'blitz' | 'single_picture' | 'single_answer_picture' | string;

/**
 * Вопрос викторины с полной информацией
 */
export interface QuizQuestion {
  Slug: string;
  questionID: number;
  question: string;
  mechanicsType: MechanicsType;
  answerCost: number;
  answer1: string;
  wrong1?: string;
  wrong2?: string;
  wrong3?: string;
  promptText?: string; // из quizz_mechanics.xlsx
  comment?: string;
  category?: string;
  pic1?: string;
  pic2?: string;
}

/**
 * Счёт игрока в сессии
 */
export interface PlayerScore {
  playerId: string;
  nickname: string;
  avatarUrl: string;
  totalPoints: number;
  correctCount: number;
  totalTimeCorrectMs: number;
}

/**
 * Ответ игрока на вопрос
 */
export interface PlayerAnswer {
  option: string;
  isCorrect: boolean;
  at: number; // timestamp
}

/**
 * Фаза игровой сессии
 */
export type SessionPhase = 'idle' | 'question' | 'reveal' | 'postgamePending';

/**
 * Состояние игровой сессии
 */
export interface SessionState {
  roomId: string;
  slug: string;
  currentQuestionID: number | null;
  currentQuestionIndex: number;
  phase: SessionPhase;
  startedAt?: number;
  questionStartedAt?: number; // timestamp начала текущего вопроса
  players: Record<string, PlayerScore>; // playerId -> score
  answers: Record<string, PlayerAnswer>; // playerId -> answer на текущий вопрос
  firstCorrectPlayerId?: string | null; // кто получил бонус на текущем вопросе
  totalQuestions: number;
  selectedQuestions: number[]; // IDs выбранных вопросов
  shuffledOptions?: string[]; // перемешанные варианты для текущего вопроса
  // Снимок результатов с заморозкой игроков
  lastResults?: {
    playersSnapshot: Record<string, PlayerScore>; // замороженные метрики
    endedAt: number;       // когда игроки ответили на все вопросы
    autoFinishAt: number;  // endedAt + 15 * 60 * 1000
    finalResults?: {
      winners: Array<{ id: string; nickname: string; avatarUrl: string; points: number }>;
      fastest?: { id: string; nickname: string; avatarUrl: string; avgMs: number } | null;
      mostProductive?: { id: string; nickname: string; avatarUrl: string; correct: number } | null;
    };
  } | false; // false либо объект (нет — не показываем)
}

/**
 * Механика викторины из quizz_mechanics.xlsx
 */
export interface QuizMechanics {
  mechanicsType: string;
  script: string;
  promptText: string;
}


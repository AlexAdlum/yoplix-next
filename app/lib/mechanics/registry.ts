/**
 * Реестр механик викторин
 */

import type { QuizQuestion, SessionState } from '@/types/quiz';

/**
 * Результат представления вопроса для клиента
 */
export interface PresentQuestionResult {
  promptText?: string;
  options: string[]; // уже перемешанные варианты
  correct: string;   // правильный ответ (для серверной валидации)
}

/**
 * Аргументы для обработки ответа
 */
export interface AcceptAnswerArgs {
  state: SessionState;
  q: QuizQuestion;
  playerId: string;
  option: string;
  now: number;
}

/**
 * Результат обработки ответа
 */
export interface AcceptAnswerResult {
  isCorrect: boolean;
}

/**
 * Аргументы для события "все ответили"
 */
export interface AllAnsweredArgs {
  state: SessionState;
  q: QuizQuestion;
}

/**
 * Обработчик механики викторины
 */
export type MechanicsHandler = {
  /**
   * Подготовить вопрос для отображения клиентам
   */
  presentQuestion: (q: QuizQuestion) => PresentQuestionResult;
  
  /**
   * Принять и обработать ответ игрока
   */
  acceptAnswer: (args: AcceptAnswerArgs) => AcceptAnswerResult;
  
  /**
   * Обработчик события "все игроки ответили" (опционально)
   */
  onAllAnswered?: (args: AllAnsweredArgs) => void;
};

/**
 * Реестр зарегистрированных механик
 */
const mechanicsRegistry: Record<string, MechanicsHandler> = {};

/**
 * Зарегистрировать механику
 */
export function registerMechanics(type: string, handler: MechanicsHandler): void {
  mechanicsRegistry[type] = handler;
}

/**
 * Получить обработчик механики по типу
 */
export function getMechanics(type: string): MechanicsHandler {
  const handler = mechanicsRegistry[type];
  if (!handler) {
    console.warn(`[MECHANICS] Type "${type}" not found, using fallback "simple4"`);
    const fallback = mechanicsRegistry['simple4'];
    if (!fallback) {
      throw new Error(`Mechanics not found: ${type} (and fallback "simple4" also missing)`);
    }
    return fallback;
  }
  return handler;
}

/**
 * Проверить, зарегистрирована ли механика
 */
export function hasMechanics(type: string): boolean {
  return type in mechanicsRegistry;
}

export default mechanicsRegistry;


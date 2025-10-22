/**
 * Инициализация и экспорт всех механик
 */

import { registerMechanics } from './registry';
import simple4 from './simple4';

/**
 * Инициализировать все механики
 * Вызывается один раз при старте приложения
 */
export function initMechanics(): void {
  registerMechanics('simple4', simple4);
}

// Экспорт для использования в других модулях
export { registerMechanics, getMechanics, hasMechanics } from './registry';
export type { MechanicsHandler, PresentQuestionResult, AcceptAnswerArgs, AcceptAnswerResult } from './registry';


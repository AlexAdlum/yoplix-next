/**
 * Механика simple4: 4 варианта ответа в случайном порядке
 */

import type { MechanicsHandler } from './registry';
import type { QuizQuestion } from '@/types/quiz';

/**
 * Перемешать массив (Fisher-Yates shuffle)
 */
function shuffled<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Обработчик механики simple4
 */
const simple4: MechanicsHandler = {
  /**
   * Подготовить вопрос: собрать варианты и перемешать
   */
  presentQuestion(q: QuizQuestion) {
    // Собираем все варианты ответов
    const allOptions = [q.answer1, q.wrong1, q.wrong2, q.wrong3]
      .filter((opt): opt is string => Boolean(opt));
    
    // Перемешиваем
    const options = shuffled(allOptions);
    
    return {
      promptText: q.promptText,
      options,
      correct: q.answer1,
    };
  },

  /**
   * Принять ответ игрока и обновить счёт
   */
  acceptAnswer({ state, q, playerId, option, now }) {
    const isCorrect = option === q.answer1;
    
    // Идёмпотентность: только первый ответ игрока на этот вопрос учитываем
    if (!state.answers[playerId]) {
      state.answers[playerId] = { option, isCorrect, at: now };

      // Если правильный ответ — начисляем очки и обновляем статистику
      if (isCorrect) {
        // Инициализируем игрока, если его ещё нет в players
        if (!state.players[playerId]) {
          state.players[playerId] = {
            playerId,
            nickname: 'Player', // будет обновлено из реальных данных
            avatarUrl: '',
            totalPoints: 0,
            correctCount: 0,
            totalTimeCorrectMs: 0,
          };
        }

        const ps = state.players[playerId];
        const elapsed = Math.max(0, now - (state.questionStartedAt ?? now));
        
        // Начисляем очки за правильный ответ
        ps.totalPoints += q.answerCost;
        ps.correctCount += 1;
        ps.totalTimeCorrectMs += elapsed;

        // Бонус +1 балл за первую верную попытку на вопросе
        if (!state.firstCorrectPlayerId) {
          state.firstCorrectPlayerId = playerId;
          ps.totalPoints += 1;
        }
      }
    }

    return { isCorrect };
  },

  /**
   * Все игроки ответили на вопрос
   */
  onAllAnswered({ state }) {
    // Переводим фазу в reveal (комментарий будет показан)
    state.phase = 'reveal';
  },
};

export default simple4;


import { NextRequest, NextResponse } from "next/server";
import { initMechanics, getMechanics } from "@/app/lib/mechanics";
import { redis } from "@/app/lib/redis";
import type { SessionState, QuizQuestion, PlayerScore, PostgamePending, FinalResults } from "@/types/quiz";
import questions from "@/app/data/questions.json";
import { pickRandomIds } from '@/app/lib/random';
import { getQuestionsBySlug } from '@/app/lib/quiz';
import mechanics from "@/app/data/mechanics.json";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Инициализируем механики при загрузке модуля
initMechanics();

// Helpers for postgame results
export const POSTGAME_WAIT_MS = 15 * 60 * 1000;

function computeFinalResults(players: Record<string, PlayerScore>): FinalResults {
  const list = Object.values(players ?? {});
  if (!list.length) {
    return { winners: [] };
  }

  // Winners: топ по очкам
  list.sort((a, b) => b.totalPoints - a.totalPoints);
  const winner = list[0] ?? null;

  // Fastest: минимальный avgMs среди тех, у кого correctCount > 0
  const withCorrect = list.filter(p => (p.correctCount ?? 0) > 0);
  const fastest = withCorrect.length
    ? withCorrect
        .map(p => ({ ...p, avgMs: p.totalTimeCorrectMs / p.correctCount }))
        .sort((a, b) => a.avgMs - b.avgMs)[0]
    : null;

  // Most productive: максимальный correctCount
  const mostProductive = list.length
    ? [...list].sort((a, b) => (b.correctCount ?? 0) - (a.correctCount ?? 0))[0]
    : null;

  const result: FinalResults = {
    winners: winner ? [{ id: winner.playerId, nickname: winner.nickname, avatarUrl: winner.avatarUrl, points: winner.totalPoints }] : [],
  };
  if (fastest) {
    result.fastest = { id: fastest.playerId, nickname: fastest.nickname, avatarUrl: fastest.avatarUrl, timeMs: Math.round(fastest.avgMs) };
  }
  if (mostProductive) {
    result.mostProductive = { id: mostProductive.playerId, nickname: mostProductive.nickname, avatarUrl: mostProductive.avatarUrl, correct: mostProductive.correctCount };
  }
  return result;
}

// Type guard for lastResults narrowing
function isPostgamePending(lr: SessionState['lastResults']): lr is PostgamePending {
  return Boolean(lr) && lr !== false;
}

/**
 * Получить вопрос по ID
 */
function getQuestionById(questionID: number): QuizQuestion | undefined {
  return (questions as QuizQuestion[]).find(q => q.questionID === questionID);
}

/**
 * Обогатить вопрос данными из mechanics.json
 */
function enrichQuestionWithMechanics(question: QuizQuestion): QuizQuestion {
  const mechanicsData = mechanics.find(m => m.mechanicsType === question.mechanicsType);
  if (mechanicsData) {
    return {
      ...question,
      promptText: mechanicsData.promptText.replace('answerCost', String(question.answerCost)),
    };
  }
  return question;
}

/**
 * Получить состояние сессии из Redis
 */
async function getSessionState(roomId: string): Promise<SessionState | null> {
  const key = `session:${roomId}:state`;
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data) as SessionState;
}

/**
 * Сохранить состояние сессии в Redis
 */
async function saveSessionState(roomId: string, state: SessionState): Promise<void> {
  const key = `session:${roomId}:state`;
  await redis.set(key, JSON.stringify(state));
}

/**
 * POST /api/sessions/[roomId]/quiz
 * Действия: start, next, end, answer
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await req.json() as Record<string, unknown>;
    const { action } = body;

    console.log(`[Quiz API] POST ${action} for room ${roomId}`);

    // Автозавершение постгейма
    const s0 = await getSessionState(roomId);
    if (s0 && s0.phase === 'postgamePending' && isPostgamePending(s0.lastResults) && Date.now() >= s0.lastResults.autoFinishAt) {
      (s0 as SessionState).phase = 'idle';
      (s0 as SessionState).currentQuestionID = null;
      await saveSessionState(roomId, s0 as SessionState);
      return NextResponse.json({ finished: true, lastResults: s0.lastResults, autoFinished: true });
    }

    // ===== START: Начать новый вопрос =====
    if (action === "start") {
      const { slug } = body as { slug: string };
      const state0 = await getSessionState(roomId);
      if (!state0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

      // Используем уже предвыбранные вопросы; если их нет — безопасный fallback
      let selected = (state0 as SessionState).selectedQuestions;
      if (!selected || selected.length === 0) {
        const quizQuestions = await getQuestionsBySlug(slug);
        if (quizQuestions.length === 0) {
          return NextResponse.json({ error: 'No questions found for this quiz' }, { status: 404 });
        }
        const allIds = quizQuestions.map(q => q.questionID);
        selected = pickRandomIds(allIds, Math.min(15, allIds.length));
        (state0 as SessionState).selectedQuestions = selected; // persist fallback
        console.log('[START] fallback preselect', { roomId, first: selected[0] });
      } else {
        console.log('[START] using preselected questions', { roomId, first: selected[0] });
      }

      const now = Date.now();
      (state0 as SessionState).currentQuestionIndex = 0;
      (state0 as SessionState).currentQuestionID = selected[0];
      (state0 as SessionState).phase = 'question';
      (state0 as SessionState).startedAt = now;
      (state0 as SessionState).questionStartedAt = now;
      (state0 as SessionState).players = (state0 as SessionState).players || {};
      (state0 as SessionState).answers = {};
      (state0 as SessionState).firstCorrectPlayerId = null;
      (state0 as SessionState).totalQuestions = selected.length;

      const q0 = getQuestionById(selected[0]);
      if (!q0) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
      const firstQuestion = enrichQuestionWithMechanics(q0);
      const handler = getMechanics(firstQuestion.mechanicsType);
      const presentation = handler.presentQuestion(firstQuestion);
      (state0 as SessionState).shuffledOptions = presentation.options;

      console.log('[Quiz API DEBUG] start', {
        roomId,
        selectedQuestions: selected.length,
        firstQuestionID: selected[0],
        totalQuestions: selected.length,
      });

      await saveSessionState(roomId, state0 as SessionState);

      return NextResponse.json({
        question: {
          ...firstQuestion,
          answers: presentation.options,
        },
        promptText: presentation.promptText,
        currentQuestion: 1,
        totalQuestions: selected.length,
      });
    }

    // ===== ANSWER: Принять ответ игрока =====
    if (action === "answer") {
      const { playerId, option, nickname, avatarUrl } = body as { 
        playerId: string; 
        option: string;
        nickname?: string;
        avatarUrl?: string;
      };

      const state = await getSessionState(roomId);
      if (!state || state.currentQuestionID === null) {
        return NextResponse.json({ error: "No active question" }, { status: 400 });
      }

      const question = getQuestionById(state.currentQuestionID);
      if (!question) {
        return NextResponse.json({ error: "Question not found" }, { status: 404 });
      }

      const enrichedQuestion = enrichQuestionWithMechanics(question);

      // Инициализируем игрока, если его ещё нет
      if (!state.players[playerId]) {
        state.players[playerId] = {
          playerId,
          nickname: nickname || 'Player',
          avatarUrl: avatarUrl || '',
          totalPoints: 0,
          correctCount: 0,
          totalTimeCorrectMs: 0,
        };
      }

      // Обрабатываем ответ через механику
      const handler = getMechanics(enrichedQuestion.mechanicsType);
      const result = handler.acceptAnswer({
        state,
        q: enrichedQuestion,
        playerId,
        option,
        now: Date.now(),
      });

      // Проверяем, все ли активные игроки ответили
      const activePlayers = Object.keys(state.players);
      const answeredPlayers = Object.keys(state.answers);
      const allAnswered = activePlayers.every(pid => answeredPlayers.includes(pid));

      console.log('[Quiz API DEBUG] answer', {
        roomId,
        playerId,
        correct: result.isCorrect,
        option,
        qid: state.currentQuestionID,
        totalAnswers: answeredPlayers.length,
        totalPlayers: activePlayers.length,
        allAnswered,
      });

      if (allAnswered && handler.onAllAnswered) {
        handler.onAllAnswered({ state, q: enrichedQuestion });
      }

      await saveSessionState(roomId, state);

      return NextResponse.json({
        isCorrect: result.isCorrect,
        correctAnswer: enrichedQuestion.answer1,
        comment: enrichedQuestion.comment,
        allAnswered,
      });
    }

    // ===== NEXT: Следующий вопрос =====
  if (action === "next") {
      const { withRedisLock } = await import('@/app/lib/redisLock');
      const lockKey = `${roomId}:quiz:next`;
      
      try {
        const result = await withRedisLock(lockKey, 3000, async () => {
          const state = await getSessionState(roomId);
          if (!state) {
            console.error('[NEXT] Session not found:', roomId);
            return { error: "Session not found", status: 404 };
          }

          // Проверяем наличие необходимых полей
          if (typeof state.currentQuestionIndex !== 'number') {
            console.error('[NEXT] Invalid state.currentQuestionIndex:', state.currentQuestionIndex);
            return { error: "Invalid quiz state (missing currentQuestionIndex)", status: 500 };
          }

          if (!Array.isArray(state.selectedQuestions)) {
            console.error('[NEXT] Invalid state.selectedQuestions:', state.selectedQuestions);
            return { error: "Invalid quiz state (missing selectedQuestions)", status: 500 };
          }

          const nextIndex = state.currentQuestionIndex + 1;
          const isLastQuestion = nextIndex >= state.selectedQuestions.length;
          
          console.log('[Quiz API DEBUG] next', {
            roomId,
            phaseBefore: state.phase,
            currentQuestionID: state.currentQuestionID,
            nextIndex,
            finished: isLastQuestion,
          });
          
          if (isLastQuestion) {
            // Все вопросы отвечены — включаем postgamePending с финальными результатами
            const now = Date.now();
            const finalResults = computeFinalResults(state.players ?? {});
            
            state.phase = 'postgamePending';
            state.currentQuestionID = null;
            state.answers = {};
            state.firstCorrectPlayerId = null;
            state.lastResults = {
              playersSnapshot: state.players ?? {},
              endedAt: now,
              autoFinishAt: now + POSTGAME_WAIT_MS,
              finalResults,
            };
            
            await saveSessionState(roomId, state);

            console.log('[QUIZ API] Set postgamePending with lastResults', {
              roomId,
              winners: finalResults.winners.length,
              fastest: !!finalResults.fastest,
              mostProductive: !!finalResults.mostProductive,
            });

            return {
              postgamePending: true,
              message: "Поздравляем! Вы ответили на все вопросы!",
              autoFinishAt: isPostgamePending(state.lastResults) ? state.lastResults.autoFinishAt : null,
              lastResults: finalResults,
              status: 200,
            };
          }

          // Переходим к следующему вопросу
          const nextQuestionId = state.selectedQuestions[nextIndex];
          
          console.log('[Quiz API DEBUG] next → moving to question', {
            roomId,
            from: state.currentQuestionID,
            to: nextQuestionId,
            nextIndex,
          });
          
          if (!nextQuestionId) {
            console.error('[NEXT] nextQuestionId is null/undefined at index', nextIndex);
            return { error: "Invalid question ID at index " + nextIndex, status: 500 };
          }

          const nextQuestion = getQuestionById(nextQuestionId);
          
          if (!nextQuestion) {
            console.error('[NEXT] Question not found in database:', nextQuestionId);
            return { error: "Next question not found: " + nextQuestionId, status: 404 };
          }

          const enrichedQuestion = enrichQuestionWithMechanics(nextQuestion);
          const handler = getMechanics(enrichedQuestion.mechanicsType);
          const presentation = handler.presentQuestion(enrichedQuestion);

          console.log('[NEXT] Moving to question:', { 
            questionID: nextQuestionId, 
            nextIndex, 
            question: enrichedQuestion.question 
          });

          // Обновляем состояние
          state.currentQuestionID = nextQuestionId;
          state.currentQuestionIndex = nextIndex;
          state.phase = 'question';
          state.questionStartedAt = Date.now();
          state.answers = {}; // Сбрасываем ответы
          state.firstCorrectPlayerId = null;
          state.shuffledOptions = presentation.options;

          await saveSessionState(roomId, state);

          return {
            question: {
              ...enrichedQuestion,
              answers: presentation.options,
            },
            promptText: presentation.promptText,
            currentQuestion: nextIndex + 1,
            totalQuestions: state.totalQuestions,
            status: 200,
          };
        });

        if ('error' in result) {
          return NextResponse.json({ error: result.error }, { status: result.status });
        }
        
        return NextResponse.json(result, { status: result.status });
        
      } catch (error) {
        if (error instanceof Error && error.message === 'LOCKED') {
          return NextResponse.json({ error: 'BUSY' }, { status: 429 });
        }
        console.error('[NEXT] Unexpected error:', error);
        console.error('[NEXT] Error stack:', error instanceof Error ? error.stack : 'no stack');
        return NextResponse.json({ 
          error: 'INTERNAL', 
          details: error instanceof Error ? error.message : String(error) 
        }, { status: 500 });
      }
    }

    // ===== FINISH: Ручное завершение игры (ведущий) =====
    if (action === "finish") {
      const state = await getSessionState(roomId);
      if (!state) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      if (state.phase !== 'postgamePending') return NextResponse.json({ error: 'Not in postgamePending' }, { status: 400 });

      const results = computeFinalResults(state.players ?? {});
      state.lastResults = {
        playersSnapshot: state.players,
        endedAt: Date.now(),
        autoFinishAt: Date.now(),
      } as unknown as SessionState['lastResults'];
      state.phase = 'idle';
      state.currentQuestionID = null;
      await saveSessionState(roomId, state);
      return NextResponse.json({ finished: true, lastResults: results });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error('[Quiz API] Error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET /api/sessions/[roomId]/quiz
 * Получить текущий вопрос и состояние сессии
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const state = await getSessionState(roomId);

    console.log(`[Quiz API GET] Room ${roomId}, state exists:`, !!state);
    if (state) {
      console.log(`[Quiz API GET] currentQuestionID:`, state.currentQuestionID);
      console.log(`[Quiz API GET] phase:`, state.phase);
    }

    if (!state || state.currentQuestionID === null) {
      // Если ждём постгейм — вернуть pending
      // Автозавершение при GET
      if (state?.phase === 'postgamePending' && isPostgamePending(state.lastResults) && Date.now() >= state.lastResults.autoFinishAt) {
        (state as SessionState).phase = 'idle';
        (state as SessionState).currentQuestionID = null;
        await saveSessionState(roomId, state as SessionState);
        return NextResponse.json({ finished: true, lastResults: state.lastResults, autoFinished: true });
      }

      if (state?.phase === 'postgamePending') {
        const lastResultsObj = isPostgamePending(state.lastResults) ? state.lastResults : null;
        return NextResponse.json({
          phase: state.phase,
          postgamePending: true,
          message: 'Поздравляем! Вы ответили на все вопросы!',
          autoFinishAt: lastResultsObj ? lastResultsObj.autoFinishAt : null,
          lastResults: lastResultsObj ? lastResultsObj.finalResults ?? null : null,
          players: state.players,
          totalQuestions: Array.isArray(state.selectedQuestions) ? state.selectedQuestions.length : 15,
          currentQuestionID: null
        });
      }

      // Если завершено и есть lastResults — вернуть вместе с ответом
      if (state?.phase === 'idle' && (state as SessionState).lastResults) {
        return NextResponse.json({
          finished: true,
          message: 'Викторина завершена',
          lastResults: (state as SessionState).lastResults
        });
      }

      return NextResponse.json({
        finished: true,
        message: "No active question",
      });
    }

    const question = getQuestionById(state.currentQuestionID);
    if (!question) {
      console.error(`[Quiz API GET] Question ${state.currentQuestionID} not found`);
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const enrichedQuestion = enrichQuestionWithMechanics(question);

    console.log(`[Quiz API GET] Returning question:`, enrichedQuestion.question);
    console.log(`[Quiz API GET] Options:`, state.shuffledOptions);

    return NextResponse.json({
      question: {
        ...enrichedQuestion,
        answers: state.shuffledOptions || [],
      },
      promptText: enrichedQuestion.promptText,
      comment: enrichedQuestion.comment,
      currentQuestion: state.currentQuestionIndex + 1,
      currentQuestionID: state.currentQuestionID, // ← Добавляем ID текущего вопроса
      totalQuestions: state.totalQuestions,
      phase: state.phase,
      players: state.players,
      answers: state.answers,
    });

  } catch (error) {
    console.error('[Quiz API GET] Error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { initMechanics, getMechanics } from "@/app/lib/mechanics";
import { redis } from "@/app/lib/redis";
import type { SessionState, QuizQuestion } from "@/types/quiz";
import questions from "@/app/data/questions.json";
import mechanics from "@/app/data/mechanics.json";

// Инициализируем механики при загрузке модуля
initMechanics();

// Helpers for postgame results
export const POSTGAME_WAIT_MS = 15 * 60 * 1000;

function computeFinalResults(state: SessionState) {
  const ps = Object.values(state.players ?? {});
  if (!ps.length) return { winners: [], fastest: null as string | null, mostProductive: null as string | null };

  const maxPts = Math.max(...ps.map(p => p.totalPoints ?? 0));
  const winners = ps.filter(p => (p.totalPoints ?? 0) === maxPts).map(p => p.playerId);

  const withSpeed = ps.filter(p => (p.correctCount ?? 0) > 0);
  const fastest = withSpeed.length
    ? withSpeed.reduce((a, b) => ((a.totalTimeCorrectMs ?? Infinity) < (b.totalTimeCorrectMs ?? Infinity) ? a : b)).playerId
    : null;

  const maxCorr = Math.max(...ps.map(p => p.correctCount ?? 0));
  const mostProductive = maxCorr > 0 ? (ps.find(p => (p.correctCount ?? 0) === maxCorr)?.playerId ?? null) : null;

  return { winners, fastest, mostProductive };
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

    // Общая автозавершалка постгейма
    const s0 = await getSessionState(roomId);
    if (s0 && s0.phase === 'postgamePending' && typeof s0.postgameAutoFinishAt === 'number' && Date.now() >= s0.postgameAutoFinishAt) {
      const res = computeFinalResults(s0 as SessionState);
      (s0 as SessionState).lastResults = { ...res, snapshotAt: Date.now() } as SessionState['lastResults'];
      (s0 as SessionState).phase = 'idle';
      (s0 as SessionState).currentQuestionID = null;
      await saveSessionState(roomId, s0 as SessionState);
      return NextResponse.json({ finished: true, lastResults: (s0 as SessionState).lastResults, autoFinished: true });
    }

    // ===== START: Начать новый вопрос =====
    if (action === "start") {
      const { slug } = body as { slug: string };
      
      // Получаем все вопросы для данного слага
      const quizQuestions = (questions as QuizQuestion[]).filter(q => q.Slug === slug);
      
      if (quizQuestions.length === 0) {
        return NextResponse.json({ error: "No questions found for this quiz" }, { status: 404 });
      }

      // Выбираем случайные 15 вопросов
      const shuffled = [...quizQuestions].sort(() => Math.random() - 0.5);
      const selectedQuestions = shuffled.slice(0, Math.min(15, quizQuestions.length));
      const selectedIds = selectedQuestions.map(q => q.questionID);

      // Создаём начальное состояние сессии
      const now = Date.now();
      const state: SessionState = {
        roomId,
        slug,
        currentQuestionID: selectedIds[0],
        currentQuestionIndex: 0,
        phase: 'question',
        startedAt: now,
        questionStartedAt: now,
        players: {},
        answers: {},
        firstCorrectPlayerId: null,
        totalQuestions: selectedIds.length,
        selectedQuestions: selectedIds,
      };

      // Получаем первый вопрос и подготавливаем его через механику
      const firstQuestion = enrichQuestionWithMechanics(selectedQuestions[0]);
      const handler = getMechanics(firstQuestion.mechanicsType);
      const presentation = handler.presentQuestion(firstQuestion);

      // Сохраняем перемешанные варианты в состояние
      state.shuffledOptions = presentation.options;
      await saveSessionState(roomId, state);

      console.log(`[Quiz API] Game started for room ${roomId}`);
      console.log(`[Quiz API] First question:`, firstQuestion.question);
      console.log(`[Quiz API] Options:`, presentation.options);
      console.log(`[Quiz API] State saved with currentQuestionID:`, state.currentQuestionID);

      return NextResponse.json({
        question: {
          ...firstQuestion,
          answers: presentation.options,
        },
        promptText: presentation.promptText,
        currentQuestion: 1,
        totalQuestions: selectedIds.length,
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
          
          console.log('[NEXT]', { 
            roomId, 
            currentIndex: state.currentQuestionIndex,
            nextIndex, 
            totalQuestions: state.selectedQuestions.length,
            selectedQuestions: state.selectedQuestions
          });
          
          if (nextIndex >= state.selectedQuestions.length) {
            // Все вопросы отвечены — включаем postgamePending окно
            state.phase = 'postgamePending';
            state.currentQuestionID = null;
            state.postgameRequestedAt = Date.now();
            state.postgameAutoFinishAt = Date.now() + (15 * 60 * 1000);
            await saveSessionState(roomId, state);

            console.log('[NEXT] All questions answered. Postgame pending started', {
              roomId,
              autoFinishAt: state.postgameAutoFinishAt,
            });

            return {
              postgamePending: true,
              message: "Поздравляем! Вы ответили на все вопросы!",
              autoFinishAt: state.postgameAutoFinishAt,
              status: 200,
            };
          }

          // Переходим к следующему вопросу
          const nextQuestionId = state.selectedQuestions[nextIndex];
          
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

      const res = computeFinalResults(state);
      state.lastResults = { ...res, snapshotAt: Date.now() } as SessionState['lastResults'];
      state.phase = 'idle';
      state.currentQuestionID = null;
      await saveSessionState(roomId, state);
      return NextResponse.json({ finished: true, lastResults: state.lastResults });
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
      if (state?.phase === 'postgamePending') {
        return NextResponse.json({
          postgamePending: true,
          message: 'Поздравляем! Вы ответили на все вопросы!',
          autoFinishAt: state.postgameAutoFinishAt ?? null,
          players: state.players,
          totalQuestions: Array.isArray(state.selectedQuestions) ? state.selectedQuestions.length : 15,
          phase: state.phase,
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

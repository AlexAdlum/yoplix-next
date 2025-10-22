import { NextRequest, NextResponse } from "next/server";
import { initMechanics, getMechanics } from "@/app/lib/mechanics";
import { redis } from "@/app/lib/redis";
import type { SessionState, QuizQuestion } from "@/types/quiz";
import questions from "@/app/data/questions.json";
import mechanics from "@/app/data/mechanics.json";

// Инициализируем механики при загрузке модуля
initMechanics();

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
      const state = await getSessionState(roomId);
      if (!state) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      const nextIndex = state.currentQuestionIndex + 1;
      
      if (nextIndex >= state.selectedQuestions.length) {
        // Игра завершена
        state.phase = 'idle';
        state.currentQuestionID = null;
        await saveSessionState(roomId, state);

        return NextResponse.json({
          finished: true,
          message: "Викторина завершена",
        });
      }

      // Переходим к следующему вопросу
      const nextQuestionId = state.selectedQuestions[nextIndex];
      const nextQuestion = getQuestionById(nextQuestionId);
      
      if (!nextQuestion) {
        return NextResponse.json({ error: "Next question not found" }, { status: 404 });
      }

      const enrichedQuestion = enrichQuestionWithMechanics(nextQuestion);
      const handler = getMechanics(enrichedQuestion.mechanicsType);
      const presentation = handler.presentQuestion(enrichedQuestion);

      // Обновляем состояние
      state.currentQuestionID = nextQuestionId;
      state.currentQuestionIndex = nextIndex;
      state.phase = 'question';
      state.questionStartedAt = Date.now();
      state.answers = {}; // Сбрасываем ответы
      state.firstCorrectPlayerId = null;
      state.shuffledOptions = presentation.options;

      await saveSessionState(roomId, state);

      return NextResponse.json({
        question: {
          ...enrichedQuestion,
          answers: presentation.options,
        },
        promptText: presentation.promptText,
        currentQuestion: nextIndex + 1,
        totalQuestions: state.totalQuestions,
      });
    }

    // ===== END: Завершить игру =====
    if (action === "end") {
      const state = await getSessionState(roomId);
      if (state) {
        state.phase = 'idle';
        state.currentQuestionID = null;
        await saveSessionState(roomId, state);
      }

      return NextResponse.json({ message: "Quiz ended" });
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

    if (!state || state.currentQuestionID === null) {
      return NextResponse.json({
        finished: true,
        message: "No active question",
      });
    }

    const question = getQuestionById(state.currentQuestionID);
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const enrichedQuestion = enrichQuestionWithMechanics(question);

    return NextResponse.json({
      question: {
        ...enrichedQuestion,
        answers: state.shuffledOptions || [],
      },
      promptText: enrichedQuestion.promptText,
      comment: enrichedQuestion.comment,
      currentQuestion: state.currentQuestionIndex + 1,
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

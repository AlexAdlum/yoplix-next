import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import { keyState, keyPlayers } from "@/app/lib/sessionKeys";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { roomId } = await params;
    console.log('[ANSWERS] POST /answers - roomId:', roomId, 'timestamp:', new Date().toISOString());
    
    let body: unknown = {};
    
    try {
      body = await req.json();
      console.log('[ANSWERS] Request body:', body);
    } catch (error) {
      console.error('[ANSWERS] JSON parse error:', error);
      return NextResponse.json({ error: "Invalid JSON" }, { 
        status: 400,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }
    
    const { playerId, answer } = (body as Record<string, unknown>);
    console.log('[ANSWERS] Processing answer - playerId:', playerId, 'answer:', answer);
    
    if (typeof playerId !== "string" || typeof answer !== "string") {
      console.error('[ANSWERS] Validation failed:', {
        playerIdType: typeof playerId,
        answerType: typeof answer
      });
      return NextResponse.json({ 
        error: "playerId and answer are required" 
      }, { 
        status: 400,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }

    // Проверяем, что игрок существует в комнате
    const playersStr = await redis.get(keyPlayers(roomId));
    let players = [];
    if (playersStr) {
      try {
        players = JSON.parse(playersStr);
      } catch (e) {
        console.error('[ANSWERS] Failed to parse players:', e);
      }
    }

    const playerExists = Array.isArray(players) && players.some((p: unknown) => 
      ((p as Record<string, unknown>).id || (p as Record<string, unknown>).playerId) === playerId
    );

    if (!playerExists) {
      console.error('[ANSWERS] Player not in room:', { roomId, playerId, playersCount: players.length });
      return NextResponse.json({ 
        error: "PLAYER_NOT_IN_ROOM",
        reason: "Player not found in this room"
      }, { 
        status: 400,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }
    
    // Получаем состояние сессии
    const stateStr = await redis.get(keyState(roomId));
    if (!stateStr) {
      console.error('[ANSWERS] Session not found:', roomId);
      return NextResponse.json({ 
        error: "SESSION_NOT_FOUND" 
      }, { 
        status: 404,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }

    let state;
    try {
      state = JSON.parse(stateStr);
    } catch (e) {
      console.error('[ANSWERS] Failed to parse session state:', e);
      return NextResponse.json({ 
        error: "INVALID_SESSION_STATE" 
      }, { 
        status: 500,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }

    const currentQuestionID = state.currentQuestionID;
    if (!currentQuestionID) {
      console.error('[ANSWERS] No active question:', { roomId, state: state.phase });
      return NextResponse.json({ 
        error: "No active question" 
      }, { 
        status: 400,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }

    // Проверяем идемпотентность - если игрок уже ответил на этот вопрос
    const existingAnswer = state.answers?.[playerId];
    if (existingAnswer && existingAnswer.questionId === currentQuestionID) {
      console.log('[ANSWERS] Duplicate answer detected:', { 
        roomId, 
        playerId, 
        questionId: currentQuestionID,
        existingAnswer: existingAnswer.option || existingAnswer.answer
      });
      
      return NextResponse.json({
        ok: true,
        accepted: false,
        duplicate: true,
        correct: existingAnswer.isCorrect,
        playerId,
        questionId: currentQuestionID,
        responseTime: Date.now() - startTime
      }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }

    // Получаем вопрос из механики
    const question = state.selectedQuestions?.find((q: unknown) => (q as Record<string, unknown>).questionID === currentQuestionID);
    if (!question) {
      console.error('[ANSWERS] Question not found:', { roomId, currentQuestionID });
      return NextResponse.json({ 
        error: "Question not found" 
      }, { 
        status: 404,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }

    // Проверяем правильность ответа
    const correctAnswer = (question as Record<string, unknown>).answer1;
    const isCorrect = answer === correctAnswer;
    const points = isCorrect ? ((question as Record<string, unknown>).answerCost || 10) as number : 0;
    const responseTime = Date.now();
    
    console.log('[ANSWERS] Answer processed:', { 
      roomId, 
      playerId, 
      questionId: currentQuestionID,
      answer, 
      correctAnswer,
      isCorrect, 
      points 
    });
    
    // Обновляем состояние сессии с новым ответом
    const newAnswer = {
      option: answer,
      isCorrect,
      at: responseTime,
      questionId: currentQuestionID,
      points
    };

    const updatedState = {
      ...state,
      answers: {
        ...state.answers,
        [playerId]: newAnswer
      }
    };

    // Если это первый правильный ответ, запоминаем игрока
    if (isCorrect && !state.firstCorrectPlayerId) {
      updatedState.firstCorrectPlayerId = playerId;
      console.log('[ANSWERS] First correct answer:', { roomId, playerId, questionId: currentQuestionID });
    }

    await redis.set(keyState(roomId), JSON.stringify(updatedState));
    
    console.log('[ANSWERS] Answer saved successfully:', { 
      roomId, 
      playerId, 
      questionId: currentQuestionID,
      responseTime: Date.now() - startTime 
    });
    
    return NextResponse.json({
      ok: true,
      accepted: true,
      duplicate: false,
      correct: isCorrect,
      playerId,
      questionId: currentQuestionID,
      points,
      correctAnswer,
      responseTime: Date.now() - startTime
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
    
  } catch (error) {
    console.error('[ANSWERS] Unexpected error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  }
}


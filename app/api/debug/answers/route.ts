import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/app/lib/redis';
import { keyState } from '@/app/lib/sessionKeys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  // Защита от продакшена
  if (process.env.NODE_ENV === 'production') {
    const secret = req.nextUrl.searchParams.get('secret');
    if (secret !== process.env.DEBUG_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const roomId = req.nextUrl.searchParams.get('roomId');
    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    }

    console.log('[DEBUG] Getting answers for room:', roomId);

    const stateStr = await redis.get(keyState(roomId));
    let state = null;

    if (stateStr) {
      try {
        state = JSON.parse(stateStr);
      } catch (e) {
        console.error('[DEBUG] Failed to parse state:', e);
        state = { raw: stateStr };
      }
    }

    const answers = state?.answers || {};
    const currentQuestionID = state?.currentQuestionID;
    const questionStartedAt = state?.questionStartedAt;

    // Обогащаем ответы дополнительной информацией
    const enrichedAnswers = Object.entries(answers).map(([playerId, answer]: [string, unknown]) => ({
      playerId,
      questionId: currentQuestionID,
      answer: (answer as Record<string, unknown>).option || (answer as Record<string, unknown>).answer,
      isCorrect: (answer as Record<string, unknown>).isCorrect || false,
      answeredAt: (answer as Record<string, unknown>).at || (answer as Record<string, unknown>).responseTime || null,
      responseTime: (answer as Record<string, unknown>).at || (answer as Record<string, unknown>).responseTime || null,
      points: (answer as Record<string, unknown>).points || 0,
      timeToAnswer: questionStartedAt && (answer as Record<string, unknown>).at ? (answer as Record<string, unknown>).at as number - questionStartedAt : null,
    }));

    const debugInfo = {
      roomId,
      timestamp: new Date().toISOString(),
      currentQuestion: {
        id: currentQuestionID,
        startedAt: questionStartedAt,
        age: questionStartedAt ? Date.now() - questionStartedAt : null,
      },
      answers: {
        total: enrichedAnswers.length,
        correct: enrichedAnswers.filter(a => a.isCorrect).length,
        incorrect: enrichedAnswers.filter(a => !a.isCorrect).length,
        list: enrichedAnswers,
        raw: answers, // Сырые данные для отладки
      }
    };

    return NextResponse.json(debugInfo, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('[DEBUG] Answers debug error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  }
}

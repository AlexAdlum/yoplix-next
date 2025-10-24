import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/app/lib/redis';
import { keyState, keyPlayers } from '@/app/lib/sessionKeys';

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

    console.log('[DEBUG] Getting session state for room:', roomId);

    // Получаем состояние сессии
    const stateStr = await redis.get(keyState(roomId));
    const playersStr = await redis.get(keyPlayers(roomId));

    let state = null;
    let players = [];

    if (stateStr) {
      try {
        state = JSON.parse(stateStr);
      } catch (e) {
        console.error('[DEBUG] Failed to parse state:', e);
        state = { raw: stateStr };
      }
    }

    if (playersStr) {
      try {
        players = JSON.parse(playersStr);
      } catch (e) {
        console.error('[DEBUG] Failed to parse players:', e);
        players = [];
      }
    }

    // Подсчитываем статистику
    const totalPlayers = Array.isArray(players) ? players.length : 0;
    const answeredPlayers = state?.answers ? Object.keys(state.answers).length : 0;
    const pendingPlayers = totalPlayers - answeredPlayers;

    const debugInfo = {
      roomId,
      timestamp: new Date().toISOString(),
      state: {
        exists: !!stateStr,
        phase: state?.phase || 'unknown',
        currentQuestionID: state?.currentQuestionID || null,
        currentQuestionIndex: state?.currentQuestionIndex || null,
        totalQuestions: state?.totalQuestions || null,
        questionStartedAt: state?.questionStartedAt || null,
        startedAt: state?.startedAt || null,
        answers: state?.answers || {},
        shuffledOptions: state?.shuffledOptions || null,
        firstCorrectPlayerId: state?.firstCorrectPlayerId || null,
      },
      players: {
        total: totalPlayers,
        answered: answeredPlayers,
        pending: pendingPlayers,
        list: players,
      },
      diagnostics: {
        questionAge: state?.questionStartedAt ? Date.now() - state.questionStartedAt : null,
        allAnswered: pendingPlayers === 0 && totalPlayers > 0,
        canProceed: pendingPlayers === 0 || (state?.questionStartedAt && Date.now() - state.questionStartedAt > 5000),
      }
    };

    return NextResponse.json(debugInfo, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('[DEBUG] Session debug error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/app/lib/redis';
import { keyPlayers } from '@/app/lib/sessionKeys';

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

    console.log('[DEBUG] Getting players for room:', roomId);

    const playersStr = await redis.get(keyPlayers(roomId));
    let players = [];

    if (playersStr) {
      try {
        players = JSON.parse(playersStr);
      } catch (e) {
        console.error('[DEBUG] Failed to parse players:', e);
        players = [];
      }
    }

    // Обогащаем данные игроков
    const enrichedPlayers = Array.isArray(players) ? players.map((player: unknown) => ({
      id: (player as Record<string, unknown>).id || (player as Record<string, unknown>).playerId,
      playerId: (player as Record<string, unknown>).playerId || (player as Record<string, unknown>).id,
      nickname: (player as Record<string, unknown>).nickname || 'Unknown',
      avatarUrl: (player as Record<string, unknown>).avatarUrl || null,
      score: (player as Record<string, unknown>).score || (player as Record<string, unknown>).totalPoints || 0,
      correctCount: (player as Record<string, unknown>).correct || (player as Record<string, unknown>).correctCount || 0,
      totalCorrectTimeMs: (player as Record<string, unknown>).totalCorrectTimeMs || (player as Record<string, unknown>).totalTimeCorrectMs || 0,
      avgTime: ((player as Record<string, unknown>).correctCount as number) > 0 ? ((player as Record<string, unknown>).totalCorrectTimeMs || 0) as number / ((player as Record<string, unknown>).correctCount as number) : null,
      joinedAt: (player as Record<string, unknown>).joinedAt || null,
      isConnected: true, // TODO: добавить логику отслеживания подключения
      lastSeen: Date.now(),
    })) : [];

    const debugInfo = {
      roomId,
      timestamp: new Date().toISOString(),
      players: {
        total: enrichedPlayers.length,
        active: enrichedPlayers.filter(p => p.isConnected).length,
        list: enrichedPlayers,
      }
    };

    return NextResponse.json(debugInfo, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('[DEBUG] Players debug error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  }
}

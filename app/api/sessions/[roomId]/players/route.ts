import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import { randomUUID } from "crypto";
import { keyPlayers, keyState, keyEvents } from "@/app/lib/sessionKeys";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function arrAppendSafe(roomId: string, value: unknown) {
  const k = keyPlayers(roomId);
  // Всегда используем ручной подход для надёжности
  const existing = await redis.get(k);
  let arr: unknown[] = [];
  
  if (typeof existing === 'string') {
    try {
      const parsed = JSON.parse(existing);
      arr = Array.isArray(parsed) ? parsed : [];
    } catch {
      arr = [];
    }
  } else if (Array.isArray(existing)) {
    arr = existing;
  }
  
  arr.push(value);
  await redis.set(k, JSON.stringify(arr));
  return arr.length;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const t0 = Date.now();
  try {
    const { roomId } = await params;
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const { slug, nickname, avatarUrl, avatarId } = body ?? {};
    
    console.log('[POST players] roomId=%s slug=%s nick=%s', roomId, slug, nickname);

    if (!roomId || !slug) {
      return NextResponse.json({ error: 'BAD_REQUEST' }, { 
        status: 400,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }
    if (!nickname || !avatarUrl) {
      return NextResponse.json({ error: 'BAD_PLAYER' }, { 
        status: 400,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }

    const stateStr = await redis.get(keyState(roomId)) as string | null;
    if (!stateStr) {
      console.warn('[POST players] SESSION_NOT_FOUND roomId=%s', roomId);
      return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { 
        status: 404,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }

    const player = {
      id: randomUUID(),
      nickname: String(nickname).slice(0, 32),
      avatarUrl: String(avatarUrl),
      avatarId: avatarId ?? null,
      score: 0,
      correct: 0,
      totalCorrectTimeMs: 0,
      joinedAt: Date.now(),
    };

    await arrAppendSafe(roomId, player);
    
    // Также добавляем игрока в state.players для совместимости
    try {
      const stateStr = await redis.get(keyState(roomId)) as string | null;
      if (stateStr) {
        const state = JSON.parse(stateStr);
        if (!state.players) {
          state.players = {};
        }
        state.players[player.id] = {
          playerId: player.id,
          nickname: player.nickname,
          avatarUrl: player.avatarUrl,
          totalPoints: 0,
          correctCount: 0,
          totalTimeCorrectMs: 0,
        };
        await redis.set(keyState(roomId), JSON.stringify(state));
        console.log('[POST players] Added to state.players:', player.id);
      }
    } catch (e) {
      console.warn('[POST players] Failed to sync with state.players (non-critical):', e);
    }
    
    // Publish event (ignore errors if publish not available)
    try {
      const redisWithPublish = redis as { publish?: (channel: string, message: string) => Promise<unknown> };
      if (typeof redisWithPublish.publish === 'function') {
        await redisWithPublish.publish(keyEvents(roomId), JSON.stringify({ type: 'player:joined', payload: { player } }));
      }
    } catch (e) {
      console.warn('[POST players] publish failed (non-critical)', e);
    }

    console.log('[POST players] OK in %dms roomId=%s players+1', Date.now() - t0, roomId);
    
    return NextResponse.json({ ok: true, player }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (e) {
    console.error('[POST players] ERROR', e);
    return NextResponse.json({ error: 'INTERNAL' }, { 
      status: 500,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    
    if (!roomId) {
      return NextResponse.json({ error: 'BAD_REQUEST' }, { 
        status: 400,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }
    
    const playersStr = await redis.get(keyPlayers(roomId)) as string | null;
    let players: unknown[] = [];
    
    if (playersStr) {
      try {
        const parsed = JSON.parse(playersStr);
        players = Array.isArray(parsed) ? parsed : [];
      } catch {
        players = [];
      }
    }
    
    console.log('[GET players] roomId=%s count=%d', roomId, players.length);
    
    return NextResponse.json({ ok: true, players }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (e) {
    console.error('[GET players] ERROR', e);
    return NextResponse.json({ error: 'INTERNAL' }, { 
      status: 500,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import { randomUUID } from "crypto";
import { keyPlayers, keyState, keyEvents } from "@/app/lib/sessionKeys";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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
      return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
    }
    if (!nickname || !avatarUrl) {
      return NextResponse.json({ error: 'BAD_PLAYER' }, { status: 400 });
    }

    const stateStr = await redis.get(keyState(roomId)) as string | null;
    if (!stateStr) {
      console.warn('[POST players] SESSION_NOT_FOUND roomId=%s', roomId);
      return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
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
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('[POST players] ERROR', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    
    if (!roomId) {
      return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
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
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('[GET players] ERROR', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}

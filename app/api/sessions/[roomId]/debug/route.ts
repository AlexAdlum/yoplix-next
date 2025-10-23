import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import { keyState, keyPlayers } from "@/app/lib/sessionKeys";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    
    if (!roomId) {
      return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
    }
    
    const stateStr = await redis.get(keyState(roomId)) as string | null;
    const playersStr = await redis.get(keyPlayers(roomId)) as string | null;
    
    let state = null;
    let players = null;
    let playersType = 'null';
    let playersCount = 0;
    
    if (stateStr) {
      try {
        state = JSON.parse(stateStr);
      } catch {
        state = stateStr;
      }
    }
    
    if (playersStr) {
      try {
        const parsed = JSON.parse(playersStr);
        players = parsed;
        playersType = Array.isArray(parsed) ? 'array' : typeof parsed;
        playersCount = Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        players = playersStr;
        playersType = 'string';
      }
    }
    
    return NextResponse.json({
      ok: true,
      roomId,
      stateExists: !!stateStr,
      state,
      playersType,
      playersCount,
      players,
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (e) {
    console.error('[GET debug] ERROR', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}


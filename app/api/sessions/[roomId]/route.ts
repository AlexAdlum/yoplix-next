import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const key = `session:${roomId}:state`;
    
    const stateStr = await redis.get(key) as string | null;
    
    if (!stateStr) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }
    
    const state = JSON.parse(stateStr);
    
    return NextResponse.json({
      exists: true,
      roomId,
      phase: state.phase ?? 'lobby',
      playersCount: Object.keys(state.players ?? {}).length,
    }, { status: 200 });
  } catch (e) {
    console.error('[SESSION_GET] Error:', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}


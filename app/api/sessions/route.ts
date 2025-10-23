import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import crypto from "crypto";

type PlayerScore = {
  playerId: string;
  nickname: string;
  avatarUrl: string;
  totalPoints: number;
  correctCount: number;
  totalTimeCorrectMs: number;
};

type SessionState = {
  roomId: string;
  slug: string;
  phase: 'lobby' | 'idle' | 'question' | 'reveal';
  createdAt: number;
  currentQuestionID: number | null;
  players: Record<string, PlayerScore>;
  answers: Record<string, { option: string; isCorrect: boolean; at: number }>;
  [key: string]: unknown;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { slug: string; roomId?: string };
    const { slug, roomId: maybeRoomId } = body;
    
    console.log('[SESSION_CREATE]', { slug, maybeRoomId });
    
    if (!slug) {
      return NextResponse.json({ error: 'BAD_REQUEST: slug is required' }, { status: 400 });
    }

    const roomId = maybeRoomId || crypto.randomUUID();
    const key = `session:${roomId}:state`;

    // Проверяем, существует ли уже сессия
    const existingState = await redis.get(key) as string | null;
    
    if (existingState) {
      console.log('[SESSION_CREATE] Session already exists:', roomId);
      return NextResponse.json({ ok: true, roomId }, { status: 200 });
    }

    // Создаём новую сессию
    const state: SessionState = {
      roomId,
      slug,
      phase: 'lobby',
      createdAt: Date.now(),
      currentQuestionID: null,
      players: {},
      answers: {},
    };
    
    await redis.set(key, JSON.stringify(state));
    
    console.log('[SESSION_CREATE] New session created:', { roomId, slug });
    
    return NextResponse.json({ ok: true, roomId }, { status: 201 });
  } catch (e) {
    console.error('[SESSION_CREATE] Error:', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}

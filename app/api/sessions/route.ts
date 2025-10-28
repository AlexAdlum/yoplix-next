import { NextRequest, NextResponse } from "next/server";
import { pickRandomIds } from '@/app/lib/random';
import { getQuestionsBySlug } from '@/app/lib/quiz';
import { redis } from "@/app/lib/redis";
import crypto from "crypto";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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
    
    console.log('[API] POST /sessions', { slug, maybeRoomId });
    
    if (!slug) {
      return NextResponse.json({ error: 'BAD_REQUEST: slug is required' }, { status: 400 });
    }

    const roomId = maybeRoomId || crypto.randomUUID();
    const key = `session:${roomId}:state`;

    // Проверяем, существует ли уже сессия
    const existingState = await redis.get(key) as string | null;
    
    if (existingState) {
      console.log('[API] Session already exists:', roomId);
      return NextResponse.json({ ok: true, roomId }, { status: 200 });
    }

    // Создаём новую сессию (с предвыбором вопросов)
    // Получаем все вопросы по слагу и выбираем 15 случайных ID
    const quizQs = await getQuestionsBySlug(slug);
    const allIds = quizQs.map(q => q.questionID);
    const selectedQuestionIDs = pickRandomIds(allIds, Math.min(15, allIds.length));

    const state: SessionState = {
      roomId,
      slug,
      phase: 'lobby',
      createdAt: Date.now(),
      currentQuestionID: null,
      players: {},
      answers: {},
      currentQuestionIndex: -1,
      // сохранить предвыбранные вопросы
      selectedQuestions: selectedQuestionIDs,
    };
    
    await redis.set(key, JSON.stringify(state));
    
    console.log('[SESSIONS] created', { roomId, slug, count: selectedQuestionIDs.length });
    
    return NextResponse.json({ ok: true, roomId }, { status: 201 });
  } catch (e) {
    console.error('[SESSION_CREATE] Error:', e);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}

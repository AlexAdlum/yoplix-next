import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";

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
  phase: 'idle' | 'question' | 'reveal';
  currentQuestionID: number | null;
  players: Record<string, PlayerScore>;
  answers: Record<string, { option: string; isCorrect: boolean; at: number }>;
  [key: string]: unknown;
};

// Validate avatar URL for security
function isValidAvatarUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow https://api.dicebear.com/7.x/.../svg?... URLs
    if (parsedUrl.protocol !== 'https:') return false;
    if (parsedUrl.hostname !== 'api.dicebear.com') return false;
    if (!parsedUrl.pathname.startsWith('/7.x/')) return false;
    if (!parsedUrl.pathname.endsWith('/svg')) return false;
    
    return true;
  } catch {
    return false;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const stateKey = `session:${roomId}:state`;
    
    const state = await redis.get(stateKey) as string | null;
    
    if (!state) {
      console.log(`[GET /players] Session ${roomId} not found`);
      return NextResponse.json({ players: [] }, { status: 200 });
    }
    
    const sessionState = JSON.parse(state) as SessionState;
    const playersArray = Object.values(sessionState.players || {});
    
    console.log(`[GET /players] Room ${roomId}, ${playersArray.length} players`);
    
    return NextResponse.json({ players: playersArray }, { status: 200 });
  } catch (error) {
    console.error('[GET /players] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await req.json() as Record<string, unknown>;
    
    const { playerId, nickname, avatarUrl } = body;
    
    console.log('[JOIN]', { roomId, playerId, nickname });
    
    if (typeof playerId !== "string" || typeof nickname !== "string" || typeof avatarUrl !== "string") {
      return NextResponse.json({ error: "BAD_REQUEST: playerId, nickname and avatarUrl are required" }, { status: 400 });
    }
    
    // Validate avatarUrl for security
    if (!isValidAvatarUrl(avatarUrl)) {
      return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 });
    }
    
    const stateKey = `session:${roomId}:state`;
    
    // Читаем состояние
    const stateStr = await redis.get(stateKey) as string | null;
    
    if (!stateStr) {
      console.error(`[JOIN] SESSION_NOT_FOUND for room ${roomId}`);
      return NextResponse.json({ 
        error: "SESSION_NOT_FOUND", 
        message: "Комната ещё не создана ведущим" 
      }, { status: 404 });
    }
    
    const state = JSON.parse(stateStr) as SessionState;
    
    // Если игрока нет — создаём baseline
    if (!state.players[playerId]) {
      state.players[playerId] = {
        playerId,
        nickname,
        avatarUrl,
        totalPoints: 0,
        correctCount: 0,
        totalTimeCorrectMs: 0,
      };
      console.log(`[JOIN] New player ${playerId} (${nickname}) joined room ${roomId}`);
    } else {
      // обновим ник/аватар, если пересоздаётся
      state.players[playerId].nickname = nickname;
      state.players[playerId].avatarUrl = avatarUrl;
      console.log(`[JOIN] Player ${playerId} (${nickname}) rejoined room ${roomId}`);
    }
    
    // Сохраняем обновлённое состояние
    await redis.set(stateKey, JSON.stringify(state));
    
    console.log(`[JOIN] Total players in room ${roomId}:`, Object.keys(state.players).length);
    
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[JOIN] Error:', error);
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { listPlayers, addPlayer, getRoom } from "@/app/lib/sessionStoreRedis";

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
    console.log('GET /api/sessions/[roomId]/players - roomId:', roomId);
    
    const players = await listPlayers(roomId);
    console.log('GET /api/sessions/[roomId]/players - players:', players);
    
    return NextResponse.json({ players }, { status: 200 });
  } catch (error) {
    console.error('GET /api/sessions/[roomId]/players - error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' }, 
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    console.log('POST /api/sessions/[roomId]/players - roomId:', roomId);
    
    let body: unknown = {};
    
    try {
      body = await req.json();
      console.log('POST /api/sessions/[roomId]/players - body:', body);
    } catch (error) {
      console.error('POST /api/sessions/[roomId]/players - JSON parse error:', error);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    
    const { id, nickname, avatarUrl } = (body as Record<string, unknown>);
    console.log('POST /api/sessions/[roomId]/players - parsed data:', { id, nickname, avatarUrl });
    
    if (typeof id !== "string" || typeof nickname !== "string" || typeof avatarUrl !== "string") {
      console.error('POST /api/sessions/[roomId]/players - validation failed:', {
        idType: typeof id,
        nicknameType: typeof nickname,
        avatarUrlType: typeof avatarUrl
      });
      return NextResponse.json({ 
        error: "id, nickname and avatarUrl are required" 
      }, { status: 400 });
    }
    
    // Validate avatarUrl for security
    if (!isValidAvatarUrl(avatarUrl)) {
      console.error('POST /api/sessions/[roomId]/players - invalid avatarUrl:', avatarUrl);
      return NextResponse.json({ 
        error: "Invalid avatar URL" 
      }, { status: 400 });
    }
    
    // Проверяем, что комната существует
    const room = await getRoom(roomId);
    console.log('POST /api/sessions/[roomId]/players - room:', room);
    
    if (!room) {
      console.error('POST /api/sessions/[roomId]/players - room not found for roomId:', roomId);
      return NextResponse.json({ 
        error: "Room not found" 
      }, { status: 404 });
    }
    
    // Добавляем игрока в комнату
    console.log('POST /api/sessions/[roomId]/players - adding player:', { id, nickname, avatarUrl });
    await addPlayer(roomId, { 
      id, 
      nickname, 
      avatarUrl,
      joinedAt: Date.now()
    });
    
    const players = await listPlayers(roomId);
    console.log('POST /api/sessions/[roomId]/players - players after add:', players);
    
    return NextResponse.json({ 
      message: "Player added successfully",
      player: { id, nickname, avatarUrl }
    }, { status: 201 });
    
  } catch (error) {
    console.error('POST /api/sessions/[roomId]/players - unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


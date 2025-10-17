import { NextRequest, NextResponse } from "next/server";
import { listPlayers, addPlayer, getRoom } from "@/app/lib/sessionStore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  console.log('GET /api/sessions/[roomId]/players - roomId:', roomId);
  
  const players = listPlayers(roomId);
  console.log('GET /api/sessions/[roomId]/players - players:', players);
  
  return NextResponse.json({ players }, { status: 200 });
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
    
    const { id, nickname, avatar } = (body as Record<string, unknown>);
    console.log('POST /api/sessions/[roomId]/players - parsed data:', { id, nickname, avatar });
    
    if (typeof id !== "string" || typeof nickname !== "string" || typeof avatar !== "string") {
      console.error('POST /api/sessions/[roomId]/players - validation failed:', {
        idType: typeof id,
        nicknameType: typeof nickname,
        avatarType: typeof avatar
      });
      return NextResponse.json({ 
        error: "id, nickname and avatar are required" 
      }, { status: 400 });
    }
    
    // Проверяем, что комната существует
    const room = getRoom(roomId);
    console.log('POST /api/sessions/[roomId]/players - room:', room);
    
    if (!room) {
      console.error('POST /api/sessions/[roomId]/players - room not found for roomId:', roomId);
      return NextResponse.json({ 
        error: "Room not found" 
      }, { status: 404 });
    }
    
    // Добавляем игрока в комнату
    console.log('POST /api/sessions/[roomId]/players - adding player:', { id, nickname, avatar });
    addPlayer(roomId, { id, nickname, avatar });
    
    const players = listPlayers(roomId);
    console.log('POST /api/sessions/[roomId]/players - players after add:', players);
    
    return NextResponse.json({ 
      message: "Player added successfully",
      player: { id, nickname, avatar }
    }, { status: 201 });
    
  } catch (error) {
    console.error('POST /api/sessions/[roomId]/players - unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


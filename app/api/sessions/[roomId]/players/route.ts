import { NextRequest, NextResponse } from "next/server";
import { listPlayers, addPlayer, getRoom } from "@/app/lib/sessionStore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const players = listPlayers(roomId);
  return NextResponse.json({ players }, { status: 200 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  let body: unknown = {};
  
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  
  const { id, nickname, avatar } = (body as Record<string, unknown>);
  
  if (typeof id !== "string" || typeof nickname !== "string" || typeof avatar !== "string") {
    return NextResponse.json({ 
      error: "id, nickname and avatar are required" 
    }, { status: 400 });
  }
  
  // Проверяем, что комната существует
  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ 
      error: "Room not found" 
    }, { status: 404 });
  }
  
  // Добавляем игрока в комнату
  addPlayer(roomId, { id, nickname, avatar });
  
  return NextResponse.json({ 
    message: "Player added successfully",
    player: { id, nickname, avatar }
  }, { status: 201 });
}


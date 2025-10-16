import { NextRequest, NextResponse } from "next/server";
import { listPlayers } from "@/app/lib/sessionStore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const players = listPlayers(roomId);
  return NextResponse.json({ players }, { status: 200 });
}

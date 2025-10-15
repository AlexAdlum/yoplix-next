import { NextRequest, NextResponse } from "next/server";
import { addPlayer, listPlayers } from "@/app/lib/sessionStore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params; // here slug acts as roomId for backward compat path
  const players = listPlayers(slug);
  return NextResponse.json({ players }, { status: 200 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params; // slug == roomId
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, nickname, avatar } = (body ?? {}) as {
    id?: string;
    nickname?: string;
    avatar?: string;
  };
  if (!id || !nickname || !avatar) {
    return NextResponse.json(
      { error: "id, nickname, avatar are required" },
      { status: 400 }
    );
  }

  addPlayer(slug, { id, nickname, avatar });
  return NextResponse.json({ ok: true }, { status: 201 });
}



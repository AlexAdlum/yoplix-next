import { NextRequest, NextResponse } from "next/server";

type Player = {
  id: string;
  nickname: string;
  avatar: string;
};

// In-memory store per server instance
const slugToPlayers: Map<string, Player[]> = new Map();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const players = slugToPlayers.get(slug) ?? [];
  return NextResponse.json({ players }, { status: 200 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, nickname, avatar } = (body ?? {}) as Partial<Player>;
  if (!id || !nickname || !avatar) {
    return NextResponse.json(
      { error: "id, nickname, avatar are required" },
      { status: 400 }
    );
  }

  const current = slugToPlayers.get(slug) ?? [];
  const exists = current.some((p) => p.id === id);
  if (!exists) {
    current.push({ id, nickname, avatar });
    slugToPlayers.set(slug, current);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}



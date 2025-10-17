import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/app/lib/sessionStore";

export async function POST(req: NextRequest) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {}
  const slug =
    typeof (body as Record<string, unknown>)?.slug === "string"
      ? ((body as Record<string, unknown>).slug as string)
      : undefined;
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }
  const room = createRoom(slug);
  return NextResponse.json({ roomId: room.roomId }, { 
    status: 201,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    }
  });
}



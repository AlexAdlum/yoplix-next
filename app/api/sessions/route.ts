import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/app/lib/sessionStoreRedis";

export async function POST(req: NextRequest) {
  console.log('POST /api/sessions - received request');
  
  let body: unknown = {};
  try {
    body = await req.json();
    console.log('POST /api/sessions - parsed body:', body);
  } catch (error) {
    console.error('POST /api/sessions - JSON parse error:', error);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  
  const slug =
    typeof (body as Record<string, unknown>)?.slug === "string"
      ? ((body as Record<string, unknown>).slug as string)
      : undefined;
      
  console.log('POST /api/sessions - extracted slug:', slug);
  
  if (!slug) {
    console.error('POST /api/sessions - slug is required but not provided');
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }
  
  console.log('POST /api/sessions - creating room for slug:', slug);
  
  try {
    const room = await createRoom(slug);
    console.log('POST /api/sessions - created room:', room);
    console.log('POST /api/sessions - room details:', {
      roomId: room.roomId,
      slug: room.slug,
      createdAt: room.createdAt
    });
    
    return NextResponse.json({ roomId: room.roomId }, { 
      status: 201,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      }
    });
  } catch (error) {
    console.error('POST /api/sessions - error creating room:', error);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}



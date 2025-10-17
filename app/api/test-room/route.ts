import { NextResponse } from "next/server";
import { createRoom } from "@/app/lib/sessionStoreRedis";

export async function GET() {
  try {
    console.log('Testing room creation...');
    
    const room = await createRoom('test-quiz');
    console.log('Room created:', room);
    
    return NextResponse.json({
      success: true,
      message: "Room creation test successful",
      room: {
        roomId: room.roomId,
        slug: room.slug,
        createdAt: room.createdAt
      }
    });
  } catch (error) {
    console.error('Room creation test failed:', error);
    return NextResponse.json({
      success: false,
      error: "Room creation failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

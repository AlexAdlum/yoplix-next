import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    message: "API is working!",
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
    vercel: process.env.VERCEL
  });
}

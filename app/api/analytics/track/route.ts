import { NextResponse } from 'next/server';
import { db } from '@/app/db/client';
import { devices, sessions, players } from '@/app/db/schema';
import { eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface TrackRequest {
  type: 'device_seen' | 'session_started' | 'player_joined';
  payload: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const body: TrackRequest = await request.json();

    if (!body.type || !body.payload) {
      return NextResponse.json(
        { ok: false, error: 'Missing type or payload' },
        { status: 400 }
      );
    }

    console.log('[TRACK API] Received event', { type: body.type });

    switch (body.type) {
      case 'device_seen': {
        const { userId, fingerprintHash, ua, clientHints } = body.payload;

        if (!userId || !fingerprintHash) {
          return NextResponse.json(
            { ok: false, error: 'Missing userId or fingerprintHash' },
            { status: 400 }
          );
        }

        const now = new Date();

        await db
          .insert(devices)
          .values({
            userId: String(userId),
            fingerprintHash: String(fingerprintHash),
            userAgent: ua ? String(ua) : null,
            clientHints: clientHints || null,
            firstSeenAt: now,
            lastSeenAt: now,
          })
          .onConflictDoUpdate({
            target: [devices.userId, devices.fingerprintHash],
            set: {
              userAgent: ua ? String(ua) : null,
              clientHints: clientHints || null,
              lastSeenAt: now,
            },
          });

        console.log('[TRACK API] device_seen logged', { userId, fingerprintHash });
        break;
      }

      case 'session_started': {
        const { roomId, hostUserId, slug, startAt } = body.payload;

        if (!roomId || !hostUserId || !slug) {
          return NextResponse.json(
            { ok: false, error: 'Missing roomId, hostUserId, or slug' },
            { status: 400 }
          );
        }

        await db
          .insert(sessions)
          .values({
            roomId: String(roomId),
            hostUserId: String(hostUserId),
            slug: String(slug),
            playersQty: 0,
            startAt: startAt ? new Date(String(startAt)) : new Date(),
          })
          .onConflictDoUpdate({
            target: [sessions.roomId],
            set: {
              hostUserId: String(hostUserId),
              slug: String(slug),
              startAt: startAt ? new Date(String(startAt)) : new Date(),
            },
          });

        console.log('[TRACK API] session_started logged', { roomId, slug });
        break;
      }

      case 'player_joined': {
        const { roomId, userId, slug } = body.payload;

        if (!roomId || !userId || !slug) {
          return NextResponse.json(
            { ok: false, error: 'Missing roomId, userId, or slug' },
            { status: 400 }
          );
        }

        // Insert player (ignore if already exists)
        await db
          .insert(players)
          .values({
            roomId: String(roomId),
            userId: String(userId),
            slug: String(slug),
          })
          .onConflictDoNothing();

        // Increment players_qty in sessions
        await db
          .update(sessions)
          .set({
            playersQty: sql`${sessions.playersQty} + 1`,
          })
          .where(eq(sessions.roomId, String(roomId)));

        console.log('[TRACK API] player_joined logged', { roomId, userId });
        break;
      }

      default:
        return NextResponse.json(
          { ok: false, error: 'Unknown event type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('[TRACK API] Error processing event', e);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Other methods return 405
export function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export function PUT() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export function DELETE() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}


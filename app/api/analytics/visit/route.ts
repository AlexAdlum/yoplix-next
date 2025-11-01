import { NextResponse } from 'next/server';
import { db } from '@/app/db/client';
import { users, visits } from '@/app/db/schema';
import { getOrSetUserId } from '@/app/lib/user-id';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const userId = await getOrSetUserId();
    const now = new Date();

    // upsert: если нет пользователя — создаём; если есть — инкремент + last_timestamp
    await db
      .insert(users)
      .values({
        userId,
        qtyOfVisits: 1,
        firstTimestamp: now,
        lastTimestamp: now,
      })
      .onConflictDoUpdate({
        target: [users.userId],
        set: {
          qtyOfVisits: sql`${users.qtyOfVisits} + 1`,
          lastTimestamp: now,
        },
      });

    // Raw visit logging
    let visitData: { slug: string; path: string; referrer?: string } | null = null;
    try {
      const body = await request.json();
      visitData = {
        slug: body.slug || '',
        path: body.path || '',
        referrer: body.referrer,
      };
    } catch {
      // No JSON body, skip visit logging
      console.log('[VISIT API] No body provided, skipping visit log');
    }

    if (visitData) {
      const ua = request.headers.get('user-agent') ?? '';
      const xfwd = request.headers.get('x-forwarded-for');
      const ip = xfwd?.split(',')[0].trim() || '0.0.0.0';
      const raw = `${ip}|${ua}`;
      const ipHash = crypto.createHash('sha256').update(raw).digest('hex');

      // Collect client hints
      const hints: Record<string, string> = {};
      const hintHeaders = [
        'sec-ch-ua',
        'sec-ch-ua-platform',
        'sec-ch-ua-mobile',
        'sec-ch-ua-model',
        'sec-ch-ua-arch',
        'sec-ch-ua-bitness',
      ];
      for (const header of hintHeaders) {
        const value = request.headers.get(header);
        if (value) {
          hints[header] = value;
        }
      }
      const chJson = Object.keys(hints).length > 0 ? JSON.stringify(hints) : '';

      await db.insert(visits).values({
        userId,
        slug: visitData.slug,
        path: visitData.path,
        referrer: visitData.referrer ?? '',
        ua,
        ch: chJson,
        ipHash,
      });

      console.log('[VISIT API] Logged visit', { slug: visitData.slug, path: visitData.path });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('[VISIT API] visit error', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// Для ручной проверки GET вернём 405, чтобы отличать от 404
export function GET() {
  return NextResponse.json({ ok: false, error: 'Method Not Allowed' }, { status: 405 });
}


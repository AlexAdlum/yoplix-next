import { NextResponse } from 'next/server';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema';
import { getOrSetUserId } from '@/app/lib/user-id';
import { sql } from 'drizzle-orm';

export async function POST() {
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

    // Ничего лишнего не возвращаем
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('[ANALYTICS] visit error', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// Для ручной проверки GET вернём 405, чтобы отличать от 404
export function GET() {
  return NextResponse.json({ ok: false, error: 'Method Not Allowed' }, { status: 405 });
}


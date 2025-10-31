import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { users } from '@/drizzle/schema';
import { eq, sql } from 'drizzle-orm';

const COOKIE = 'yplx_uid';
const COOKIE_DAYS = 365;

async function ensureCookie() {
  const jar = await cookies();
  let uid = jar.get(COOKIE)?.value;
  if (!uid) {
    uid = crypto.randomUUID();
    jar.set(COOKIE, uid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: COOKIE_DAYS * 24 * 60 * 60,
    });
  }
  return uid;
}

export async function POST() {
  try {
    const uid = await ensureCookie();
    const now = new Date();

    // пробуем обновить; если 0 строк — создаём
    const updated = await db.update(users)
      .set({ qtyOfVisits: sql`${users.qtyOfVisits} + 1`, lastTimestamp: now })
      .where(eq(users.userId, uid))
      .returning({ affected: users.userId });

    if (updated.length === 0) {
      await db.insert(users).values({
        userId: uid,
        qtyOfVisits: 1,
        firstTimestamp: now,
        lastTimestamp: now,
      });
    }

    return NextResponse.json({ ok: true, userId: uid });
  } catch (e) {
    console.error('[ANALYTICS visit] error:', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

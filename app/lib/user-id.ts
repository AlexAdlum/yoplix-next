import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const COOKIE_NAME = 'yplx_uid';
const TTL_DAYS = 365;

export async function getOrSetUserId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const uid = randomUUID();
  const expires = new Date();
  expires.setDate(expires.getDate() + TTL_DAYS);
  store.set(COOKIE_NAME, uid, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', expires });
  return uid;
}


'use client';

type EventName = 'device_seen' | 'session_started' | 'player_joined';

function beacon(url: string, data: unknown) {
  try {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      (navigator as { sendBeacon: (url: string, data: Blob) => boolean }).sendBeacon(url, blob);
      return;
    }
  } catch {
    // silent
  }
  // fallback
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data), keepalive: true }).catch(() => {});
}

export function track(name: EventName, payload: Record<string, unknown>) {
  beacon('/api/analytics/track', { type: name, payload });
}

export function oncePerSession(key: string, fn: () => void) {
  try {
    const k = `yplx_once_${key}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, '1');
    fn();
  } catch {
    fn();
  }
}

export function getUserIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)yplx_uid=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}


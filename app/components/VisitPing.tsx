'use client';
import { useEffect } from 'react';
import { track, oncePerSession, getUserIdFromCookie } from '@/app/lib/analytics';

interface VisitPingProps {
  slug?: string;
  path?: string;
}

export default function VisitPing({ slug = '', path = '' }: VisitPingProps = {}) {
  useEffect(() => {
    // Пингуем визит при заходе на страницу викторины
    const data = {
      slug,
      path: path || window.location.pathname,
      referrer: document.referrer || '',
    };

    try {
      if ('sendBeacon' in navigator) {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/visit', blob);
      } else {
        // fallback для старых браузеров/вкладок
        fetch('/api/analytics/visit', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).catch(() => {});
      }
    } catch {}

    // Device tracking - once per session
    const userId = getUserIdFromCookie();
    const slugSafe = slug || '';
    oncePerSession('device_seen', () => {
      if (userId && slugSafe) {
        const ua = navigator.userAgent;
        const uaData = (navigator as { userAgentData?: { platform?: string } }).userAgentData;
        const ch: Record<string, unknown> = { uaPlatform: uaData?.platform };
        track('device_seen', { userId, fingerprintHash: 'device_na', ua, clientHints: ch });
      }
    });
  }, [slug, path]);

  return null;
}



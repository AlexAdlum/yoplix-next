'use client';
import { useEffect } from 'react';
import { track } from '@/app/lib/track';

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

    // Device tracking
    try {
      const uid = document.cookie.split('; ').find(x => x.startsWith('yplx_uid='))?.split('=')[1];
      if (!uid) return;
      const ua = navigator.userAgent;
      const uaData = (navigator as { userAgentData?: { platform?: string } }).userAgentData;
      const ch: Record<string, unknown> = { uaPlatform: uaData?.platform };
      track('device_seen', { userId: uid, fingerprintHash: 'na', ua, clientHints: ch });
    } catch {}
  }, [slug, path]);

  return null;
}



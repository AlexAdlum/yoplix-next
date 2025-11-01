'use client';
import { useEffect } from 'react';

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
  }, [slug, path]);

  return null;
}



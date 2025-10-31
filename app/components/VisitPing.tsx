'use client';
import { useEffect } from 'react';

export default function VisitPing() {
  useEffect(() => {
    // Пингуем визит при заходе на страницу викторины
    try {
      if ('sendBeacon' in navigator) {
        navigator.sendBeacon('/api/analytics/visit');
      } else {
        // fallback для старых браузеров/вкладок
        fetch('/api/analytics/visit', { method: 'POST', keepalive: true }).catch(() => {});
      }
    } catch {}
  }, []);

  return null;
}


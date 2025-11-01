'use client';
import Link from 'next/link';
import { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  href: string;
  className?: string;
  onClick?: () => void;
}>;

export default function VisitPingLink({ href, className, onClick, children }: Props) {
  const handleClick = () => {
    try {
      const slug = href.startsWith('/quiz/') ? href.split('/')[2] : '';
      const data = {
        slug,
        path: href,
        referrer: window.location.href,
      };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/visit', blob);
    } catch {}
    onClick?.();
  };

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}




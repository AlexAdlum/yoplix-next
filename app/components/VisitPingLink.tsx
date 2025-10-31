'use client';
import Link from 'next/link';
import { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  href: string;
  className?: string;
  onClick?: () => void;
}>;

export default function VisitPingLink({ href, className, onClick, children }: Props) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        try { navigator.sendBeacon('/api/analytics/visit'); } catch {}
        onClick?.();
      }}
    >
      {children}
    </Link>
  );
}



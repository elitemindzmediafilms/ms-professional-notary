'use client';

import { useEffect } from 'react';

/** Counts taps on phone / email links. Anonymous: only the kind of link and the page are sent. */
export default function ClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href^="tel:"], a[href^="mailto:"]');
      if (!a) return;
      const kind = a.getAttribute('href')!.startsWith('tel:') ? 'phone' : 'email';
      try {
        navigator.sendBeacon?.(
          '/api/click',
          new Blob([JSON.stringify({ kind, page: location.pathname })], { type: 'application/json' }),
        );
      } catch {
        /* tracking must never break the link */
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}

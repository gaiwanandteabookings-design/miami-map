'use client';

import { useEffect } from 'react';

// Счётчик показов и нажатий с первого дня. См. ТЗ раздел 3, пункт 5.
export default function TrackImpression({ businessId }: { businessId: string }) {
  useEffect(() => {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, type: 'card_open' }),
      keepalive: true,
    }).catch(() => {});

    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('[data-track]') as HTMLElement | null;
      if (!target) return;
      const type = target.dataset.track;
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, type }),
        keepalive: true,
      }).catch(() => {});
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [businessId]);

  return null;
}

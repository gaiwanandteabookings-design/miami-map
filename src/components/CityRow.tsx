'use client';

import { MIAMI_NEIGHBORHOODS } from '@/lib/miami';

export default function CityRow({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  return (
    <div className="city-row">
      {MIAMI_NEIGHBORHOODS.map((n) => (
        <button key={n.name} onClick={() => onSelect(n.lat, n.lng)}>
          {n.name}
        </button>
      ))}
    </div>
  );
}

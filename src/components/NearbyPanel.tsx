'use client';

import { isNew } from '@/lib/grid';

type Item = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date | string;
  distance: number;
  category: { name: string };
};

export default function NearbyPanel({ items }: { items: Item[] }) {
  if (items.length === 0) return null;

  return (
    <div className="nearby-panel">
      <strong>Рядом со мной</strong>
      {items.map((item) => (
        <a
          key={item.id}
          href={`/b/${item.slug}`}
          className="nearby-item"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <span>
            {item.name}
            {isNew(new Date(item.createdAt)) && <span className="badge-new">новое</span>}
            <br />
            <small style={{ color: '#666' }}>{item.category.name}</small>
          </span>
          <span style={{ color: '#666', fontSize: 12 }}>{Math.round(item.distance)} м</span>
        </a>
      ))}
    </div>
  );
}

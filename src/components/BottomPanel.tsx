'use client';

import { isNew, zoneForDistance, ZONE_PRICE_USD_MONTH, type CellIndex } from '@/lib/grid';

type NearbyItem = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date | string;
  distance: number;
  category: { name: string };
};

export type SelectedCell = {
  cell: CellIndex;
  code: string;
  lat: number;
  lng: number;
  distanceFromDowntown: number;
};

export default function BottomPanel({
  nearby,
  selectedCell,
  tab,
  onTabChange,
}: {
  nearby: NearbyItem[];
  selectedCell: SelectedCell | null;
  tab: 'nearby' | 'cell';
  onTabChange: (tab: 'nearby' | 'cell') => void;
}) {
  return (
    <div className="bottom-panel">
      <div className="bottom-tabs">
        <button className={tab === 'nearby' ? 'active' : ''} onClick={() => onTabChange('nearby')}>
          Рядом со мной
        </button>
        <button className={tab === 'cell' ? 'active' : ''} onClick={() => onTabChange('cell')}>
          Клетка
        </button>
      </div>

      {tab === 'nearby' && (
        <div className="bottom-tab-content">
          <p className="bottom-hint">Что вокруг тебя прямо сейчас. Ты ничего не искал — просто посмотрел.</p>
          {nearby.length === 0 && <p className="bottom-hint">Пока рядом никого нет — станьте первым.</p>}
          {nearby.map((item) => (
            <a key={item.id} href={`/b/${item.slug}`} className="nearby-item">
              <span>
                <strong>{item.name}</strong>
                {isNew(new Date(item.createdAt)) && <span className="badge-new">новое</span>}
                <br />
                <small style={{ color: '#666' }}>{item.category.name}</small>
              </span>
              <span style={{ color: '#666', fontSize: 12 }}>
                {item.distance < 1000 ? `${Math.round(item.distance)} м` : `${(item.distance / 1000).toFixed(1)} км`}
              </span>
            </a>
          ))}
        </div>
      )}

      {tab === 'cell' && (
        <div className="bottom-tab-content">
          {!selectedCell && <p className="bottom-hint">Тапните по любой клетке на карте, чтобы увидеть её код и цену.</p>}
          {selectedCell && (
            <div className="cell-info">
              <code className="cell-code">{selectedCell.code}</code>
              <p>
                Зона: <strong>{zoneForDistance(selectedCell.distanceFromDowntown)}</strong> ·{' '}
                {ZONE_PRICE_USD_MONTH[zoneForDistance(selectedCell.distanceFromDowntown)]} $/мес
              </p>
              <a
                className="claim-button"
                href={`/claim/new?lat=${selectedCell.lat}&lng=${selectedCell.lng}`}
              >
                Занять клетку
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

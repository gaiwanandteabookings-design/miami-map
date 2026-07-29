'use client';

export type Layer = 'places' | 'service_area';

export default function LayerToggle({
  layer,
  onChange,
}: {
  layer: Layer;
  onChange: (l: Layer) => void;
}) {
  return (
    <div className="layer-toggle">
      <button className={layer === 'places' ? 'active' : ''} onClick={() => onChange('places')}>
        Места
      </button>
      <button
        className={layer === 'service_area' ? 'active' : ''}
        onClick={() => onChange('service_area')}
      >
        Выезд по району
      </button>
    </div>
  );
}

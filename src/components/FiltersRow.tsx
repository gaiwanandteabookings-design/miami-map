'use client';

import type { CellSize } from '@/lib/grid';

type Category = { id: string; name: string };

export default function FiltersRow({
  categories,
  categoryId,
  onCategoryChange,
  cellSize,
  onCellSizeChange,
}: {
  categories: Category[];
  categoryId: string | 'all';
  onCategoryChange: (id: string | 'all') => void;
  cellSize: CellSize;
  onCellSizeChange: (size: CellSize) => void;
}) {
  return (
    <div className="filters-row">
      <select value={categoryId} onChange={(e) => onCategoryChange(e.target.value)}>
        <option value="all">Все услуги</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={cellSize}
        onChange={(e) => onCellSizeChange(Number(e.target.value) as CellSize)}
      >
        <option value={100}>Клетка 100 м</option>
        <option value={200}>Клетка 200 м</option>
        <option value={400}>Клетка 400 м</option>
      </select>
    </div>
  );
}

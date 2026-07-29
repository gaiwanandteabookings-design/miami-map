// Сетка клеток. См. ТЗ раздел 8.
// Клетка привязана к координатам, а не к экрану.

const METERS_PER_DEGREE_LAT = 111320;

export type CellSize = 100 | 200 | 400;

export interface CellIndex {
  cellX: number;
  cellY: number;
  sizeM: CellSize;
}

function stepsFor(sizeM: CellSize, lat: number) {
  const dLat = sizeM / METERS_PER_DEGREE_LAT;
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  return { dLat, dLng };
}

export function latLngToCell(lat: number, lng: number, sizeM: CellSize): CellIndex {
  const { dLat, dLng } = stepsFor(sizeM, lat);
  return {
    cellX: Math.floor(lng / dLng),
    cellY: Math.floor(lat / dLat),
    sizeM,
  };
}

export function cellToBounds(cell: CellIndex) {
  const { dLat, dLng } = stepsFor(cell.sizeM, cell.cellY * (cell.sizeM / METERS_PER_DEGREE_LAT));
  const south = cell.cellY * dLat;
  const north = south + dLat;
  const west = cell.cellX * dLng;
  const east = west + dLng;
  return { north, south, east, west };
}

function toBase36(n: number): string {
  const sign = n < 0 ? '-' : '';
  return sign + Math.abs(n).toString(36);
}

/** Код клетки для человека: MIA-<base36(cell_y)><base36(cell_x)> */
export function cellCode(cell: CellIndex, cityPrefix = 'MIA'): string {
  return `${cityPrefix}-${toBase36(cell.cellY)}${toBase36(cell.cellX)}`;
}

/** Расстояние в метрах между двумя точками (haversine). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Даунтаун Майами — точка отсчёта зон по ТЗ раздел 10.
export const MIAMI_DOWNTOWN = { lat: 25.7743, lng: -80.1937 };

export function zoneForDistance(meters: number): 'center' | 'middle' | 'edge' {
  if (meters < 900) return 'center';
  if (meters < 2600) return 'middle';
  return 'edge';
}

export const ZONE_PRICE_USD_MONTH: Record<'center' | 'middle' | 'edge', number> = {
  center: 40,
  middle: 20,
  edge: 9,
};

export function isNew(createdAt: Date, now: Date = new Date()): boolean {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  return now.getTime() - createdAt.getTime() < THIRTY_DAYS_MS;
}

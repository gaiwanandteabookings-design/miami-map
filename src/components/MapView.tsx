'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map as MLMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MIAMI_DOWNTOWN,
  distanceMeters,
  isNew,
  gridCellsInBounds,
  cellToBounds,
  cellCode,
  latLngToCell,
  type CellSize,
} from '@/lib/grid';
import LayerToggle, { type Layer } from './LayerToggle';
import CityRow from './CityRow';
import FiltersRow from './FiltersRow';
import BottomPanel, { type SelectedCell } from './BottomPanel';

type Category = { id: string; name: string };

type BusinessPin = {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  layer: 'place' | 'service_area';
  categoryId: string;
  serviceRadiusM: number | null;
  createdAt: Date | string;
  category: { name: string; icon: string | null };
};

// Светлая подложка без подписей (CARTO Positron, nolabels) — никаких отелей,
// POI и прочего шума, который перебивает сетку клеток. Названия бизнесов и
// коды клеток — свои, их и так видно на маркерах и в сетке.
const BASEMAP_STYLE = {
  version: 8 as const,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    basemap: {
      type: 'raster' as const,
      tiles: ['https://basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [{ id: 'basemap', type: 'raster' as const, source: 'basemap' }],
};

const GRID_MIN_ZOOM = 15;

function buildGridGeoJSON(map: MLMap, sizeM: CellSize): GeoJSON.FeatureCollection {
  const cells = gridCellsInBounds(map.getBounds(), sizeM);
  return {
    type: 'FeatureCollection',
    features: cells.map((cell) => {
      const b = cellToBounds(cell);
      return {
        type: 'Feature',
        properties: { code: cellCode(cell) },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [b.west, b.south],
              [b.east, b.south],
              [b.east, b.north],
              [b.west, b.north],
              [b.west, b.south],
            ],
          ],
        },
      };
    }),
  };
}

export default function MapView({
  businesses,
  categories,
}: {
  businesses: BusinessPin[];
  categories: Category[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const cellSizeRef = useRef<CellSize>(200);

  const [layer, setLayer] = useState<Layer>('places');
  const [categoryId, setCategoryId] = useState<string | 'all'>('all');
  const [cellSize, setCellSize] = useState<CellSize>(200);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [bottomTab, setBottomTab] = useState<'nearby' | 'cell'>('nearby');
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  useEffect(() => {
    cellSizeRef.current = cellSize;
  }, [cellSize]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [MIAMI_DOWNTOWN.lng, MIAMI_DOWNTOWN.lat],
      zoom: 16,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-left');
    mapRef.current = map;

    // Сетка клеток — только при зуме от 15 и выше (ТЗ раздел 8).
    const updateGrid = () => {
      const source = map.getSource('grid-cells') as maplibregl.GeoJSONSource | undefined;
      if (!source || map.getZoom() < GRID_MIN_ZOOM) return;
      source.setData(buildGridGeoJSON(map, cellSizeRef.current));
    };

    map.on('load', () => {
      map.addSource('grid-cells', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      // Едва заметная заливка, чтобы клетки читались как области, а не только линии.
      map.addLayer({
        id: 'grid-fill',
        type: 'fill',
        source: 'grid-cells',
        minzoom: GRID_MIN_ZOOM,
        paint: { 'fill-color': '#1d1d1f', 'fill-opacity': 0.03 },
      });
      map.addLayer({
        id: 'grid-lines',
        type: 'line',
        source: 'grid-cells',
        minzoom: GRID_MIN_ZOOM,
        paint: { 'line-color': '#1d1d1f', 'line-width': 1.5, 'line-opacity': 0.7 },
      });
      map.addLayer({
        id: 'grid-labels',
        type: 'symbol',
        source: 'grid-cells',
        minzoom: GRID_MIN_ZOOM,
        layout: {
          'text-field': ['get', 'code'],
          'text-size': 10,
          'text-anchor': 'top-left',
          'text-offset': [0.3, 0.2],
          'text-allow-overlap': false,
        },
        paint: { 'text-color': '#1d1d1f', 'text-halo-color': '#fff', 'text-halo-width': 1.2 },
      });

      // Подсветка клетки, по которой тапнули.
      map.addSource('selected-cell', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'selected-cell-fill',
        type: 'fill',
        source: 'selected-cell',
        paint: { 'fill-color': '#0a84ff', 'fill-opacity': 0.15 },
      });
      map.addLayer({
        id: 'selected-cell-outline',
        type: 'line',
        source: 'selected-cell',
        paint: { 'line-color': '#0a84ff', 'line-width': 2.5 },
      });

      updateGrid();
    });

    map.on('moveend', updateGrid);

    // Один тап по клетке → показать её код/цену во вкладке «Клетка».
    // Двойной тап → сразу форма занятия клетки (ТЗ раздел 12, пункт 3).
    map.on('click', (e) => {
      const { lat, lng } = e.lngLat;
      const cell = latLngToCell(lat, lng, cellSizeRef.current);
      const b = cellToBounds(cell);
      const centerLat = (b.north + b.south) / 2;
      const centerLng = (b.east + b.west) / 2;
      setSelectedCell({
        cell,
        code: cellCode(cell),
        lat: centerLat,
        lng: centerLng,
        distanceFromDowntown: distanceMeters(MIAMI_DOWNTOWN, { lat: centerLat, lng: centerLng }),
      });
      setBottomTab('cell');

      const selSource = map.getSource('selected-cell') as maplibregl.GeoJSONSource | undefined;
      selSource?.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [b.west, b.south],
                  [b.east, b.south],
                  [b.east, b.north],
                  [b.west, b.north],
                  [b.west, b.south],
                ],
              ],
            },
          },
        ],
      });
    });

    map.on('dblclick', (e) => {
      e.preventDefault();
      const { lat, lng } = e.lngLat;
      window.location.href = `/claim/new?lat=${lat}&lng=${lng}`;
    });

    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
    );

    fetch('/api/visits', { method: 'POST', keepalive: true }).catch(() => {});

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Перерисовать сетку при смене размера клетки.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource('grid-cells') as maplibregl.GeoJSONSource | undefined;
    if (!source || map.getZoom() < GRID_MIN_ZOOM) return;
    source.setData(buildGridGeoJSON(map, cellSize));
  }, [cellSize]);

  // Слои: места (адрес) и выезд по району (зона обслуживания) + фильтр по категории.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const visible = businesses.filter((b) => {
      const layerMatch = layer === 'places' ? b.layer === 'place' : b.layer === 'service_area';
      const categoryMatch = categoryId === 'all' || b.categoryId === categoryId;
      return layerMatch && categoryMatch;
    });

    const markers: maplibregl.Marker[] = [];
    visible.forEach((b) => {
      const el = document.createElement('div');
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.2)';
      el.style.background = b.layer === 'place' ? '#111' : '#0a84ff';
      if (isNew(new Date(b.createdAt))) {
        el.style.background = '#ff3b30';
        el.style.animation = 'pulse 1.6s infinite';
      }

      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
        `<a href="/b/${b.slug}" style="font-weight:600">${b.name}</a><br/><span style="color:#666">${b.category.name}</span>`,
      );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([b.lng, b.lat])
        .setPopup(popup)
        .addTo(map);
      markers.push(marker);
    });

    return () => markers.forEach((m) => m.remove());
  }, [businesses, layer, categoryId]);

  const nearby = userPos
    ? [...businesses]
        .map((b) => ({ ...b, distance: distanceMeters(userPos, b) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20)
    : [];

  return (
    <div className="page">
      <header className="page-header">
        <h1>Реестр клеток · Майами</h1>
        <p className="tagline">ОДНА КЛЕТКА · ОДНА УСЛУГА · ОДИН ВЛАДЕЛЕЦ</p>
      </header>

      <LayerToggle layer={layer} onChange={setLayer} />
      <FiltersRow
        categories={categories}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        cellSize={cellSize}
        onCellSizeChange={setCellSize}
      />
      <CityRow onSelect={(lat, lng) => mapRef.current?.flyTo({ center: [lng, lat], zoom: 16 })} />

      <div className="map-box">
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>
      <p className="map-caption">Клетка {cellSize} × {cellSize} м · Тапни в любую</p>

      <BottomPanel nearby={nearby} selectedCell={selectedCell} tab={bottomTab} onTabChange={setBottomTab} />
    </div>
  );
}

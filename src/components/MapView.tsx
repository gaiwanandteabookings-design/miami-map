'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map as MLMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MIAMI_DOWNTOWN, distanceMeters, isNew, gridCellsInBounds, cellToBounds, cellCode } from '@/lib/grid';
import LayerToggle, { type Layer } from './LayerToggle';
import NearbyPanel from './NearbyPanel';

type BusinessPin = {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  layer: 'place' | 'service_area';
  serviceRadiusM: number | null;
  createdAt: Date | string;
  category: { name: string; icon: string | null };
};

// Светлая минималистичная подложка (CARTO Positron) — вместо шумного
// дефолтного стиля tile.openstreetmap.org с кучей подписей и цветных зон.
const BASEMAP_STYLE = {
  version: 8 as const,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    basemap: {
      type: 'raster' as const,
      tiles: ['https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [{ id: 'basemap', type: 'raster' as const, source: 'basemap' }],
};

const GRID_MIN_ZOOM = 15;
const GRID_SIZE_M = 200;

function buildGridGeoJSON(map: MLMap): GeoJSON.FeatureCollection {
  const cells = gridCellsInBounds(map.getBounds(), GRID_SIZE_M);
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

export default function MapView({ businesses }: { businesses: BusinessPin[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [layer, setLayer] = useState<Layer>('places');
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [MIAMI_DOWNTOWN.lng, MIAMI_DOWNTOWN.lat],
      zoom: 16,
    });
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    mapRef.current = map;

    // Сетка клеток — только при зуме от 15 и выше (ТЗ раздел 8).
    const updateGrid = () => {
      const source = map.getSource('grid-cells') as maplibregl.GeoJSONSource | undefined;
      if (!source || map.getZoom() < GRID_MIN_ZOOM) return;
      source.setData(buildGridGeoJSON(map));
    };

    map.on('load', () => {
      map.addSource('grid-cells', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'grid-lines',
        type: 'line',
        source: 'grid-cells',
        minzoom: GRID_MIN_ZOOM,
        paint: { 'line-color': '#0a84ff', 'line-width': 1, 'line-opacity': 0.5 },
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
        paint: { 'text-color': '#0a84ff', 'text-halo-color': '#fff', 'text-halo-width': 1 },
      });
      updateGrid();
    });

    map.on('moveend', updateGrid);

    // Тап по клетке → форма занятия клетки. См. ТЗ раздел 12, пункт 3.
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

  // Слои: места (адрес) и выезд по району (зона обслуживания).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const visible = businesses.filter((b) =>
      layer === 'places' ? b.layer === 'place' : b.layer === 'service_area',
    );

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
  }, [businesses, layer]);

  const nearby = userPos
    ? [...businesses]
        .map((b) => ({ ...b, distance: distanceMeters(userPos, b) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20)
    : [];

  return (
    <div className="map-shell">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <LayerToggle layer={layer} onChange={setLayer} />
      <NearbyPanel items={nearby} />
      <div className="claim-hint">Двойной тап по карте — занять клетку</div>
    </div>
  );
}

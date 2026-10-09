'use client';

import { useEffect, useRef } from 'react';
import { Map as MapLibreMap, setWorkerUrl, type GeoJSONSource, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Point } from 'geojson';
import type { AircraftSnapshot } from '@/lib/snapshot';
import { fixAntimeridian, project } from '@/lib/geo';

// MapLibre locates its worker relative to its own module, which bundling breaks,
// so point it at the worker file emitted as a static asset.
setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href);

// Same plane silhouette as the hero (24x24 viewBox, nose up)
const PLANE_ICON_D =
  'M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z';

/*
  Rebuilding ~12k positions costs ~50ms of main-thread work, so tick only as often
  as the movement is visible: at globe zoom a cruising jet moves under a pixel per
  minute, while zoomed in it moves a pixel every second or two.
*/
function tickInterval(zoom: number) {
  if (zoom < 4) return 15_000;
  if (zoom < 6) return 3_000;
  return 1_000;
}
// Beyond this, extrapolated positions drift too far from reality to be useful
const MAX_EXTRAPOLATION_S = 10 * 60;
const SPIN_DEG_PER_SECOND = 2;
const SELECTED_ZOOM = 4;

type AircraftProps = { i: string; h: number; a: number };

type SymbolPaint = NonNullable<
  Extract<StyleSpecification['layers'][number], { type: 'symbol' }>['paint']
>;
type Opacity = SymbolPaint['icon-opacity'];

// Low and slow traffic fades back; cruising jets read brightest
const ALTITUDE_OPACITY: Opacity = ['interpolate', ['linear'], ['get', 'a'], 0, 0.35, 30000, 0.95];

/** Dims everything except the selected aircraft. */
function aircraftOpacity(selected: string | null): Opacity {
  if (!selected) return ALTITUDE_OPACITY;
  return [
    'case',
    ['==', ['get', 'i'], selected],
    1,
    ['interpolate', ['linear'], ['get', 'a'], 0, 0.1, 30000, 0.3],
  ];
}

const EMPTY: FeatureCollection<Point, AircraftProps> = { type: 'FeatureCollection', features: [] };

function planeImage(pixelRatio: number) {
  const size = 24 * pixelRatio;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(pixelRatio, pixelRatio);
  ctx.fillStyle = '#fff';
  ctx.fill(new Path2D(PLANE_ICON_D));
  return ctx.getImageData(0, 0, size, size);
}

/** Zoom at which the globe fills ~85% of the shorter side of the viewport. */
function fitZoom(el: HTMLElement) {
  const radiusPx = 0.425 * Math.min(el.clientWidth, el.clientHeight);
  return Math.log2((radiusPx * 2 * Math.PI) / 512);
}

const elapsedSince = (snapshot: AircraftSnapshot, now: number) =>
  Math.min(Math.max(now / 1000 - snapshot.time, 0), MAX_EXTRAPOLATION_S);

function toFeatures(snapshot: AircraftSnapshot, now: number) {
  const elapsed = elapsedSince(snapshot, now);
  const features: FeatureCollection<Point, AircraftProps>['features'] = [];

  for (const [icao, , , lat, lng, alt, heading, speed] of snapshot.aircraft) {
    const coordinates =
      heading != null && speed
        ? project(lng, lat, heading, speed, elapsed)
        : [lng, lat];
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates },
      properties: { i: icao, h: heading ?? 0, a: alt ?? 0 },
    });
  }
  return { type: 'FeatureCollection' as const, features };
}

function highlight(map: MapLibreMap, selected: string | null) {
  map.setFilter('selected-ring', ['==', ['get', 'i'], selected ?? '']);
  map.setPaintProperty('aircraft', 'icon-opacity', aircraftOpacity(selected));
}

function baseStyle(): StyleSpecification {
  return {
    version: 8,
    projection: { type: 'globe' },
    sky: {
      'sky-color': '#000000',
      'horizon-color': '#1a1a1a',
      'fog-color': '#000000',
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 5, 0.2, 7, 0],
    },
    sources: {
      land: { type: 'geojson', data: EMPTY },
      borders: { type: 'geojson', data: EMPTY },
      aircraft: { type: 'geojson', data: EMPTY },
    },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': '#060606' } },
      { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#161616' } },
      {
        id: 'borders',
        type: 'line',
        source: 'borders',
        paint: { 'line-color': '#ffffff', 'line-opacity': 0.07, 'line-width': 0.6 },
      },
      {
        id: 'selected-ring',
        type: 'circle',
        source: 'aircraft',
        filter: ['==', ['get', 'i'], ''],
        paint: {
          'circle-radius': 16,
          'circle-color': 'transparent',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-stroke-opacity': 0.9,
          'circle-pitch-alignment': 'map',
        },
      },
      {
        id: 'aircraft',
        type: 'symbol',
        source: 'aircraft',
        layout: {
          'icon-image': 'plane',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 1, 0.32, 4, 0.55, 8, 0.85],
          'icon-rotate': ['get', 'h'],
          'icon-rotation-alignment': 'map',
          'icon-pitch-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        paint: { 'icon-opacity': ALTITUDE_OPACITY },
      },
      {
        // Invisible, larger hit area so small planes are easy to click and tap
        id: 'aircraft-hit',
        type: 'circle',
        source: 'aircraft',
        paint: { 'circle-radius': 9, 'circle-opacity': 0 },
      },
    ],
  };
}

interface GlobeMapProps {
  snapshot: AircraftSnapshot | null;
  selected: string | null;
  onSelect: (icao: string | null) => void;
  reducedMotion: boolean;
  /** Fly to the selected aircraft once it appears (deep links). */
  flyToSelected: boolean;
  onFlown: () => void;
}

export default function GlobeMap({
  snapshot,
  selected,
  onSelect,
  reducedMotion,
  flyToSelected,
  onFlown,
}: GlobeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRef = useRef(false);
  const snapshotRef = useRef(snapshot);
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef(selected);
  // Idle spin runs until the first interaction or deep-link flight
  const spinningRef = useRef(true);

  useEffect(() => {
    snapshotRef.current = snapshot;
    onSelectRef.current = onSelect;
    selectedRef.current = selected;
  });

  /* ── Map lifecycle ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreMap({
      container,
      style: baseStyle(),
      center: [-30, 30],
      zoom: fitZoom(container),
      minZoom: 0.5,
      maxZoom: 10,
      attributionControl: false,
      cooperativeGestures: true,
      renderWorldCopies: false,
    });
    mapRef.current = map;

    let disposed = false;

    const spin = () => {
      if (reducedMotion || !spinningRef.current || disposed || map.getZoom() > 3) return;
      const center = map.getCenter();
      center.lng -= SPIN_DEG_PER_SECOND;
      map.easeTo({ center, duration: 1000, easing: (t) => t });
    };

    const stopSpin = () => {
      spinningRef.current = false;
      map.stop();
    };

    map.on('load', async () => {
      map.addImage('plane', planeImage(2), { pixelRatio: 2 });

      const topo = (await import('world-atlas/countries-50m.json')).default as unknown as Topology<{
        land: GeometryCollection;
        countries: GeometryCollection;
      }>;
      if (disposed) return;
      (map.getSource('land') as GeoJSONSource).setData(fixAntimeridian(feature(topo, topo.objects.land)));
      (map.getSource('borders') as GeoJSONSource).setData(
        fixAntimeridian({
          type: 'Feature',
          properties: {},
          geometry: mesh(topo, topo.objects.countries, (a, b) => a !== b),
        })
      );

      loadedRef.current = true;
      highlight(map, selectedRef.current);
      if (snapshotRef.current) {
        (map.getSource('aircraft') as GeoJSONSource).setData(
          toFeatures(snapshotRef.current, Date.now())
        );
      }
      spin();
    });

    map.on('moveend', spin);
    map.on('mousedown', stopSpin);
    map.on('touchstart', stopSpin);
    map.on('wheel', stopSpin);

    map.on('click', 'aircraft-hit', (e) => {
      const icao = e.features?.[0]?.properties?.i as string | undefined;
      if (icao) onSelectRef.current(icao);
    });
    map.on('click', (e) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: ['aircraft-hit'] });
      if (hits.length === 0) onSelectRef.current(null);
    });
    map.on('mouseenter', 'aircraft-hit', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'aircraft-hit', () => {
      map.getCanvas().style.cursor = '';
    });

    return () => {
      disposed = true;
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, [reducedMotion]);

  /* ── Advance every aircraft along its heading, only while the globe is on screen ── */
  useEffect(() => {
    if (!snapshot) return;
    let onScreen = true;
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
    });
    if (containerRef.current) observer.observe(containerRef.current);

    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      const map = mapRef.current;
      if (map && loadedRef.current && onScreen && !document.hidden) {
        (map.getSource('aircraft') as GeoJSONSource).setData(toFeatures(snapshot, Date.now()));
      }
      timer = setTimeout(update, tickInterval(map?.getZoom() ?? 0));
    };
    // Re-time immediately after zooming, so zooming in doesn't wait out a long tick
    const onZoomEnd = () => {
      clearTimeout(timer);
      update();
    };
    mapRef.current?.on('zoomend', onZoomEnd);
    update();
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      mapRef.current?.off('zoomend', onZoomEnd);
    };
  }, [snapshot]);

  /* ── Selection highlight ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('selected-ring')) return;
    highlight(map, selected);
  }, [selected, snapshot]);

  /* ── Deep link: fly to the aircraft named in the URL ── */
  useEffect(() => {
    if (!flyToSelected || !selected || !snapshot) return;
    const map = mapRef.current;
    const plane = snapshot.aircraft.find((a) => a[0] === selected);
    if (!map || !plane) return;
    // Stop the spin first, or its next easeTo would cancel the flight midway
    spinningRef.current = false;
    map.stop();
    const [, , , lat, lng, , heading, speed] = plane;
    const center =
      heading != null && speed
        ? project(lng, lat, heading, speed, elapsedSince(snapshot, Date.now()))
        : ([lng, lat] as [number, number]);
    map.flyTo({ center, zoom: SELECTED_ZOOM, duration: reducedMotion ? 0 : 2500 });
    onFlown();
  }, [flyToSelected, selected, snapshot, reducedMotion, onFlown]);

  // MapLibre's stylesheet forces `position: relative` on the map container, so size it via a wrapper
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

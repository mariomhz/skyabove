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
  as the movement is visible: at world zoom a cruising jet moves under a pixel per
  minute, while zoomed in it moves a pixel every second or two.
*/
function tickInterval(zoom: number) {
  if (zoom < 4) return 15_000;
  if (zoom < 6) return 3_000;
  return 1_000;
}
// Beyond this, extrapolated positions drift too far from reality to be useful
const MAX_EXTRAPOLATION_S = 10 * 60;
const SELECTED_ZOOM = 4;
// Frames the populated latitudes rather than the poles
const INITIAL_CENTER: [number, number] = [-20, 30];

type AircraftProps = { i: string; h: number; a: number };

type SymbolPaint = NonNullable<
  Extract<StyleSpecification['layers'][number], { type: 'symbol' }>['paint']
>;
type Opacity = SymbolPaint['icon-opacity'];
/** The expression-array form of a style value, as opposed to a constant or legacy function */
type Expression = Extract<NonNullable<Opacity>, unknown[]>;

// Below this zoom traffic is drawn as fine dots; plane icons would merge into blobs
const ICON_MIN_ZOOM = 3;

const byAltitude = (low: number, cruise: number): Expression => [
  'interpolate', ['linear'], ['get', 'a'], 0, low, 30000, cruise,
];

// Low and slow traffic fades back; cruising jets read darkest
const ICON_OPACITY = byAltitude(0.3, 0.9);
const DOT_OPACITY = byAltitude(0.3, 0.8);

/** Dims everything except the selected aircraft. */
function withSelection(base: Opacity, selected: string | null): Opacity {
  if (!selected) return base;
  return ['case', ['==', ['get', 'i'], selected], 1, byAltitude(0.06, 0.18)];
}

const EMPTY: FeatureCollection<Point, AircraftProps> = { type: 'FeatureCollection', features: [] };

function planeImage(pixelRatio: number) {
  const size = 24 * pixelRatio;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(pixelRatio, pixelRatio);
  ctx.fillStyle = '#000';
  ctx.fill(new Path2D(PLANE_ICON_D));
  return ctx.getImageData(0, 0, size, size);
}

/**
 * Smallest zoom at which the (square) Mercator world covers the container. On
 * tall screens it zooms further so the poles are cropped rather than the map
 * shrinking to show Antarctica.
 */
function coverZoom(el: HTMLElement) {
  return Math.log2(Math.max(el.clientWidth, el.clientHeight * 1.5) / 512);
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
  map.setPaintProperty('aircraft', 'icon-opacity', withSelection(ICON_OPACITY, selected));
  map.setPaintProperty('aircraft-dots', 'circle-opacity', withSelection(DOT_OPACITY, selected));
}

function baseStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      land: { type: 'geojson', data: EMPTY },
      borders: { type: 'geojson', data: EMPTY },
      aircraft: { type: 'geojson', data: EMPTY },
    },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': '#ffffff' } },
      { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#ececec' } },
      {
        id: 'borders',
        type: 'line',
        source: 'borders',
        paint: { 'line-color': '#000000', 'line-opacity': 0.08, 'line-width': 0.6 },
      },
      {
        id: 'selected-ring',
        type: 'circle',
        source: 'aircraft',
        filter: ['==', ['get', 'i'], ''],
        paint: {
          'circle-radius': 16,
          'circle-color': 'transparent',
          'circle-stroke-color': '#000000',
          'circle-stroke-width': 1.5,
          'circle-stroke-opacity': 0.9,
          'circle-pitch-alignment': 'map',
        },
      },
      {
        id: 'aircraft-dots',
        type: 'circle',
        source: 'aircraft',
        maxzoom: ICON_MIN_ZOOM,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 1.3, ICON_MIN_ZOOM, 2],
          'circle-color': '#000000',
          'circle-opacity': DOT_OPACITY,
        },
      },
      {
        id: 'aircraft',
        type: 'symbol',
        source: 'aircraft',
        minzoom: ICON_MIN_ZOOM,
        layout: {
          'icon-image': 'plane',
          'icon-size': ['interpolate', ['linear'], ['zoom'], ICON_MIN_ZOOM, 0.45, 8, 0.85],
          'icon-rotate': ['get', 'h'],
          'icon-rotation-alignment': 'map',
          'icon-pitch-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        paint: { 'icon-opacity': ICON_OPACITY },
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

interface FlightMapProps {
  snapshot: AircraftSnapshot | null;
  selected: string | null;
  onSelect: (icao: string | null) => void;
  reducedMotion: boolean;
  /** Fly to the selected aircraft once it appears (deep links). */
  flyToSelected: boolean;
  onFlown: () => void;
}

export default function FlightMap({
  snapshot,
  selected,
  onSelect,
  reducedMotion,
  flyToSelected,
  onFlown,
}: FlightMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRef = useRef(false);
  const snapshotRef = useRef(snapshot);
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef(selected);

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
      center: INITIAL_CENTER,
      zoom: coverZoom(container),
      minZoom: coverZoom(container),
      maxZoom: 10,
      attributionControl: false,
      cooperativeGestures: true,
    });
    mapRef.current = map;

    let disposed = false;

    // Never let the map zoom out past the point where it leaves blank space
    map.on('resize', () => map.setMinZoom(coverZoom(container)));

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
    });

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
  }, []);

  /* ── Advance every aircraft along its heading, only while the map is on screen ── */
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

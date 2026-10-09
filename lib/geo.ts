const EARTH_RADIUS_M = 6_371_000;
const KT_TO_MS = 0.514444;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Dead reckoning: where an aircraft ends up after flying `seconds` along a
 * great circle from [lng, lat] at its current heading and ground speed.
 */
export function project(
  lng: number,
  lat: number,
  headingDeg: number,
  speedKt: number,
  seconds: number
): [number, number] {
  const δ = (speedKt * KT_TO_MS * seconds) / EARTH_RADIUS_M;
  const θ = toRad(headingDeg);
  const φ1 = toRad(lat);
  const λ1 = toRad(lng);

  const sinφ2 = Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * sinφ2
    );

  return [((toDeg(λ2) + 540) % 360) - 180, toDeg(φ2)];
}

type Position = number[];

/** Makes longitudes continuous across the antimeridian (179 → 181 instead of 179 → -179). */
function unwrap(line: Position[]): Position[] {
  let offset = 0;
  return line.map((p, i) => {
    if (i > 0) {
      const d = p[0] - line[i - 1][0];
      if (d > 180) offset -= 360;
      else if (d < -180) offset += 360;
    }
    return [p[0] + offset, p[1]];
  });
}

function fixRing(ring: Position[]): Position[] {
  const r = unwrap(ring);
  const first = r[0];
  const last = r[r.length - 1];
  if (Math.abs(last[0] - first[0]) < 180) return r;
  // The ring circles a pole (Antarctica): close it through that pole
  const poleLat = r.reduce((s, p) => s + p[1], 0) / r.length < 0 ? -90 : 90;
  return [...r, [last[0], poleLat], [first[0], poleLat], first];
}

/**
 * Natural Earth polygons cross the antimeridian with a ±360° jump, which planar
 * renderers draw as a band around the whole globe. Unwraps them so they render
 * as the actual shapes.
 */
export function fixAntimeridian<T extends GeoJSON.Feature | GeoJSON.FeatureCollection>(geo: T): T {
  const fixGeometry = (g: GeoJSON.Geometry): GeoJSON.Geometry => {
    switch (g.type) {
      case 'Polygon':
        return { ...g, coordinates: g.coordinates.map(fixRing) };
      case 'MultiPolygon':
        return { ...g, coordinates: g.coordinates.map((poly) => poly.map(fixRing)) };
      case 'LineString':
        return { ...g, coordinates: unwrap(g.coordinates) };
      case 'MultiLineString':
        return { ...g, coordinates: g.coordinates.map(unwrap) };
      default:
        return g;
    }
  };
  if (geo.type === 'FeatureCollection') {
    return {
      ...geo,
      features: geo.features.map((f) => ({ ...f, geometry: f.geometry && fixGeometry(f.geometry) })),
    };
  }
  return { ...geo, geometry: geo.geometry && fixGeometry(geo.geometry) };
}

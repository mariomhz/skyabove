const OPENSKY_BASE = "https://opensky-network.org/api";
const PROXY = "";

// ── Types ──────────────────────────────────────────────────────────────

export interface FlightState {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  timePosition: number | null;
  lastContact: number;
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null;
  onGround: boolean;
  velocity: number | null;
  trueTrack: number | null;
  verticalRate: number | null;
  geoAltitude: number | null;
  squawk: string | null;
  spi: boolean;
  positionSource: number;
  category: number;
}

export interface GlobalStats {
  totalActive: number;
  airborne: number;
  onGround: number;
  byCountry: { country: string; count: number }[];
  avgAltitude: number;
  avgSpeed: number;
  totalCountries: number;
  highestAltitude: { value: number; callsign: string | null };
  fastestAircraft: { value: number; callsign: string | null };
  topAirline: { code: string; count: number } | null;
}

export interface BoundingBox {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}

// ── Parser ─────────────────────────────────────────────────────────────

export function parseStateVector(raw: unknown[]): FlightState {
  return {
    icao24: raw[0] as string,
    callsign: raw[1] != null ? (raw[1] as string).trim() || null : null,
    originCountry: raw[2] as string,
    timePosition: raw[3] as number | null,
    lastContact: raw[4] as number,
    longitude: raw[5] as number | null,
    latitude: raw[6] as number | null,
    baroAltitude: raw[7] as number | null,
    onGround: raw[8] as boolean,
    velocity: raw[9] as number | null,
    trueTrack: raw[10] as number | null,
    verticalRate: raw[11] as number | null,
    geoAltitude: raw[13] as number | null,
    squawk: raw[14] as string | null,
    spi: raw[15] as boolean,
    positionSource: raw[16] as number,
    category: (raw[17] as number) ?? 0,
  };
}

// ── Fetch helpers ──────────────────────────────────────────────────────

export async function fetchAllFlights(): Promise<{
  time: number;
  flights: FlightState[];
}> {
  const url = `${OPENSKY_BASE}/states/all?extended=1`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`OpenSky API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const states: unknown[][] = data.states ?? [];
  return {
    time: data.time as number,
    flights: states.map(parseStateVector),
  };
}

export async function fetchFlightsByArea(
  bounds: BoundingBox
): Promise<{ time: number; flights: FlightState[] }> {
  const params = new URLSearchParams({
    extended: "1",
    lamin: String(bounds.lamin),
    lomin: String(bounds.lomin),
    lamax: String(bounds.lamax),
    lomax: String(bounds.lomax),
  });
  const url = `${OPENSKY_BASE}/states/all?${params}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`OpenSky API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const states: unknown[][] = data.states ?? [];
  return {
    time: data.time as number,
    flights: states.map(parseStateVector),
  };
}

// ── Stats ──────────────────────────────────────────────────────────────

export function computeGlobalStats(flights: FlightState[]): GlobalStats {
  const airborne = flights.filter((f) => !f.onGround);
  const onGround = flights.length - airborne.length;

  // Top 10 countries
  const countryMap = new Map<string, number>();
  for (const f of flights) {
    countryMap.set(f.originCountry, (countryMap.get(f.originCountry) ?? 0) + 1);
  }
  const byCountry = Array.from(countryMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Averages + extremes (only from airborne aircraft with valid values)
  let altSum = 0;
  let altCount = 0;
  let spdSum = 0;
  let spdCount = 0;
  let maxAlt = -Infinity;
  let maxAltCallsign: string | null = null;
  let maxSpd = -Infinity;
  let maxSpdCallsign: string | null = null;

  for (const f of airborne) {
    if (f.geoAltitude != null) {
      altSum += f.geoAltitude;
      altCount++;
      if (f.geoAltitude > maxAlt) {
        maxAlt = f.geoAltitude;
        maxAltCallsign = f.callsign;
      }
    }
    if (f.velocity != null) {
      spdSum += f.velocity;
      spdCount++;
      if (f.velocity > maxSpd) {
        maxSpd = f.velocity;
        maxSpdCallsign = f.callsign;
      }
    }
  }

  // Top airline by ICAO callsign prefix (e.g. "UAL" from "UAL1234")
  const airlineMap = new Map<string, number>();
  for (const f of flights) {
    if (f.callsign) {
      const match = f.callsign.match(/^([A-Z]{2,4})/);
      if (match) {
        const code = match[1];
        airlineMap.set(code, (airlineMap.get(code) ?? 0) + 1);
      }
    }
  }
  let topAirline: { code: string; count: number } | null = null;
  for (const [code, count] of airlineMap) {
    if (!topAirline || count > topAirline.count) {
      topAirline = { code, count };
    }
  }

  return {
    totalActive: flights.length,
    airborne: airborne.length,
    onGround,
    byCountry,
    avgAltitude: altCount > 0 ? Math.round(altSum / altCount) : 0,
    avgSpeed: spdCount > 0 ? Math.round(spdSum / spdCount) : 0,
    totalCountries: countryMap.size,
    highestAltitude: {
      value: maxAlt === -Infinity ? 0 : Math.round(maxAlt),
      callsign: maxAltCallsign,
    },
    fastestAircraft: {
      value: maxSpd === -Infinity ? 0 : Math.round(maxSpd),
      callsign: maxSpdCallsign,
    },
    topAirline,
  };
}

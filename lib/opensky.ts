import { airlineName } from "@/lib/airlines";

/*
  OpenSky Network REST API — https://openskynetwork.github.io/opensky-api/rest.html
  A global /states/all call costs 4 credits. Anonymous clients get 400 credits/day,
  OAuth2 API clients get 4,000/day.
*/

const STATES_URL = "https://opensky-network.org/api/states/all";
const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

const CLIENT_ID = process.env.OPENSKY_CLIENT_ID;
const CLIENT_SECRET = process.env.OPENSKY_CLIENT_SECRET;

export const hasCredentials = Boolean(CLIENT_ID && CLIENT_SECRET);

/** State vector tuple, indexed as documented by OpenSky. */
export type StateVector = [
  icao24: string,
  callsign: string | null,
  originCountry: string,
  timePosition: number | null,
  lastContact: number,
  longitude: number | null,
  latitude: number | null,
  baroAltitude: number | null,
  onGround: boolean,
  velocity: number | null,
  trueTrack: number | null,
  verticalRate: number | null,
  sensors: number[] | null,
  geoAltitude: number | null,
  squawk: string | null,
  spi: boolean,
  positionSource: number,
];

interface StatesResponse {
  time: number;
  states: StateVector[] | null;
}

export interface DashboardStats {
  tracked: number;
  airborne: number;
  onGround: number;
  topAirlines: { code: string; name: string; count: number }[];
  topCountries: { name: string; count: number }[];
  highestAltitude: { feet: number; callsign: string } | null;
  fastest: { knots: number; callsign: string } | null;
  avgCruiseAltitude: number | null;
  avgGroundSpeed: number | null;
  climbing: number;
  descending: number;
  emergencies: { callsign: string; squawk: string }[];
  fetchedAt: string;
}

/* ── OAuth2 client-credentials token, reused until shortly before expiry ── */

let token: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  if (!hasCredentials) return null;
  if (token && Date.now() < token.expiresAt) return token.value;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`OpenSky auth HTTP ${res.status}`);

  const body: { access_token: string; expires_in: number } = await res.json();
  token = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in - 60) * 1000,
  };
  return token.value;
}

export async function fetchStates(): Promise<StatesResponse> {
  const accessToken = await getToken();
  const res = await fetch(STATES_URL, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (res.status === 429) {
    const retry = res.headers.get("X-Rate-Limit-Retry-After-Seconds");
    throw new Error(
      `OpenSky rate limit reached${retry ? `, retry in ${retry}s` : ""}`
    );
  }
  if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`);

  return res.json();
}

/* ── Stats ── */

const M_TO_FT = 3.28084;
const MS_TO_KT = 1.94384;

// Readings beyond these are transponder glitches, not real aircraft.
const MAX_ALTITUDE_M = 16_000; // ~52,500 ft, above any civil jet ceiling
const MAX_VELOCITY_MS = 370; // ~720 kt ground speed
const CRUISE_FLOOR_M = 7_620; // FL250
const LEVEL_RATE_MS = 2.5; // ~500 ft/min
const EMERGENCY_SQUAWKS = new Set(["7500", "7600", "7700"]);
const AIRLINE_CALLSIGN = /^([A-Z]{3})\d/;

const mean = (values: number[]) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;

function topN<T extends { count: number }>(items: Iterable<T>, n: number) {
  return [...items].sort((a, b) => b.count - a.count).slice(0, n);
}

export function computeDashboardStats({ time, states }: StatesResponse): DashboardStats {
  const all = (states ?? []).filter((s) => s[5] != null && s[6] != null);

  let airborne = 0;
  let climbing = 0;
  let descending = 0;
  const airlines = new Map<string, number>();
  const countries = new Map<string, number>();
  const cruiseAltitudes: number[] = [];
  const speeds: number[] = [];
  let highest: { meters: number; callsign: string } | null = null;
  let fastest: { ms: number; callsign: string } | null = null;
  const emergencies: DashboardStats["emergencies"] = [];

  for (const s of all) {
    const callsign = s[1]?.trim() || s[0].toUpperCase();

    if (s[14] && EMERGENCY_SQUAWKS.has(s[14])) {
      emergencies.push({ callsign, squawk: s[14] });
    }
    if (s[8]) continue;
    airborne++;

    countries.set(s[2], (countries.get(s[2]) ?? 0) + 1);

    const code = s[1]?.trim().match(AIRLINE_CALLSIGN)?.[1];
    if (code) airlines.set(code, (airlines.get(code) ?? 0) + 1);

    const vrate = s[11];
    if (vrate != null) {
      if (vrate > LEVEL_RATE_MS) climbing++;
      else if (vrate < -LEVEL_RATE_MS) descending++;
    }

    const alt = s[7] ?? s[13];
    if (alt != null && alt > 0 && alt <= MAX_ALTITUDE_M) {
      if (!highest || alt > highest.meters) highest = { meters: alt, callsign };
      if (alt >= CRUISE_FLOOR_M && vrate != null && Math.abs(vrate) <= LEVEL_RATE_MS) {
        cruiseAltitudes.push(alt);
      }
    }

    const v = s[9];
    if (v != null && v > 0 && v <= MAX_VELOCITY_MS) {
      speeds.push(v);
      if (!fastest || v > fastest.ms) fastest = { ms: v, callsign };
    }
  }

  const avgCruise = mean(cruiseAltitudes);
  const avgSpeed = mean(speeds);

  return {
    tracked: all.length,
    airborne,
    onGround: all.length - airborne,
    topAirlines: topN(
      [...airlines].map(([code, count]) => ({ code, name: airlineName(code), count })),
      5
    ),
    topCountries: topN(
      [...countries].map(([name, count]) => ({ name, count })),
      5
    ),
    highestAltitude: highest
      ? { feet: Math.round(highest.meters * M_TO_FT), callsign: highest.callsign }
      : null,
    fastest: fastest
      ? { knots: Math.round(fastest.ms * MS_TO_KT), callsign: fastest.callsign }
      : null,
    avgCruiseAltitude: avgCruise != null ? Math.round((avgCruise * M_TO_FT) / 100) * 100 : null,
    avgGroundSpeed: avgSpeed != null ? Math.round(avgSpeed * MS_TO_KT) : null,
    climbing,
    descending,
    emergencies,
    fetchedAt: new Date(time * 1000).toISOString(),
  };
}

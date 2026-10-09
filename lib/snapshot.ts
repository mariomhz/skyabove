import { unstable_cache } from "next/cache";
import {
  fetchStates,
  computeDashboardStats,
  hasCredentials,
  type DashboardStats,
  type StateVector,
} from "@/lib/opensky";

/*
  One OpenSky fetch per refresh window feeds both the stats and the globe.
  Refresh interval is sized to the credit budget (4 credits per global call):
  authenticated 4,000/day → every 2 min uses at most 2,880; anonymous 400/day →
  every 15 min uses at most 384. The cache is shared across serverless instances
  and serves the previous snapshot while a refresh runs or if it fails.
*/
export const REFRESH_SECONDS = hasCredentials ? 120 : 900;

/**
 * Compact airborne aircraft record, kept as a tuple to stay well under the
 * 2 MB data-cache limit with ~12,000 aircraft.
 */
export type Aircraft = [
  icao24: string,
  callsign: string,
  countryIndex: number,
  lat: number,
  lng: number,
  altitudeFt: number | null,
  headingDeg: number | null,
  speedKt: number | null,
  verticalRateFpm: number | null,
  squawk: string | null,
];

export interface AircraftSnapshot {
  time: number;
  countries: string[];
  aircraft: Aircraft[];
}

export interface Snapshot {
  stats: DashboardStats;
  positions: AircraftSnapshot;
}

const M_TO_FT = 3.28084;
const MS_TO_KT = 1.94384;
const MS_TO_FPM = 196.85;

const round = (n: number | null, factor: number, step = 1) =>
  n == null ? null : Math.round((n * factor) / step) * step;

const toFixed3 = (n: number) => Math.round(n * 1000) / 1000;

function compactAircraft(time: number, states: StateVector[]): AircraftSnapshot {
  const countries: string[] = [];
  const countryIndex = new Map<string, number>();
  const aircraft: Aircraft[] = [];

  for (const s of states) {
    if (s[8] || s[5] == null || s[6] == null) continue;

    let ci = countryIndex.get(s[2]);
    if (ci === undefined) {
      ci = countries.push(s[2]) - 1;
      countryIndex.set(s[2], ci);
    }

    aircraft.push([
      s[0],
      s[1]?.trim() ?? "",
      ci,
      toFixed3(s[6]),
      toFixed3(s[5]),
      round(s[7] ?? s[13], M_TO_FT, 100),
      round(s[10], 1),
      round(s[9], MS_TO_KT),
      round(s[11], MS_TO_FPM, 50),
      s[14],
    ]);
  }

  return { time, countries, aircraft };
}

export const getSnapshot = unstable_cache(
  async (): Promise<Snapshot> => {
    const response = await fetchStates();
    return {
      stats: computeDashboardStats(response),
      positions: compactAircraft(response.time, response.states ?? []),
    };
  },
  ["opensky-snapshot"],
  { revalidate: REFRESH_SECONDS }
);

/** Lets CDNs share a response for part of the refresh window. */
export const cacheHeaders = {
  "Cache-Control": `public, s-maxage=60, stale-while-revalidate=${REFRESH_SECONDS}`,
};

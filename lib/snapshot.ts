import { unstable_cache } from "next/cache";
import type { Snapshot } from "@/lib/opensky";

export type { Aircraft, AircraftSnapshot, Snapshot } from "@/lib/opensky";

/*
  OpenSky blocks requests from AWS, where Vercel runs, so a scheduled GitHub
  Action (.github/workflows/snapshot.yml) fetches it every 15 minutes and
  publishes snapshot.json to the repo's `data` branch. The site reads that file.
*/
const SNAPSHOT_URL =
  process.env.SNAPSHOT_URL ??
  "https://raw.githubusercontent.com/mariomhz/skyabove/data/snapshot.json";

/** How often the server re-reads the published snapshot. */
export const REFRESH_SECONDS = 120;

export const getSnapshot = unstable_cache(
  async (): Promise<Snapshot> => {
    const res = await fetch(SNAPSHOT_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`Snapshot HTTP ${res.status}`);
    const snapshot: Snapshot = await res.json();
    if (!snapshot?.stats || !Array.isArray(snapshot.positions?.aircraft)) {
      throw new Error("Snapshot is malformed");
    }
    return snapshot;
  },
  ["published-snapshot"],
  { revalidate: REFRESH_SECONDS }
);

/** Lets CDNs share a response for part of the refresh window. */
export const cacheHeaders = {
  "Cache-Control": `public, s-maxage=60, stale-while-revalidate=${REFRESH_SECONDS}`,
};

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchStates, computeDashboardStats, hasCredentials } from "@/lib/opensky";

export const preferredRegion = "fra1";
export const maxDuration = 30;

/*
  Refresh interval sized to the OpenSky credit budget (4 credits per global call):
  authenticated 4,000/day → every 2 min uses at most 2,880; anonymous 400/day →
  every 15 min uses at most 384. The cache is shared across serverless instances
  and serves the previous snapshot while a refresh runs or if it fails.
*/
const REFRESH_SECONDS = hasCredentials ? 120 : 900;

const getStats = unstable_cache(
  async () => computeDashboardStats(await fetchStates()),
  ["opensky-dashboard-stats"],
  { revalidate: REFRESH_SECONDS }
);

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json({ stats, refreshSeconds: REFRESH_SECONDS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

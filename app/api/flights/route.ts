import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllFlights,
  fetchFlightsByArea,
  computeGlobalStats,
} from "@/lib/opensky";

export const preferredRegion = "fra1";
export const maxDuration = 30;

// In-memory cache to avoid hammering OpenSky's rate limits
let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 15_000; // 15 seconds

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const lamin = searchParams.get("lamin");
    const lomin = searchParams.get("lomin");
    const lamax = searchParams.get("lamax");
    const lomax = searchParams.get("lomax");

    const isAreaQuery = lamin && lomin && lamax && lomax;

    // Serve from cache for non-area (global) queries
    if (!isAreaQuery && cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data);
    }

    const result = isAreaQuery
      ? await fetchFlightsByArea({
          lamin: Number(lamin),
          lomin: Number(lomin),
          lamax: Number(lamax),
          lomax: Number(lomax),
        })
      : await fetchAllFlights();

    const stats = computeGlobalStats(result.flights);

    const payload = {
      time: result.time,
      total: result.flights.length,
      stats,
    };

    if (!isAreaQuery) {
      cache = { data: payload, ts: Date.now() };
    }

    return NextResponse.json(payload);
  } catch (error) {
    // If OpenSky is down/rate-limited but we have stale cache, serve it
    if (cache) {
      return NextResponse.json(cache.data);
    }
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllFlights,
  fetchFlightsByArea,
  computeGlobalStats,
  type FlightState,
  type GlobalStats,
} from "@/lib/opensky";

// ── In-memory cache (10s TTL) ──────────────────────────────────────────

interface CacheEntry {
  time: number;
  flights: FlightState[];
  stats: GlobalStats;
  cachedAt: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL = 10_000; // 10 seconds

function isCacheValid(key: string): boolean {
  return (
    cache !== null &&
    cache.cachedAt + CACHE_TTL > Date.now() &&
    key === "all" // area queries bypass cache
  );
}

// ── Route handler ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const lamin = searchParams.get("lamin");
    const lomin = searchParams.get("lomin");
    const lamax = searchParams.get("lamax");
    const lomax = searchParams.get("lomax");

    const isAreaQuery = lamin && lomin && lamax && lomax;

    if (!isAreaQuery && isCacheValid("all")) {
      return NextResponse.json({
        time: cache!.time,
        total: cache!.flights.length,
        stats: cache!.stats,
        flights: cache!.flights,
      });
    }

    let time: number;
    let flights: FlightState[];

    if (isAreaQuery) {
      const result = await fetchFlightsByArea({
        lamin: Number(lamin),
        lomin: Number(lomin),
        lamax: Number(lamax),
        lomax: Number(lomax),
      });
      time = result.time;
      flights = result.flights;
    } else {
      const result = await fetchAllFlights();
      time = result.time;
      flights = result.flights;
    }

    const stats = computeGlobalStats(flights);

    // Cache global queries only
    if (!isAreaQuery) {
      cache = { time, flights, stats, cachedAt: Date.now() };
    }

    return NextResponse.json({
      time,
      total: flights.length,
      stats,
      flights,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { fetchFlights, computeDashboardStats } from "@/lib/aviationstack";
import type { DashboardStats } from "@/lib/aviationstack";

export const preferredRegion = "fra1";
export const maxDuration = 30;

let cache: { stats: DashboardStats; ts: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json({
        stats: cache.stats,
        cached: true,
        cacheAge: Math.round((Date.now() - cache.ts) / 1000),
      });
    }

    const { flights, total } = await fetchFlights();
    const stats = computeDashboardStats(flights, total);

    cache = { stats, ts: Date.now() };

    return NextResponse.json({
      stats,
      cached: false,
      cacheAge: 0,
    });
  } catch (error) {
    if (cache) {
      return NextResponse.json({
        stats: cache.stats,
        cached: true,
        stale: true,
        cacheAge: Math.round((Date.now() - cache.ts) / 1000),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

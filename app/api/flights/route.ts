import { NextResponse } from "next/server";
import { fetchFlights, computeDashboardStats } from "@/lib/aviationstack";
import type { DashboardStats } from "@/lib/aviationstack";

export const preferredRegion = "fra1";
export const maxDuration = 30;

let cache: { stats: DashboardStats; ts: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

/* ── In-memory rate limiter ── */
const RATE_LIMIT = 20;
const RATE_WINDOW = 60 * 1000;
const hits = new Map<string, number[]>();

// Periodic cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of hits) {
    const valid = timestamps.filter((t) => now - t < RATE_WINDOW);
    if (valid.length === 0) hits.delete(ip);
    else hits.set(ip, valid);
  }
}, 5 * 60 * 1000);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW);
  timestamps.push(now);
  hits.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT;
}

export async function GET(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": "60" },
      }
    );
  }
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

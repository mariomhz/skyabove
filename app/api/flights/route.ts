import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllFlights,
  fetchFlightsByArea,
  computeGlobalStats,
} from "@/lib/opensky";

export const preferredRegion = "fra1";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const lamin = searchParams.get("lamin");
    const lomin = searchParams.get("lomin");
    const lamax = searchParams.get("lamax");
    const lomax = searchParams.get("lomax");

    const isAreaQuery = lamin && lomin && lamax && lomax;

    const result = isAreaQuery
      ? await fetchFlightsByArea({
          lamin: Number(lamin),
          lomin: Number(lomin),
          lamax: Number(lamax),
          lomax: Number(lomax),
        })
      : await fetchAllFlights();

    const stats = computeGlobalStats(result.flights);

    return NextResponse.json({
      time: result.time,
      total: result.flights.length,
      stats,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// AviationStack API client (free plan: HTTP only, 100 req/month, 100 results/call)

export interface AviationStackFlight {
  flight_date: string;
  flight_status: "scheduled" | "active" | "landed" | "cancelled" | "incident" | "diverted";
  departure: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    scheduled: string;
    estimated: string | null;
    actual: string | null;
    delay: number | null;
  };
  arrival: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    scheduled: string;
    estimated: string | null;
    actual: string | null;
    delay: number | null;
  };
  airline: {
    name: string;
    iata: string;
    icao: string;
  };
  flight: {
    number: string;
    iata: string;
    icao: string;
  };
  live: {
    updated: string;
    latitude: number;
    longitude: number;
    altitude: number;
    direction: number;
    speed_horizontal: number;
    speed_vertical: number;
    is_ground: boolean;
  } | null;
}

export interface AviationStackResponse {
  pagination: { limit: number; offset: number; count: number; total: number };
  data: AviationStackFlight[];
  error?: { code: string; message: string };
}

export interface DashboardStats {
  totalFlights: number;
  activeFlights: number;
  landedFlights: number;
  scheduledFlights: number;
  topAirlines: { name: string; count: number }[];
  busiestDepartures: { iata: string; name: string; count: number }[];
  busiestArrivals: { iata: string; name: string; count: number }[];
  avgDepartureDelay: number;
  mostDelayedFlight: { iata: string; delay: number } | null;
  avgAltitude: number | null;
  avgSpeed: number | null;
  highestAltitude: { value: number; flight: string } | null;
  fastestAircraft: { value: number; flight: string } | null;
  hasLiveData: boolean;
  fetchedAt: string;
  dataScope: number;
}

const API_KEY = process.env.AVIATIONSTACK_API_KEY;
const BASE_URL = "http://api.aviationstack.com/v1";

export async function fetchFlights(): Promise<{
  flights: AviationStackFlight[];
  total: number;
}> {
  if (!API_KEY) throw new Error("AVIATIONSTACK_API_KEY is not set");

  const url = `${BASE_URL}/flights?access_key=${API_KEY}&flight_status=active&limit=100`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`AviationStack HTTP ${res.status}: ${res.statusText}`);
  }

  const body: AviationStackResponse = await res.json();

  if (body.error) {
    throw new Error(`AviationStack API error: ${body.error.message}`);
  }

  return {
    flights: body.data ?? [],
    total: body.pagination?.total ?? 0,
  };
}

export function computeDashboardStats(
  flights: AviationStackFlight[],
  total: number
): DashboardStats {
  let active = 0;
  let landed = 0;
  let scheduled = 0;

  const airlineCounts = new Map<string, number>();
  const departureCounts = new Map<string, { name: string; count: number }>();
  const arrivalCounts = new Map<string, { name: string; count: number }>();

  let totalDelay = 0;
  let delayCount = 0;
  let mostDelayed: { iata: string; delay: number } | null = null;

  const liveAltitudes: number[] = [];
  const liveSpeeds: number[] = [];
  let highestAlt: { value: number; flight: string } | null = null;
  let fastest: { value: number; flight: string } | null = null;

  for (const f of flights) {
    // Status counts
    if (f.flight_status === "active") active++;
    else if (f.flight_status === "landed") landed++;
    else if (f.flight_status === "scheduled") scheduled++;

    // Airline tally
    const airlineName = f.airline?.name || "Unknown";
    airlineCounts.set(airlineName, (airlineCounts.get(airlineName) ?? 0) + 1);

    // Departure airport tally
    const depIata = f.departure?.iata;
    if (depIata) {
      const existing = departureCounts.get(depIata);
      if (existing) {
        existing.count++;
      } else {
        departureCounts.set(depIata, { name: f.departure.airport || depIata, count: 1 });
      }
    }

    // Arrival airport tally
    const arrIata = f.arrival?.iata;
    if (arrIata) {
      const existing = arrivalCounts.get(arrIata);
      if (existing) {
        existing.count++;
      } else {
        arrivalCounts.set(arrIata, { name: f.arrival.airport || arrIata, count: 1 });
      }
    }

    // Delay tracking
    const delay = f.departure?.delay;
    if (delay != null && delay > 0) {
      totalDelay += delay;
      delayCount++;
      if (!mostDelayed || delay > mostDelayed.delay) {
        mostDelayed = { iata: f.flight?.iata || f.flight?.icao || "???", delay };
      }
    }

    // Live telemetry
    if (f.live) {
      if (f.live.altitude > 0) {
        liveAltitudes.push(f.live.altitude);
        const flightId = f.flight?.iata || f.flight?.icao || "???";
        if (!highestAlt || f.live.altitude > highestAlt.value) {
          highestAlt = { value: f.live.altitude, flight: flightId };
        }
      }
      if (f.live.speed_horizontal > 0) {
        liveSpeeds.push(f.live.speed_horizontal);
        const flightId = f.flight?.iata || f.flight?.icao || "???";
        if (!fastest || f.live.speed_horizontal > fastest.value) {
          fastest = { value: f.live.speed_horizontal, flight: flightId };
        }
      }
    }
  }

  // Sort and pick top entries
  const topAirlines = [...airlineCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const busiestDepartures = [...departureCounts.entries()]
    .map(([iata, v]) => ({ iata, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const busiestArrivals = [...arrivalCounts.entries()]
    .map(([iata, v]) => ({ iata, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const avgAlt = liveAltitudes.length
    ? Math.round(liveAltitudes.reduce((s, v) => s + v, 0) / liveAltitudes.length)
    : null;

  const avgSpd = liveSpeeds.length
    ? Math.round(liveSpeeds.reduce((s, v) => s + v, 0) / liveSpeeds.length)
    : null;

  return {
    totalFlights: total,
    activeFlights: active,
    landedFlights: landed,
    scheduledFlights: scheduled,
    topAirlines,
    busiestDepartures,
    busiestArrivals,
    avgDepartureDelay: delayCount > 0 ? Math.round(totalDelay / delayCount) : 0,
    mostDelayedFlight: mostDelayed,
    avgAltitude: avgAlt,
    avgSpeed: avgSpd,
    highestAltitude: highestAlt,
    fastestAircraft: fastest,
    hasLiveData: liveAltitudes.length > 0 || liveSpeeds.length > 0,
    fetchedAt: new Date().toISOString(),
    dataScope: flights.length,
  };
}

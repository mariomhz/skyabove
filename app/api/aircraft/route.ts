import { NextResponse } from "next/server";
import { getSnapshot, cacheHeaders } from "@/lib/snapshot";

export const preferredRegion = "fra1";
export const maxDuration = 30;

export async function GET() {
  try {
    const { positions } = await getSnapshot();
    return NextResponse.json(positions, { headers: cacheHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

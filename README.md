# SKYABOVE

Live flight tracking dashboard built with Next.js. Plots every aircraft currently tracked by the [OpenSky Network](https://opensky-network.org) ADS-B feed on an interactive full-bleed world map and computes real-time statistics from the full snapshot, with animated flip-clock transitions.

## Stack

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- GSAP with ScrollTrigger
- MapLibre GL with Natural Earth boundaries from `world-atlas`

## Features

- Interactive world map showing ~12,000 live aircraft, each rotated to its heading and faded by altitude
- Aircraft keep moving between data refreshes via great-circle dead reckoning from speed and heading
- Click any aircraft for callsign, airline, altitude, speed, heading, vertical rate, squawk, and a link to its live track
- Shareable deep links (`/?aircraft=<icao24>`) fly straight to a specific aircraft
- Map library and boundary data load only when the map nears the viewport; position updates scale with zoom and pause off-screen
- Stats computed from the full global snapshot (~10,000+ airborne aircraft), not a sample: airborne vs. on-ground counts, top airlines, top registration countries, highest and fastest aircraft, average cruise altitude and ground speed, climb/descent counts, active emergency squawks
- Airline names decoded from ICAO callsign prefixes
- Transponder glitches filtered out of altitude and speed records
- Per-character flip animations on value changes
- Scroll-triggered staggered entrance animations
- Skeleton loading states during data fetch
- Invert cursor effect on the hero title
- One published snapshot feeds both the map and the stats; the server caches it and serves the last good data if a refresh fails
- Responsive layout for mobile and desktop

## How the data flows

OpenSky blocks requests from AWS and other large cloud providers, which includes Vercel. So the fetch happens elsewhere:

1. A scheduled GitHub Action (`.github/workflows/snapshot.yml`) runs every 15 minutes, fetches the global OpenSky snapshot, and runs `scripts/build-snapshot.ts` to compute the stats and compact aircraft positions.
2. It force-pushes the result as `snapshot.json` to the `data` branch (always a single commit).
3. The Next.js API routes read that file, cache it for two minutes, and serve it to the map and the stats.

## Setup

```
npm install
npm run dev
```

Local development reads the published snapshot, so no configuration is needed. To build a snapshot yourself:

```
npx tsx scripts/build-snapshot.ts
```

For a reliable OpenSky quota, create a free OpenSky account, add an API client under your account page, and save its credentials as GitHub repository secrets named `OPENSKY_CLIENT_ID` and `OPENSKY_CLIENT_SECRET`. Without them the workflow requests anonymously and shares the GitHub runner's IP quota with other users.

## Deployment

The project is deployed on Vercel. `vercel.json` disables deployments for the `data` branch so snapshot updates don't trigger builds. Set `SNAPSHOT_URL` only if the snapshot is published somewhere other than this repository's `data` branch.

## Notes

A global OpenSky query costs 4 API credits. A run every 15 minutes uses at most 384 credits a day, within both the anonymous (400) and API client (4,000) daily allowances. GitHub may delay scheduled runs at busy times, and disables schedules in public repositories after 60 days without activity; it emails a warning first, and the workflow can be re-enabled from the Actions tab.

Between snapshots, the map advances each aircraft along its heading at its ground speed for up to 20 minutes.

ADS-B coverage depends on volunteer receivers, so oceans and remote regions are underrepresented.

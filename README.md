# SKYABOVE

Live flight tracking dashboard built with Next.js. Plots every aircraft currently tracked by the [OpenSky Network](https://opensky-network.org) ADS-B feed on an interactive 3D globe and computes real-time statistics from the full snapshot, with animated flip-clock transitions.

## Stack

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- GSAP with ScrollTrigger
- MapLibre GL (globe projection) with Natural Earth boundaries from `world-atlas`

## Features

- Interactive 3D globe showing ~12,000 live aircraft, each rotated to its heading and faded by altitude
- Aircraft keep moving between data refreshes via great-circle dead reckoning from speed and heading
- Click any aircraft for callsign, airline, altitude, speed, heading, vertical rate, squawk, and a link to its live track
- Shareable deep links (`/?aircraft=<icao24>`) fly straight to a specific aircraft
- Map library and boundary data load only when the globe nears the viewport; position updates scale with zoom and pause off-screen
- Stats computed from the full global snapshot (~10,000+ airborne aircraft), not a sample: airborne vs. on-ground counts, top airlines, top registration countries, highest and fastest aircraft, average cruise altitude and ground speed, climb/descent counts, active emergency squawks
- Airline names decoded from ICAO callsign prefixes
- Transponder glitches filtered out of altitude and speed records
- Per-character flip animations on value changes
- Scroll-triggered staggered entrance animations
- Skeleton loading states during data fetch
- Invert cursor effect on the hero title
- One shared server-side snapshot feeds both the globe and the stats, sized to the OpenSky credit budget and serving the last good data if a refresh fails
- Responsive layout for mobile and desktop

## Setup

```
npm install
npm run dev
```

The app works without any configuration using anonymous OpenSky access. For fresher data, create a free OpenSky account, add an API client under your account page, and put its credentials in `.env.local`:

```
OPENSKY_CLIENT_ID=your_client_id
OPENSKY_CLIENT_SECRET=your_client_secret
```

## Deployment

The project is deployed on Vercel. Set the optional `OPENSKY_CLIENT_ID` and `OPENSKY_CLIENT_SECRET` environment variables in your Vercel project settings.

## Notes

A global OpenSky query costs 4 API credits. Anonymous access allows 400 credits per day, so the server refreshes the snapshot every 15 minutes; with API credentials (4,000 credits per day) it refreshes every 2 minutes. Clients poll the cached endpoints every minute, which never costs extra credits.

ADS-B coverage depends on volunteer receivers, so oceans and remote regions are underrepresented.

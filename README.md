# SKYABOVE

Live flight statistics dashboard built with Next.js. Computes real-time metrics from every aircraft currently tracked by the [OpenSky Network](https://opensky-network.org) ADS-B feed, with animated flip-clock transitions.

## Stack

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- GSAP with ScrollTrigger

## Features

- Stats computed from the full global snapshot (~10,000+ airborne aircraft), not a sample: airborne vs. on-ground counts, top airlines, top registration countries, highest and fastest aircraft, average cruise altitude and ground speed, climb/descent counts, active emergency squawks
- Airline names decoded from ICAO callsign prefixes
- Transponder glitches filtered out of altitude and speed records
- Per-character flip animations on value changes
- Scroll-triggered staggered entrance animations
- Skeleton loading states during data fetch
- Invert cursor effect on the hero title
- Shared server-side cache sized to the OpenSky credit budget, serving the last good snapshot if a refresh fails
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

A global OpenSky query costs 4 API credits. Anonymous access allows 400 credits per day, so the server refreshes the snapshot every 15 minutes; with API credentials (4,000 credits per day) it refreshes every 2 minutes. Clients poll the cached endpoint every minute, which never costs extra credits.

ADS-B coverage depends on volunteer receivers, so oceans and remote regions are underrepresented.

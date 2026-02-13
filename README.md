# SKYABOVE

Live flight statistics dashboard built with Next.js. Displays real-time aviation metrics from the AviationStack API with animated flip-clock transitions.

## Stack

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- GSAP with ScrollTrigger

## Features

- 10+ real-time flight statistics (active flights, top airlines, busiest airports, delays, etc.)
- Per-character flip animations on value changes
- Scroll-triggered staggered entrance animations
- Skeleton loading states during data fetch
- Invert cursor effect on the hero title
- Server-side API caching with stale-while-revalidate fallback
- Responsive layout for mobile and desktop

## Setup

```
npm install
```

Create a `.env.local` file with your AviationStack API key:

```
AVIATIONSTACK_API_KEY=your_key_here
```

Run the development server:

```
npm run dev
```

## Deployment

The project is deployed on Vercel. Set the `AVIATIONSTACK_API_KEY` environment variable in your Vercel project settings before deploying.

## Notes

The AviationStack free plan allows approximately 100 API requests per month. The server caches responses for 30 minutes and the client polls every 5 minutes to stay within this budget.

'use client';

import { useEffect, useState, useRef, memo } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { DashboardStats } from '@/lib/aviationstack';
import { labelClassSmDark as labelClass } from '@/lib/styles';
import UtcClock from '@/components/UtcClock';

const POLL_INTERVAL = 5 * 60 * 1000;
const MAX_RETRIES = 3;
const FLIP_DURATION = 0.7;
const FLIP_STAGGER = 0.15;
const FLIP_CLEANUP_DELAY = FLIP_DURATION + FLIP_STAGGER + 100;
const ENTRANCE_DURATION = 0.7;
const ENTRANCE_STAGGER = 0.08;

interface FlightsApiResponse {
  stats?: DashboardStats;
  cached?: boolean;
  stale?: boolean;
  cacheAge?: number;
  error?: string;
}

gsap.registerPlugin(ScrollTrigger);

const FlipChar = memo(function FlipChar({ char }: { char: string }) {
  const prevRef = useRef(char);
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const outRef = useRef<HTMLSpanElement>(null);
  const inRef = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      prevRef.current = char;
      return;
    }
    if (char === prevRef.current) return;
    setOutgoing(prevRef.current);
    prevRef.current = char;
  }, [char]);

  useEffect(() => {
    if (outgoing === null) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setOutgoing(null);
      return;
    }
    if (outRef.current) {
      gsap.fromTo(
        outRef.current,
        { y: 0, opacity: 1 },
        { y: '0.4em', opacity: 0, duration: FLIP_DURATION, ease: 'power3.inOut' }
      );
    }
    if (inRef.current) {
      gsap.fromTo(
        inRef.current,
        { y: '-0.4em', opacity: 0 },
        { y: 0, opacity: 1, duration: FLIP_DURATION, delay: FLIP_STAGGER, ease: 'power3.inOut', overwrite: true }
      );
    }
    const timer = setTimeout(() => setOutgoing(null), FLIP_CLEANUP_DELAY);
    return () => clearTimeout(timer);
  }, [outgoing]);

  return (
    <span className="relative inline-block overflow-hidden align-bottom" style={{ lineHeight: 1.15 }}>
      {outgoing !== null && (
        <span ref={outRef} className="absolute left-0 top-0 right-0">
          {outgoing}
        </span>
      )}
      <span ref={inRef} className="block">
        {char}
      </span>
    </span>
  );
});

function FlipValue({ value, className }: { value: string; className?: string }) {
  return (
    <span className={`inline-flex ${className ?? ''}`}>
      {value.split('').map((char, i) => (
        <FlipChar key={i} char={char} />
      ))}
    </span>
  );
}

function buildRows(stats: DashboardStats) {
  const rows = [
    { label: 'FLIGHTS WORLDWIDE', value: stats.totalFlights.toLocaleString() },
    { label: 'CURRENTLY ACTIVE', value: stats.activeFlights.toLocaleString() },
    { label: 'LANDED', value: stats.landedFlights.toLocaleString() },
    { label: 'TOP AIRLINE', value: stats.topAirlines[0]?.name.toUpperCase() ?? '—' },
    {
      label: 'BUSIEST DEPARTURE',
      value: stats.busiestDepartures[0]
        ? `${stats.busiestDepartures[0].iata}`
        : '—',
    },
    {
      label: 'BUSIEST ARRIVAL',
      value: stats.busiestArrivals[0]
        ? `${stats.busiestArrivals[0].iata}`
        : '—',
    },
    {
      label: 'AVG DEPARTURE DELAY',
      value: stats.avgDepartureDelay > 0 ? `${stats.avgDepartureDelay} MIN` : 'ON TIME',
    },
    {
      label: 'MOST DELAYED FLIGHT',
      value: stats.mostDelayedFlight
        ? `${stats.mostDelayedFlight.iata} — ${stats.mostDelayedFlight.delay} MIN`
        : '—',
    },
    { label: 'SCHEDULED', value: stats.scheduledFlights.toLocaleString() },
    {
      label: 'SAMPLE SIZE',
      value: `${stats.dataScope.toLocaleString()} OF ${stats.totalFlights.toLocaleString()}`,
    },
  ];

  if (stats.hasLiveData) {
    if (stats.highestAltitude) {
      rows.push({
        label: 'HIGHEST ALTITUDE',
        value: `${stats.highestAltitude.value.toLocaleString()} M`,
      });
    }
    if (stats.fastestAircraft) {
      rows.push({
        label: 'FASTEST AIRCRAFT',
        value: `${Math.round(stats.fastestAircraft.value).toLocaleString()} KM/H`,
      });
    }
    if (stats.avgAltitude != null) {
      rows.push({
        label: 'AVG CRUISING ALTITUDE',
        value: `${stats.avgAltitude.toLocaleString()} M`,
      });
    }
    if (stats.avgSpeed != null) {
      rows.push({
        label: 'AVG GROUND SPEED',
        value: `${Math.round(stats.avgSpeed).toLocaleString()} KM/H`,
      });
    }
  }

  return rows;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function FlightDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const rowsRef = useRef<HTMLDivElement[]>([]);
  const entranceDone = useRef(false);

  useEffect(() => {
    const fetchData = async (attempt = 0): Promise<void> => {
      try {
        const res = await fetch('/api/flights');
        const data: FlightsApiResponse = await res.json();
        if (data.error && !data.stats) {
          setError(data.error);
          return;
        }
        setStats(data.stats ?? null);
        setStale(!!data.stale);
        setError(data.stale ? (data.error ?? null) : null);
      } catch {
        if (attempt < MAX_RETRIES) {
          const delay = 1000 * 2 ** attempt;
          await new Promise((r) => setTimeout(r, delay));
          return fetchData(attempt + 1);
        }
        setError('Failed to connect to server');
      }
    };
    fetchData();
    const interval = setInterval(() => fetchData(), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!stats || entranceDone.current || !sectionRef.current) return;
    entranceDone.current = true;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setVisible(true);
      return;
    }

    const rows = rowsRef.current.filter(Boolean);
    gsap.set(rows, { y: 30, opacity: 0 });
    gsap.to(rows, {
      y: 0,
      opacity: 1,
      duration: ENTRANCE_DURATION,
      stagger: ENTRANCE_STAGGER,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 80%',
      },
      onComplete: () => setVisible(true),
    });
  }, [stats]);

  const rows = stats ? buildRows(stats) : null;

  return (
    <>
    <section
      ref={sectionRef}
      aria-label="Live flight statistics"
      className="bg-black min-h-screen flex flex-col justify-center px-4 sm:px-6 md:px-8 lg:px-12 xl:px-14 2xl:px-20 py-6 sm:py-8 md:py-12 lg:py-16 xl:py-16 2xl:py-24"
    >
      {error && (
        <div role="status" className={labelClass + ' mb-4 sm:mb-6'}>
          {stale ? 'SHOWING CACHED DATA — ' : ''}
          {error}
        </div>
      )}

      {stats && (
        <div className={labelClass + ' mb-6 sm:mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-1'}>
          <span>LAST UPDATED {formatTime(stats.fetchedAt)}</span>
          <span><UtcClock /></span>
        </div>
      )}

      {rows
        ? rows.flatMap((row, i) => [
            <div
              key={row.label}
              ref={(el) => {
                if (el) rowsRef.current[i] = el;
              }}
              className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 sm:gap-3 py-1"
              style={visible ? undefined : { opacity: 0 }}
            >
              <span className={labelClass}>
                {row.label}
              </span>
              <FlipValue
                value={row.value}
                className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-2xl 2xl:text-4xl font-black text-white tracking-tight tabular-nums"
              />
            </div>,
            <div
              key={`sep-${i}`}
              style={{ border: 'none', borderTop: '1px solid', borderImage: 'linear-gradient(to right, transparent 0%, white 15%, white 85%, transparent 100%) 1' }}
            />,
          ])
        : Array.from({ length: 10 }).flatMap((_, i) => [
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 sm:gap-3 py-1"
            >
              <div className="h-3 w-32 sm:w-36 bg-white/[0.06] rounded animate-pulse" />
              <div className="h-6 sm:h-8 md:h-10 lg:h-12 xl:h-14 2xl:h-16 w-24 sm:w-28 md:w-36 lg:w-44 xl:w-52 bg-white/[0.06] rounded animate-pulse" />
            </div>,
            <div
              key={`sep-${i}`}
              style={{ border: 'none', borderTop: '1px solid', borderImage: 'linear-gradient(to right, transparent 0%, white 15%, white 85%, transparent 100%) 1' }}
            />,
          ])}

    </section>

    <section className="bg-black flex flex-col md:flex-row justify-center md:justify-end px-4 sm:px-6 md:px-8 lg:px-12 xl:px-14 2xl:px-20 py-4">
      <p className="max-w-sm md:max-w-md lg:max-w-lg text-center md:text-right text-[11px] sm:text-xs md:text-sm leading-relaxed uppercase tracking-[0.2em] text-white/25 font-medium">
        This site is a personal demo showcasing my frontend and backend skills.
        Flight data is provided by AviationStack&apos;s free tier, so metrics
        are sampled and may refresh infrequently due to API rate limits.
      </p>
    </section>
    </>
  );
}
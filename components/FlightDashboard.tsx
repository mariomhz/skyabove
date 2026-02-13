'use client';

import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { DashboardStats } from '@/lib/aviationstack';

gsap.registerPlugin(ScrollTrigger);

// Reusable utility for the repeated label pattern
const labelClass = 'text-xs sm:text-sm uppercase tracking-[0.3em] text-black/30 font-medium';

function FlipChar({ char }: { char: string }) {
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
    if (outRef.current) {
      gsap.fromTo(
        outRef.current,
        { y: 0, opacity: 1 },
        { y: '0.4em', opacity: 0, duration: 0.7, ease: 'power3.inOut' }
      );
    }
    if (inRef.current) {
      gsap.fromTo(
        inRef.current,
        { y: '-0.4em', opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, delay: 0.15, ease: 'power3.inOut', overwrite: true }
      );
    }
    const timer = setTimeout(() => setOutgoing(null), 1000);
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
}

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
    const fetchData = async () => {
      try {
        const res = await fetch('/api/flights');
        const data = await res.json();
        if (data.error && !data.stats) {
          setError(data.error);
          return;
        }
        setStats(data.stats);
        setStale(!!data.stale);
        setError(data.stale ? data.error : null);
      } catch {
        setError('Failed to connect to server');
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!stats || entranceDone.current || !sectionRef.current) return;
    entranceDone.current = true;

    const rows = rowsRef.current.filter(Boolean);
    gsap.set(rows, { y: 30, opacity: 0 });
    gsap.to(rows, {
      y: 0,
      opacity: 1,
      duration: 0.7,
      stagger: 0.08,
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
      className="mx-auto max-w-7xl min-h-screen flex flex-col justify-center px-6 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32 py-8 sm:py-12 md:py-16 lg:py-20 xl:py-24"
    >
      {error && (
        <div className={labelClass + ' mb-6'}>
          {stale ? 'SHOWING CACHED DATA — ' : ''}
          {error}
        </div>
      )}

      {stats && (
        <div className={labelClass + ' mb-8'}>
          LAST UPDATED {formatTime(stats.fetchedAt)}
        </div>
      )}

      {rows
        ? rows.flatMap((row, i) => [
            <div
              key={row.label}
              ref={(el) => {
                if (el) rowsRef.current[i] = el;
              }}
              className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 sm:gap-2 py-4 sm:py-5 md:py-6 lg:py-7"
              style={visible ? undefined : { opacity: 0 }}
            >
              <span className={labelClass}>
                {row.label}
              </span>
              <FlipValue
                value={row.value}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-black tracking-tight tabular-nums"
              />
            </div>,
            <div
              key={`sep-${i}`}
              style={{ border: 'none', borderTop: '1px solid', borderImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%) 1' }}
            />,
          ])
        : Array.from({ length: 10 }).flatMap((_, i) => [
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 sm:gap-2 py-4 sm:py-5 md:py-6 lg:py-7"
            >
              <div className="h-3 w-36 bg-black/[0.06] rounded animate-pulse" />
              <div className="h-8 sm:h-10 md:h-12 lg:h-14 xl:h-16 w-28 sm:w-32 md:w-40 lg:w-48 bg-black/[0.06] rounded animate-pulse" />
            </div>,
            <div
              key={`sep-${i}`}
              style={{ border: 'none', borderTop: '1px solid', borderImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%) 1' }}
            />,
          ])}

    </section>

    <section className="mx-auto max-w-7xl flex flex-col md:flex-row justify-center md:justify-end px-6 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32 py-8 sm:py-10 md:py-12 lg:py-16 xl:py-24">
      <p className="max-w-lg text-center md:text-right text-xs sm:text-sm leading-relaxed uppercase tracking-[0.2em] text-black/25 font-medium">
        This site is a personal demo showcasing my frontend and backend skills.
        Flight data is provided by AviationStack&apos;s free tier, so metrics
        are sampled and may refresh infrequently due to API rate limits.
      </p>
    </section>
    </>
  );
}
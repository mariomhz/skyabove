'use client';

import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { GlobalStats } from '@/lib/opensky';

gsap.registerPlugin(ScrollTrigger);

type Stats = GlobalStats;

// ── Per-character flip animation ───────────────────────────────────

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

// ── Dashboard rows ─────────────────────────────────────────────────

function buildRows(stats: Stats) {
  return [
    { label: 'AIRCRAFT TRACKED', value: stats.totalActive.toLocaleString() },
    { label: 'CURRENTLY AIRBORNE', value: stats.airborne.toLocaleString() },
    { label: 'ON GROUND', value: stats.onGround.toLocaleString() },
    { label: 'BUSIEST COUNTRY', value: stats.byCountry[0]?.country.toUpperCase() ?? '—' },
    { label: 'MOST ACTIVE AIRLINE', value: stats.topAirline ? `${stats.topAirline.code} — ${stats.topAirline.count.toLocaleString()}` : '—' },
    { label: 'HIGHEST ALTITUDE', value: `${stats.highestAltitude.value.toLocaleString()} M` },
    { label: 'FASTEST AIRCRAFT', value: `${Math.round(stats.fastestAircraft.value * 3.6).toLocaleString()} KM/H` },
    { label: 'COUNTRIES REPRESENTED', value: String(stats.totalCountries) },
    { label: 'AVG CRUISING ALTITUDE', value: `${stats.avgAltitude.toLocaleString()} M` },
    { label: 'AVG GROUND SPEED', value: `${Math.round(stats.avgSpeed * 3.6).toLocaleString()} KM/H` },
  ];
}

// ── Main component ─────────────────────────────────────────────────

export default function FlightDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const rowsRef = useRef<HTMLDivElement[]>([]);
  const entranceDone = useRef(false);

  // Auto-refresh every 10s
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/flights');
        if (!res.ok) return;
        const data = await res.json();
        setStats(data.stats);
      } catch { /* silent */ }
    };
    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Entrance animation (runs once)
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
    <section
      ref={sectionRef}
      className="min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16"
    >
      {rows
        ? rows.map((row, i) => (
            <div
              key={row.label}
              ref={(el) => {
                if (el) rowsRef.current[i] = el;
              }}
              className="flex items-baseline justify-between border-b border-black/10 py-5 md:py-6"
              style={visible ? undefined : { opacity: 0 }}
            >
              <span className="text-[11px] md:text-xs uppercase tracking-[0.25em] text-black/40 font-medium">
                {row.label}
              </span>
              <FlipValue
                value={row.value}
                className="text-2xl md:text-4xl lg:text-5xl font-black text-black tracking-tight tabular-nums"
              />
            </div>
          ))
        : Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex items-baseline justify-between border-b border-black/10 py-5 md:py-6"
            >
              <div className="h-3 w-36 bg-black/[0.06] rounded animate-pulse" />
              <div className="h-8 md:h-12 w-28 md:w-40 bg-black/[0.06] rounded animate-pulse" />
            </div>
          ))}
    </section>
  );
}

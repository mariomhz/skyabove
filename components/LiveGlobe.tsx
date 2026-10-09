'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { AircraftSnapshot } from '@/lib/snapshot';
import { usePrefersReducedMotion } from '@/lib/useMediaQuery';
import { labelClassSmDark } from '@/lib/styles';
import AircraftPanel from '@/components/AircraftPanel';

const GlobeMap = dynamic(() => import('@/components/GlobeMap'), { ssr: false });

const POLL_INTERVAL = 60 * 1000;
const URL_PARAM = 'aircraft';

function formatUtc(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

export default function LiveGlobe() {
  const sectionRef = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const [snapshot, setSnapshot] = useState<AircraftSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingDeepLink, setPendingDeepLink] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  // Load the map library and data only once the section is close to the viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Deep link: ?aircraft=<icao24>
  useEffect(() => {
    const icao = new URLSearchParams(window.location.search).get(URL_PARAM);
    if (!icao) return;
    // Defer so the state update isn't synchronous within the effect body
    queueMicrotask(() => {
      setSelected(icao.toLowerCase());
      setPendingDeepLink(true);
      setNear(true);
      sectionRef.current?.scrollIntoView();
    });
  }, []);

  useEffect(() => {
    if (!near) return;
    let lastTime = 0;
    const load = async () => {
      try {
        const res = await fetch('/api/aircraft');
        if (!res.ok) throw new Error(String(res.status));
        const data: AircraftSnapshot = await res.json();
        if (data.time !== lastTime) {
          lastTime = data.time;
          setSnapshot(data);
        }
        setError(false);
      } catch {
        setError(true);
      }
    };
    load();
    const id = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [near]);

  const select = useCallback((icao: string | null) => {
    setSelected(icao);
    const url = new URL(window.location.href);
    if (icao) url.searchParams.set(URL_PARAM, icao);
    else url.searchParams.delete(URL_PARAM);
    window.history.replaceState(null, '', url);
  }, []);

  const close = useCallback(() => select(null), [select]);
  const onFlown = useCallback(() => setPendingDeepLink(false), []);

  const selectedAircraft = selected && snapshot?.aircraft.find((a) => a[0] === selected);

  return (
    <section
      ref={sectionRef}
      aria-label="Live map of aircraft worldwide"
      className="relative h-svh bg-black overflow-hidden"
    >
      {near && (
        <GlobeMap
          snapshot={snapshot}
          selected={selected}
          onSelect={select}
          reducedMotion={reducedMotion}
          flyToSelected={pendingDeepLink}
          onFlown={onFlown}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-1 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-14 2xl:px-20 pt-6 sm:pt-8 md:pt-12">
        <h2 className="text-white font-black tracking-tight text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
          LIVE AIRSPACE
        </h2>
        <p className={labelClassSmDark} role="status">
          {error && !snapshot
            ? 'LIVE DATA UNAVAILABLE'
            : snapshot
              ? `${snapshot.aircraft.length.toLocaleString('en-US')} AIRCRAFT · UPDATED ${formatUtc(snapshot.time)} UTC`
              : 'LOADING AIRCRAFT…'}
        </p>
      </div>

      <p
        className={`${labelClassSmDark} pointer-events-none absolute z-10 bottom-4 sm:bottom-6 md:bottom-8 left-4 sm:left-6 md:left-8 lg:left-12 xl:left-14 2xl:left-20 hidden sm:block`}
      >
        Drag to rotate · Ctrl + scroll to zoom · Click a plane
      </p>

      {selectedAircraft && snapshot && (
        <AircraftPanel
          aircraft={selectedAircraft}
          country={snapshot.countries[selectedAircraft[2]] ?? '—'}
          onClose={close}
        />
      )}
    </section>
  );
}

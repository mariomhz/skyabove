'use client';

import { useEffect } from 'react';
import type { Aircraft } from '@/lib/snapshot';
import { airlineName } from '@/lib/airlines';
import { labelClassSmDark } from '@/lib/styles';

const AIRLINE_CALLSIGN = /^([A-Z]{3})\d/;
const EMERGENCY: Record<string, string> = {
  '7500': 'HIJACK',
  '7600': 'RADIO FAILURE',
  '7700': 'EMERGENCY',
};

const fmt = (n: number) => n.toLocaleString('en-US');

function compass(deg: number) {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return points[Math.round(deg / 45) % 8];
}

export default function AircraftPanel({
  aircraft,
  country,
  onClose,
}: {
  aircraft: Aircraft;
  country: string;
  onClose: () => void;
}) {
  const [icao, callsign, , , , alt, heading, speed, vrate, squawk] = aircraft;
  const code = callsign.match(AIRLINE_CALLSIGN)?.[1];
  const airline = code ? airlineName(code) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows: [string, string][] = [
    ['ALTITUDE', alt != null ? `${fmt(alt)} FT` : '—'],
    ['GROUND SPEED', speed != null ? `${fmt(speed)} KT` : '—'],
    ['HEADING', heading != null ? `${Math.round(heading)}° ${compass(heading)}` : '—'],
    [
      'VERTICAL RATE',
      vrate == null ? '—' : vrate === 0 ? 'LEVEL' : `${vrate > 0 ? '+' : ''}${fmt(vrate)} FT/MIN`,
    ],
    ['REGISTERED IN', country.toUpperCase()],
    ['SQUAWK', squawk ? `${squawk}${EMERGENCY[squawk] ? ` — ${EMERGENCY[squawk]}` : ''}` : '—'],
    ['ICAO 24-BIT', icao.toUpperCase()],
  ];

  return (
    <aside
      aria-label={`Aircraft ${callsign || icao}`}
      className="absolute z-10 left-4 right-4 bottom-4 sm:left-auto sm:right-6 sm:bottom-6 md:right-8 md:bottom-8 lg:right-12 xl:right-14 2xl:right-20 sm:w-96 bg-black/85 backdrop-blur-md border border-white/10 p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {callsign || icao.toUpperCase()}
          </p>
          {airline && airline !== code && <p className={labelClassSmDark + ' mt-1'}>{airline}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close aircraft details"
          className="text-white/40 hover:text-white transition-colors duration-200 text-xl leading-none p-1 -m-1"
        >
          ×
        </button>
      </div>

      <dl className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4">
            <dt className={labelClassSmDark + ' whitespace-nowrap'}>{label}</dt>
            <dd className="text-sm font-bold text-white tabular-nums text-right">{value}</dd>
          </div>
        ))}
      </dl>

      <a
        href={`https://globe.adsb.lol/?icao=${icao}`}
        target="_blank"
        rel="noopener noreferrer"
        className={labelClassSmDark + ' mt-5 inline-block underline underline-offset-4 transition-colors duration-200 hover:text-white/60'}
      >
        Follow live track ↗
      </a>
    </aside>
  );
}

'use client';

import { useSyncExternalStore } from 'react';

const fmt = () =>
  new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  });

const subscribe = (onTick: () => void) => {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
};

export default function UtcClock() {
  const time = useSyncExternalStore(subscribe, fmt, () => null);

  if (time === null) return null;

  return <span>{time} UTC</span>;
}

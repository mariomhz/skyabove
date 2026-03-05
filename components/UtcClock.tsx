'use client';

import { useEffect, useState } from 'react';

export default function UtcClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
      });

    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);

  if (time === null) return null;

  return (
    <span suppressHydrationWarning>
      {time} UTC
    </span>
  );
}

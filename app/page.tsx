'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import InvertCursor from '@/components/InvertCursor';
import FlightDashboard from '@/components/FlightDashboard';

export default function Home() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo(descRef.current,
      { y: 60, opacity: 0 },
      { y: 0, opacity: 1, duration: 1 }
    )
    .fromTo(titleRef.current,
      { y: 80, opacity: 0 },
      { y: 0, opacity: 1, duration: 1 },
      '-=0.7'
    );
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <InvertCursor targetRef={titleRef} />
      <section className="relative flex min-h-screen flex-col items-center justify-end px-6 pb-12">
        <p
          ref={descRef}
          className="absolute top-70 max-w-3xl text-left leading-tight text-black-400 text-[clamp(2rem,13vw,1.5rem)] font-semibold tracking-tight"
          style={{ opacity: 0 }}
        >
          Track flights, airlines, and destinations in real time. Clear, fast air traffic data built for aviation enthusiasts and operators.
        </p>
        <h1
          ref={titleRef}
          className="absolute top-[50%] text-[clamp(20rem,20vw,28rem)] font-black leading-[0.85] tracking-tighter text-black"
          style={{ cursor: 'default', opacity: 0 }}
        >
          SKYABOVE
        </h1>
      </section>
      <FlightDashboard />
    </main>
  );
}

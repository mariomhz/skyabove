'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import InvertCursor from '@/components/InvertCursor';
import FlightDashboard from '@/components/FlightDashboard';

export default function Home() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const planeRef = useRef<SVGSVGElement>(null);

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
    )
    .fromTo(planeRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8 },
      '-=0.3'
    );

    // Gentle bobbing loop
    gsap.to(planeRef.current, {
      y: 8,
      duration: 1.5,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: 2.5,
    });
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <InvertCursor targetRef={titleRef} />
      <section className="relative flex min-h-screen flex-col items-center justify-end px-6 pb-12">
        <p
          ref={descRef}
          className="absolute top-20 md:top-70 max-w-3xl text-left leading-tight text-black-400 text-[clamp(1rem,4vw,1.5rem)] font-semibold tracking-tight px-2 md:px-0"
          style={{ opacity: 0 }}
        >
          Track flights, airlines, and destinations in real time. Clear, fast air traffic data built for aviation enthusiasts and operators.
        </p>
        <h1
          ref={titleRef}
          className="absolute top-[35%] md:top-[50%] text-[clamp(4rem,20vw,28rem)] font-black leading-[0.85] tracking-tighter text-black"
          style={{ cursor: 'default', opacity: 0 }}
        >
          SKYABOVE
        </h1>
        <svg
          ref={planeRef}
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute bottom-8 w-7 h-7 text-black/30 rotate-90"
          style={{ opacity: 0 }}
        >
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
        </svg>
      </section>
      <FlightDashboard />
    </main>
  );
}

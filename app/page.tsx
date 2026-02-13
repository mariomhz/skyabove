'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import InvertCursor from '@/components/InvertCursor';
import FlightDashboard from '@/components/FlightDashboard';

// Reusable utility for the repeated label pattern
const labelClass = 'text-xs sm:text-sm uppercase tracking-[0.3em] text-black/30 font-medium';

export default function Home() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const planeRef = useRef<SVGSVGElement>(null);
  const scrollHintRef = useRef<HTMLSpanElement>(null);

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
    )
    .fromTo(scrollHintRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.6 },
      '-=0.4'
    );

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
      <section className="relative flex min-h-screen flex-col items-center justify-end px-6 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32 pb-8 sm:pb-12 md:pb-16 lg:pb-20 xl:pb-24">
        <p
          ref={descRef}
          className="absolute top-16 sm:top-24 md:top-32 lg:top-44 xl:top-56 2xl:top-72 max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl text-left leading-snug text-black/40 text-base sm:text-lg md:text-xl lg:text-2xl xl:text-[2.5rem] 2xl:text-[3rem] lg:leading-tight xl:leading-tight font-semibold tracking-tight px-2 sm:px-4 md:px-0"
          style={{ opacity: 0 }}
        >
          Track flights, airlines, and destinations in real time. Clear, fast air traffic data built for aviation enthusiasts and operators.
        </p>
        <h1
          ref={titleRef}
          className="absolute top-[30%] sm:top-[35%] md:top-[40%] lg:top-[45%] xl:top-[50%] text-[clamp(2.5rem,12vw,28rem)] sm:text-[clamp(3rem,14vw,28rem)] md:text-[clamp(3.5rem,16vw,28rem)] font-black leading-[0.85] tracking-tighter text-black"
          style={{ cursor: 'default', opacity: 0 }}
        >
          SKYABOVE
        </h1>
        <div className="absolute bottom-8 sm:bottom-12 md:bottom-16 flex flex-col items-center gap-2 sm:gap-3">
          <span
            ref={scrollHintRef}
            className={labelClass}
            style={{ opacity: 0 }}
          >
            Scroll down
          </span>
          <svg
            ref={planeRef}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-black rotate-180"
            style={{ opacity: 0 }}
          >
            <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>
      </section>
      <FlightDashboard />
      <footer className="px-6 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32 py-8 sm:py-10 md:py-12 lg:py-16 text-center">
        <p className={labelClass}>
          &copy; 2026 Developed and designed by Mario Hernandez
        </p>
      </footer>
    </main>
  );
}
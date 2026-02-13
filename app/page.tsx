'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import InvertCursor from '@/components/InvertCursor';
import FlightDashboard from '@/components/FlightDashboard';

// Reusable utility for the repeated label pattern
const labelClass = 'text-xs sm:text-sm md:text-base uppercase tracking-[0.3em] text-black/30 font-medium';

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
      <section className="relative flex min-h-screen flex-col items-center justify-end px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 pb-6 sm:pb-8 md:pb-12 lg:pb-16 xl:pb-20 2xl:pb-24">
        <p
          ref={descRef}
          className="absolute top-12 sm:top-16 md:top-24 lg:top-32 xl:top-40 2xl:top-48 max-w-full sm:max-w-sm md:max-w-md lg:max-w-xl xl:max-w-2xl text-left leading-snug text-black/40 text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-[1.75rem] lg:leading-tight xl:leading-tight font-semibold tracking-tight px-2 sm:px-0"
          style={{ opacity: 0 }}
        >
          Track flights, airlines, and destinations in real time. Clear, fast air traffic data built for aviation enthusiasts and operators.
        </p>
        <h1
          ref={titleRef}
          className="absolute top-[30%] sm:top-[35%] md:top-[40%] lg:top-[45%] xl:top-[48%] text-[clamp(2rem,10vw,18rem)] sm:text-[clamp(2.5rem,11vw,22rem)] md:text-[clamp(3rem,12vw,26rem)] lg:text-[clamp(3.5rem,13vw,28rem)] xl:text-[clamp(4rem,14vw,32rem)] font-black leading-[0.85] tracking-tighter text-black"
          style={{ cursor: 'default', opacity: 0 }}
        >
          SKYABOVE
        </h1>
        <div className="absolute bottom-6 sm:bottom-8 md:bottom-12 flex flex-col items-center gap-2 sm:gap-3">
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
            className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-black rotate-180"
            style={{ opacity: 0 }}
          >
            <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>
      </section>
      <FlightDashboard />
      <footer className="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 py-6 sm:py-8 md:py-10 lg:py-12 xl:py-16 2xl:py-20 text-center">
        <p className={labelClass}>
          &copy; 2026 Developed and designed by Mario Hernandez
        </p>
      </footer>
    </main>
  );
}
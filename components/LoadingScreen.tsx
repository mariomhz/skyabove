'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { usePrefersReducedMotion } from '@/lib/useMediaQuery';

export default function LoadingScreen() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const overlay = overlayRef.current;
    const text = textRef.current;
    if (!overlay || !text || reducedMotion) return;

    const tl = gsap.timeline({
      onComplete: () => setDone(true),
    });

    tl.to(text, {
      opacity: 0,
      duration: 0.4,
      delay: 0.4,
      ease: 'power2.in',
    }).to(overlay, {
      clipPath: 'inset(0 0 100% 0)',
      duration: 0.6,
      ease: 'power3.inOut',
    });
  }, [reducedMotion]);

  if (done || reducedMotion) return null;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        clipPath: 'inset(0 0 0% 0)',
      }}
    >
      <span
        ref={textRef}
        style={{
          color: '#fff',
          fontSize: 'clamp(1.5rem, 5vw, 4rem)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
        }}
      >
        SKYABOVE
      </span>
    </div>
  );
}

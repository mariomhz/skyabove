'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function InvertCursor({ targetRef }: { targetRef: React.RefObject<HTMLElement | null> }) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const isOver = useRef(false);
  const introDone = useRef(false);
  const [hasPointer, setHasPointer] = useState(true);

  useEffect(() => {
    setHasPointer(window.matchMedia('(pointer: fine)').matches);
  }, []);

  useEffect(() => {
    if (!hasPointer) return;
    const cursor = cursorRef.current;
    const clip = clipRef.current;
    const target = targetRef.current;
    if (!cursor || !clip || !target) return;

    const updateClip = () => {
      const r = target.getBoundingClientRect();
      clip.style.clipPath = `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px)`;
    };
    updateClip();

    const rect = target.getBoundingClientRect();
    const restY = rect.top + rect.height / 2;
    gsap.set(cursor, {
      x: rect.left + 300,
      y: restY + 120,
      clipPath: 'inset(100% 0 0 0)',
    });
    gsap.to(cursor, {
      y: restY,
      clipPath: 'inset(0% 0 0 0)',
      duration: 1.6,
      delay: 0.5,
      ease: 'power2.inOut',
      onComplete: () => { introDone.current = true; },
    });

    const onMove = (e: MouseEvent) => {
      if (!isOver.current || !introDone.current) return;
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.5,
        ease: 'power3.out',
        overwrite: true,
      });
    };

    const onEnter = (e: MouseEvent) => {
      isOver.current = true;
      if (!introDone.current) return;
      cursor.style.clipPath = 'inset(0% 0 0 0)';
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.4,
        ease: 'power2.out',
      });
    };

    const onLeave = () => {
      isOver.current = false;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('scroll', updateClip, { passive: true });
    window.addEventListener('resize', updateClip);
    target.addEventListener('mouseenter', onEnter);
    target.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', updateClip);
      window.removeEventListener('resize', updateClip);
      target.removeEventListener('mouseenter', onEnter);
      target.removeEventListener('mouseleave', onLeave);
    };
  }, [targetRef, hasPointer]);

  if (!hasPointer) return null;

  return (
    <div
      ref={clipRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
        mixBlendMode: 'difference',
      }}
    >
      <div
        ref={cursorRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '300px',
          height: '300px',
          backgroundColor: 'white',
          marginLeft: '-150px',
          marginTop: '-150px',
        }}
      />
    </div>
  );
}

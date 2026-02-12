'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function InvertCursor({ targetRef }: { targetRef: React.RefObject<HTMLElement | null> }) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const isOver = useRef(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    const target = targetRef.current;
    if (!cursor || !target) return;

    // Slide up onto the "K" with a clip reveal
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
    });

    const onMove = (e: MouseEvent) => {
      if (!isOver.current) return;
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
    target.addEventListener('mouseenter', onEnter);
    target.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('mousemove', onMove);
      target.removeEventListener('mouseenter', onEnter);
      target.removeEventListener('mouseleave', onLeave);
    };
  }, [targetRef]);

  return (
    <div
      ref={cursorRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '300px',
        height: '300px',
        backgroundColor: 'white',
        pointerEvents: 'none',
        zIndex: 9999,
        mixBlendMode: 'difference',
        marginLeft: '-150px',
        marginTop: '-150px',
      }}
    />
  );
}

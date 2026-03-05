'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';

/*
  SVG Flight Route Map — thin curved arcs connecting city pairs with small
  plane icons traveling along them. Replaces the old canvas flow-field which
  was imperceptible on white backgrounds.
*/

// Same plane icon used in the scroll-hint (24x24 viewBox, nose pointing up)
const PLANE_ICON_D =
  'M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z';

const ROUTES: {
  from: string;
  to: string;
  d: string;
  duration: number;
}[] = [
  // JFK → LHR — upper-right transatlantic arc
  {
    from: 'JFK',
    to: 'LHR',
    d: 'M 720 120 Q 830 60 940 160',
    duration: 32,
  },
  // LAX → NRT — wide Pacific sweep left→right through upper area
  {
    from: 'LAX',
    to: 'NRT',
    d: 'M 60 200 Q 400 40 920 280',
    duration: 42,
  },
  // DXB → SIN — lower-right Southeast Asian connector
  {
    from: 'DXB',
    to: 'SIN',
    d: 'M 650 700 Q 800 620 950 780',
    duration: 30,
  },
  // CDG → JNB — center-left downward Africa diagonal
  {
    from: 'CDG',
    to: 'JNB',
    d: 'M 80 450 Q 200 620 120 850',
    duration: 38,
  },
  // SFO → ICN — upper-mid gentle Pacific arc
  {
    from: 'SFO',
    to: 'ICN',
    d: 'M 200 100 Q 450 20 700 180',
    duration: 36,
  },
];

const ENTRANCE_DELAY = 2;

export default function HeroWaypoints() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const dotRefs = useRef<(SVGGElement | null)[]>([]);
  const labelFromRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const labelToRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const svg = svgRef.current;
    if (!wrapper || !svg) return;

    const paths = pathRefs.current.filter(Boolean) as SVGPathElement[];
    const dots = dotRefs.current.filter(Boolean) as SVGGElement[];
    const labelsFrom = labelFromRefs.current.filter(Boolean) as HTMLSpanElement[];
    const labelsTo = labelToRefs.current.filter(Boolean) as HTMLSpanElement[];

    if (paths.length === 0) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Measure path lengths and set up stroke-dash for draw-in
    const lengths = paths.map((p) => p.getTotalLength());
    paths.forEach((p, i) => {
      p.style.strokeDasharray = `${lengths[i]}`;
      p.style.strokeDashoffset = prefersReducedMotion ? '0' : `${lengths[i]}`;
    });

    // Position IATA labels at path endpoints
    const positionLabels = () => {
      const svgRect = svg.getBoundingClientRect();
      if (svgRect.width === 0) return;
      const scaleX = svgRect.width / 1000;
      const scaleY = svgRect.height / 1000;

      paths.forEach((p, i) => {
        const len = lengths[i];
        const startPt = p.getPointAtLength(0);
        const endPt = p.getPointAtLength(len);

        const fromEl = labelsFrom[i];
        const toEl = labelsTo[i];
        if (fromEl) {
          fromEl.style.left = `${startPt.x * scaleX}px`;
          fromEl.style.top = `${startPt.y * scaleY}px`;
        }
        if (toEl) {
          toEl.style.left = `${endPt.x * scaleX}px`;
          toEl.style.top = `${endPt.y * scaleY}px`;
        }
      });
    };

    positionLabels();
    window.addEventListener('resize', positionLabels);

    // Compute heading angle (degrees) at a given progress along a path
    const getHeading = (path: SVGPathElement, len: number, progress: number) => {
      const epsilon = 0.001;
      const d0 = Math.max(0, progress - epsilon) * len;
      const d1 = Math.min(1, progress + epsilon) * len;
      const p0 = path.getPointAtLength(d0);
      const p1 = path.getPointAtLength(d1);
      return (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI + 90;
    };

    // Reduced motion: show everything static, planes at midpoints
    if (prefersReducedMotion) {
      gsap.set(wrapper, { opacity: 1 });
      dots.forEach((dot, i) => {
        const mid = paths[i].getPointAtLength(lengths[i] * 0.5);
        const angle = getHeading(paths[i], lengths[i], 0.5);
        dot.setAttribute('transform', `translate(${mid.x},${mid.y}) rotate(${angle})`);
      });
      gsap.set([...labelsFrom, ...labelsTo], { opacity: 1 });
      return () => window.removeEventListener('resize', positionLabels);
    }

    // Hide wrapper initially
    gsap.set(wrapper, { opacity: 0 });

    // Hide labels and planes
    gsap.set([...labelsFrom, ...labelsTo], { opacity: 0 });
    dots.forEach((dot) => {
      dot.setAttribute('transform', 'translate(0,0)');
      gsap.set(dot, { opacity: 0 });
    });

    // Entrance timeline
    const tl = gsap.timeline({
      delay: ENTRANCE_DELAY,
      onStart: () => {
        gsap.to(wrapper, { opacity: 1, duration: 0.5, ease: 'power2.out' });
      },
    });

    // Draw in each route path staggered
    paths.forEach((p, i) => {
      tl.to(
        p,
        {
          strokeDashoffset: 0,
          duration: 1.5,
          ease: 'power2.inOut',
        },
        i * 0.3
      );
    });

    // Fade in labels after routes begin drawing
    tl.to([...labelsFrom, ...labelsTo], {
      opacity: 1,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power2.out',
    }, 1.0);

    // Continuous dot travel tweens
    const dotTweens: gsap.core.Tween[] = [];

    dots.forEach((dot, i) => {
      const path = paths[i];
      const len = lengths[i];
      const route = ROUTES[i];

      // Start dot traveling after its path finishes drawing
      const startTime = ENTRANCE_DELAY + i * 0.3 + 1.5;

      const obj = { progress: 0 };
      const tween = gsap.to(obj, {
        progress: 1,
        duration: route.duration,
        ease: 'sine.inOut',
        repeat: -1,
        delay: startTime,
        onStart: () => {
          gsap.to(dot, { opacity: 1, duration: 0.5 });
        },
        onUpdate: () => {
          const pt = path.getPointAtLength(obj.progress * len);
          const angle = getHeading(path, len, obj.progress);
          dot.setAttribute(
            'transform',
            `translate(${pt.x},${pt.y}) rotate(${angle})`
          );
        },
      });

      dotTweens.push(tween);
    });

    return () => {
      tl.kill();
      dotTweens.forEach((t) => t.kill());
      window.removeEventListener('resize', positionLabels);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="hidden md:block absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
      style={{ opacity: 0 }}
    >
      {/* SVG route arcs and traveling dots */}
      <svg
        ref={svgRef}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        {ROUTES.map((route, i) => (
          <path
            key={`route-${i}`}
            ref={(el) => { pathRefs.current[i] = el; }}
            d={route.d}
            fill="none"
            stroke="black"
            strokeWidth="1.2"
            strokeOpacity="0.10"
            strokeLinecap="round"
          />
        ))}
        {ROUTES.map((_, i) => (
          <g
            key={`plane-${i}`}
            ref={(el) => { dotRefs.current[i] = el; }}
          >
            <path
              d={PLANE_ICON_D}
              fill="black"
              fillOpacity="0.18"
              transform="scale(0.6) translate(-12,-12)"
            />
          </g>
        ))}
      </svg>

      {/* IATA endpoint labels — HTML for crisp text */}
      {ROUTES.map((route, i) => (
        <span
          key={`label-from-${i}`}
          ref={(el) => { labelFromRefs.current[i] = el; }}
          className="absolute uppercase tracking-[0.3em] font-medium text-black/[0.12] text-[10px] md:text-[11px] -translate-x-1/2 -translate-y-full pointer-events-none select-none"
          style={{ opacity: 0 }}
        >
          {route.from}
        </span>
      ))}
      {ROUTES.map((route, i) => (
        <span
          key={`label-to-${i}`}
          ref={(el) => { labelToRefs.current[i] = el; }}
          className="absolute uppercase tracking-[0.3em] font-medium text-black/[0.12] text-[10px] md:text-[11px] -translate-x-1/2 -translate-y-full pointer-events-none select-none"
          style={{ opacity: 0 }}
        >
          {route.to}
        </span>
      ))}
    </div>
  );
}

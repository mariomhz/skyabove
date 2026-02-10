'use client';

import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center px-6">
      <div className="mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <h1 className="text-6xl tracking-tight text-white md:text-7xl lg:text-8xl">
            Live Flight Tracker
          </h1>
          <p className="text-xl text-white/50 md:text-2xl" style={{ marginTop: '4rem' }}>
            Track flights in real-time with beautiful, premium analytics
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center"
          style={{ marginTop: '8rem' }}
        >
          <button
            className="rounded-full bg-blue-500 text-base text-white transition-all hover:bg-blue-400"
            style={{ padding: '1rem 2rem' }}
          >
            View Live Flights
          </button>
          <button
            className="rounded-full border border-white/10 text-base text-white transition-all hover:border-white/20 hover:bg-white/5"
            style={{ padding: '1rem 2rem' }}
          >
            Learn More
          </button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm text-white/30">Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="20" height="32" viewBox="0 0 20 32" fill="none">
              <rect x="1" y="1" width="18" height="30" rx="9" stroke="white" strokeOpacity="0.2" strokeWidth="2"/>
              <motion.circle
                cx="10"
                cy="8"
                r="3"
                fill="white"
                fillOpacity="0.4"
                animate={{ cy: [8, 16, 8] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </svg>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

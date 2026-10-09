const labelBase = 'uppercase tracking-[0.3em] font-medium';

/** Label used in hero section and footer — larger sizing */
export const labelClass = `text-xs sm:text-sm md:text-base ${labelBase} text-black/30`;

/** Dark variant of labelClass — for use on dark backgrounds */
export const labelClassDark = `text-xs sm:text-sm md:text-base ${labelBase} text-white/30`;

/** Compact label on dark backgrounds — dashboard rows */
export const labelClassSmDark = `text-[11px] sm:text-xs md:text-sm ${labelBase} text-white/30`;

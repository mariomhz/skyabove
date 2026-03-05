const labelBase = 'uppercase tracking-[0.3em] font-medium';

/** Label used in hero section and footer — larger sizing */
export const labelClass = `text-xs sm:text-sm md:text-base ${labelBase} text-black/30`;

/** Label used in dashboard rows and disclaimer — compact sizing */
export const labelClassSm = `text-[11px] sm:text-xs md:text-sm ${labelBase} text-black/30`;

/** Dark variant of labelClass — for use on dark backgrounds */
export const labelClassDark = `text-xs sm:text-sm md:text-base ${labelBase} text-white/30`;

/** Dark variant of labelClassSm — for use on dark backgrounds */
export const labelClassSmDark = `text-[11px] sm:text-xs md:text-sm ${labelBase} text-white/30`;

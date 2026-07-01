// A spec-aligned content card — 12px radius, subtle elevation, ice-white
// background. Use for feature columns, stats, FAQ entries, anything that
// needs visual containment without screaming for attention.
//
// `tone` controls the base color block. Use this rather than overriding
// bg/text via className — Tailwind class-collisions (bg-white vs
// bg-navy in the override) are unreliable because alphabetical CSS
// rule ordering, not className order, decides the winner.
//
//   light  → white card, dark text                 (default)
//   dark   → navy card, white text                 (use on light bg)
//   red    → emergency-red card, white text        (use sparingly)
//   ice    → off-white card, dark text             (subtle differentiation)
const TONE = {
  light: 'bg-white text-ink border-navy-100/70',
  dark:  'bg-navy  text-white border-navy-600',
  red:   'bg-red   text-white border-red-dark',
  ice:   'bg-ice   text-ink border-navy-100/70',
};

export default function Card({
  className = '',
  padding = 'p-6 sm:p-8',
  hover = false,
  tone = 'light',
  children,
}) {
  return (
    <div
      className={[
        'rounded-card border shadow-spaers-sm',
        TONE[tone] || TONE.light,
        padding,
        hover
          ? 'transition-shadow duration-150 ease-out hover:shadow-spaers-md'
          : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

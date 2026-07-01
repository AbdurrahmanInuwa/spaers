'use client';

import Link from 'next/link';

// Spec-driven button primitive — 6px radius (squarcle), uppercase semibold
// label, snappy ease-out hover. Three intents and three sizes cover every
// CTA on the marketing site.
//
// Variants:
//   primary  — red (action / SOS). The hero CTA.
//   navy     — deep navy (institutional / B2B trust)
//   outline  — transparent with navy border (secondary actions)
//   ghost    — text-only with hover bg (tertiary)
//
// Usage:
//   <Button href="/signup">Get Protected Now</Button>
//   <Button intent="navy" size="lg" href="/for-responders">Partner with us</Button>
//   <Button as="button" intent="outline" onClick={fn}>Cancel</Button>

const SIZE = {
  sm: 'px-4 py-2 text-[13px]',
  md: 'px-6 py-3 text-[15px]',
  lg: 'px-8 py-4 text-[16px]',
};

const INTENT = {
  primary:
    'bg-red text-white shadow-spaers-md hover:bg-red-dark focus-visible:outline-red',
  navy:
    'bg-navy text-white shadow-spaers-md hover:bg-navy-600 focus-visible:outline-navy',
  // For placing on top of a red / dark background — soft-ice pill with
  // red text. Hover swaps in a 3-px red border (no bg change). A
  // transparent border lives by default so the hover doesn't cause a
  // layout shift.
  white:
    'bg-navy-50 text-red shadow-spaers-md border-[3px] border-transparent hover:border-red focus-visible:outline-white',
  outline:
    'border-2 border-navy bg-transparent text-navy hover:bg-navy hover:text-white focus-visible:outline-navy',
  ghost:
    'bg-transparent text-navy hover:bg-navy-50 focus-visible:outline-navy',
};

export default function Button({
  href,
  children,
  intent = 'primary',
  size = 'md',
  pulse = false,
  className = '',
  ...rest
}) {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-btn font-semibold uppercase tracking-[0.05em]',
    'min-h-[48px] transition-all duration-150 ease-out',
    'disabled:cursor-not-allowed disabled:opacity-60',
    SIZE[size] || SIZE.md,
    INTENT[intent] || INTENT.primary,
    pulse ? 'animate-sos-pulse' : '',
    className,
  ].join(' ');

  if (href) {
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}

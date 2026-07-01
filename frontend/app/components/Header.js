'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Button from './marketing/Button';

// Two-tier header — utility strip (dark navy) above the main bar (white).
//
// Why two tiers?
//   1. The utility strip is a permanent reminder that SPAERS supplements
//      rather than replaces public-safety dispatch — keeps the 911/112
//      callout visible without polluting the main bar.
//   2. Sign-in lives in the utility strip so the main bar stays focused on
//      brand + nav + the one big red SOS CTA.
//
// On the home page hero we still want a transparent effect over the dark
// navy backdrop — we collapse both tiers into a single transparent layer
// until the user scrolls 32px+.

const PRIMARY_LINKS = [
  { href: '/for-users',      label: 'For Users' },
  { href: '/for-responders', label: 'For Responders' },
  { href: '/about',          label: 'About' },
  { href: '/faq',            label: 'FAQ' },
];

export default function Header({ variant = 'marketing' }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen]         = useState(false);

  const isPortal    = variant === 'portal';
  const isHome      = pathname === '/' && !isPortal;
  const transparent = isHome && !scrolled;

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 32); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Reset menu whenever the route changes
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      {/* ─────────────── Utility strip ─────────────── */}
      <div
        className={[
          'transition-colors duration-200 ease-out',
          transparent
            ? 'bg-white/5 backdrop-blur-sm'
            : 'bg-navy text-white',
        ].join(' ')}
      >
        <div
          className={[
            'flex h-9 items-center justify-center px-6 sm:px-8',
            isPortal ? '' : 'mx-auto max-w-[1440px]',
          ].join(' ')}
        >
          <span className="text-[12px] text-white/70">
            For life-threatening emergencies, also call{' '}
            <span className="font-mono font-semibold text-white">911 / 112</span>
          </span>
        </div>
      </div>

      {/* ─────────────── Main bar ─────────────── */}
      <div
        className={[
          'transition-all duration-200 ease-out',
          transparent
            ? 'bg-transparent'
            : 'border-b border-navy-100 bg-white/95 shadow-spaers-sm backdrop-blur-md',
        ].join(' ')}
      >
        <div
          className={[
            'flex h-16 items-center justify-between px-6 sm:px-8',
            isPortal ? '' : 'mx-auto max-w-[1440px]',
          ].join(' ')}
        >
          <Link
            href="/"
            className="flex items-center gap-2.5"
            aria-label="SPAERS home"
          >
            <ShieldBoltIcon className={transparent ? 'text-white' : 'text-red'} />
            <div className="flex flex-col leading-none">
              <span
                className={`text-[18px] font-extrabold tracking-tight ${
                  transparent ? 'text-white' : 'text-navy'
                }`}
              >
                SPAERS
              </span>
              <span
                className={`mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] ${
                  transparent ? 'text-white/60' : 'text-muted'
                }`}
              >
                Emergency Response
              </span>
            </div>
          </Link>

          {/* Desktop nav (centered) — marketing only */}
          {!isPortal && (
            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex">
              {PRIMARY_LINKS.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={[
                      'rounded-btn px-3 py-2 text-[14px] font-medium transition-colors',
                      transparent
                        ? active
                          ? 'text-white'
                          : 'text-white/75 hover:text-white'
                        : active
                          ? 'bg-navy-50 text-navy'
                          : 'text-navy-600 hover:bg-navy-50 hover:text-navy',
                    ].join(' ')}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right side — Sign in (marketing only) */}
          {!isPortal && (
            <div className="hidden items-center gap-3 lg:flex">
              <Button intent="primary" size="sm" href="/signin">
                Sign in
              </Button>
            </div>
          )}

          {/* Mobile hamburger — marketing only */}
          {!isPortal && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label="Open menu"
              aria-expanded={open}
              className={[
                'flex h-11 w-11 items-center justify-center rounded-btn lg:hidden',
                transparent ? 'text-white' : 'text-navy',
              ].join(' ')}
            >
              {open ? <CloseIcon /> : <HamburgerIcon />}
            </button>
          )}
        </div>
      </div>

      {/* ─────────────── Mobile drawer (marketing only) ─────────────── */}
      {!isPortal && open && (
        <div className="border-t border-navy-100 bg-white shadow-spaers-md lg:hidden">
          <nav className="mx-auto flex max-w-[1440px] flex-col gap-1 px-6 py-4">
            {PRIMARY_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-btn px-3 py-3 text-[14px] font-medium text-navy-700 hover:bg-navy-50"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/contact"
              className="rounded-btn px-3 py-3 text-[14px] font-medium text-navy-700 hover:bg-navy-50"
            >
              Contact
            </Link>
            <div className="mt-2">
              <Button intent="navy" size="sm" href="/signin" className="w-full">
                Sign in
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/* ───── Icons ───── */
function ShieldBoltIcon({ className = '' }) {
  return (
    <svg
      width="32" height="32" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" className={className} aria-hidden="true"
    >
      <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" />
      <path d="m13 8-3 5h3l-1 4 3-5h-3l1-4z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
      aria-hidden="true">
      <line x1="3" y1="7" x2="21" y2="7" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="17" x2="21" y2="17" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
      aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

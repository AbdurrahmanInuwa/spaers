'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

// Wraps the app in the public Header + Footer chrome — except inside the
// authenticated dashboard, where the sidebar takes over.
//
// SOS overlay (route `/sos`) needs a chromeless full-bleed surface so its
// fullscreen emergency UI isn't squeezed by header + footer. Same for the
// auth funnels we want to keep ultra-focused.
export default function AppChrome({ children }) {
  const pathname = usePathname();
  const isDashboard       = pathname?.startsWith('/dashboard');
  const isInstitution     = pathname?.startsWith('/institution');
  const isPublicResponder =
    pathname?.startsWith('/e/') ||
    pathname?.startsWith('/d/') ||
    pathname?.startsWith('/v/');
  const isAdmin           = pathname?.startsWith('/d/f/g/h/admin');
  const isSos             = pathname?.startsWith('/sos');

  // Public-responder, admin, and SOS surfaces stay chromeless (full-bleed).
  if (isPublicResponder || isAdmin || isSos) {
    return children;
  }

  // Portal (citizen dashboard + institution) gets the marketing header in
  // a stripped-down "portal" variant: keeps the wordmark + 911/112 utility
  // strip, drops the nav links and Sign-in CTA. No footer.
  if (isDashboard || isInstitution) {
    return (
      <>
        <Header variant="portal" />
        <div className="mt-[100px]">{children}</div>
      </>
    );
  }

  // The header is fixed (transparent over the hero) so the page itself
  // doesn't need top padding on the home route. Other public pages add
  // pt-[100px] so their first section doesn't slide under the two-tier
  // header (utility strip 36px + main bar 64px).
  const isHome = pathname === '/';
  return (
    <>
      <Header />
      <main className={`flex-1 ${isHome ? '' : 'pt-[100px]'}`}>
        {children}
      </main>
      <Footer />
    </>
  );
}

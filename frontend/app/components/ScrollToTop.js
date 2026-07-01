'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Snaps the viewport back to the top every time the route changes. Next.js
// App Router preserves scroll for back/forward but doesn't always reset on
// forward navigation — this makes every link click land you at y=0, which
// is what users expect on marketing content pages.
export default function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Instant, not smooth — smooth on link click looks laggy.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

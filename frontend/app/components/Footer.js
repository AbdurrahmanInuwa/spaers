import Link from 'next/link';

// Rich, government-contract-grade footer:
//   - 4-column link grid (Product · Solutions · Company · Legal)
//   - Newsletter / "Stay informed" stub
//   - Emergency disclaimer band — required because users might mistake
//     us for a 911 replacement
//   - Status row with build version + system status
const SECTIONS = [
  {
    title: 'Product',
    links: [
      { href: '/technology',     label: 'Technology' },
      { href: '/integration',    label: 'IoT Device' },
      { href: '/security',       label: 'Security' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { href: '/for-users',      label: 'For Individuals' },
      { href: '/for-responders', label: 'For Municipalities' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about',          label: 'About' },
      { href: '/blog',           label: 'Resources & Blog' },
      { href: '/faq',            label: 'FAQ' },
      { href: '/contact',        label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy',        label: 'Privacy Policy' },
      { href: '/terms',          label: 'Terms of Service' },
      { href: '/cookies',        label: 'Cookie Policy' },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full bg-navy text-navy-100">
      {/* Emergency disclaimer band — must be unmissable */}
      <div className="border-b border-navy-600/40 bg-red/10">
        <div className="mx-auto max-w-[1440px] px-6 py-3 text-[13px] sm:px-8">
          <p className="font-semibold text-white">
            For immediate life-threatening emergencies, also call your local emergency number (e.g. 911 / 112).
          </p>
        </div>
      </div>

      {/* Main footer grid — pt keeps comfortable top breathing room, pb is
          tight so the © line sits close to the bottom edge. */}
      <div className="mx-auto max-w-[1440px] px-6 pt-12 pb-6 sm:px-8 sm:pt-16 sm:pb-6">
        {/* Brand column gets a wider track (1.8fr) and a generous right
            gutter so the four link columns clearly group to the right. */}
        <div className="grid gap-10 lg:grid-cols-[1.8fr_repeat(4,1fr)] lg:gap-x-12 xl:gap-x-16">
          {/* Brand + tagline */}
          <div className="max-w-sm lg:pr-8 xl:pr-12">
            <div className="flex items-center gap-2">
              <ShieldBolt />
              <span className="text-xl font-extrabold tracking-tight text-white">
                SPAERS
              </span>
            </div>
            <p className="mt-5 text-[14px] leading-relaxed text-navy-200">
              Smart Panic Alert &amp; Emergency Response System.
            </p>
          </div>

          {SECTIONS.map((sec) => (
            <div key={sec.title}>
              <h3 className="text-micro font-semibold uppercase tracking-[0.15em] text-white">
                {sec.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {sec.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[14px] text-navy-200 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-navy-600/50 pt-4 text-[12px] text-navy-300">
          <p>© {year} SPAERS. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function ShieldBolt() {
  return (
    <svg
      width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" className="text-red" aria-hidden="true"
    >
      <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" />
      <path d="m13 8-3 5h3l-1 4 3-5h-3l1-4z" fill="currentColor" stroke="none" />
    </svg>
  );
}

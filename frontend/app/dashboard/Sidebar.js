'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, ageFromDob } from '../lib/auth';
import { apiFetch } from '../lib/api';

const NAV = [
  { label: 'Emergency', href: '/dashboard/emergency' },
  { label: 'Family', href: '/dashboard/family', adultOnly: true },
  { label: 'Volunteer', href: '/dashboard/volunteer', adultOnly: true },
  { label: 'History', href: '/dashboard/reports' },
  { label: 'Profile', href: '/dashboard/profile' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const age = ageFromDob(user?.dob);
  const isAdult = age == null ? true : age >= 18;
  // Under-18s who have been added to a family by an adult relative are
  // allowed to view the Family tab. Pull this lazily.
  const [inFamilyAsMinor, setInFamilyAsMinor] = useState(false);
  useEffect(() => {
    if (!user?.id || isAdult) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/family/me');
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data?.family) setInFamilyAsMinor(true);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isAdult]);

  async function handleLogout() {
    await logout();
    router.push('/signin');
  }

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-navy-700 bg-navy text-white">
      <nav className="flex-1 space-y-1 px-3 pb-3 pt-8">
        {NAV.map((item) => {
          // Family is special: under-18s can access only if added as a member
          const familyOverride =
            item.label === 'Family' && inFamilyAsMinor && !isAdult;
          const disabled = item.adultOnly && !isAdult && !familyOverride;
          const isActive = pathname === item.href;

          if (disabled) {
            return (
              <span
                key={item.label}
                className="block cursor-not-allowed rounded-btn px-3 py-2 text-[14px] font-medium text-navy-400"
                title="Available to users 18 and over"
              >
                {item.label}
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={[
                'block rounded-btn px-3 py-2 text-[14px] font-medium transition-colors',
                isActive
                  ? 'bg-red text-white shadow-spaers-sm'
                  : 'text-navy-200 hover:bg-white/5 hover:text-white',
              ].join(' ')}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-navy-700 p-3">
        {user && (
          <div className="mb-2 px-2 text-xs">
            <p className="truncate text-[13px] font-semibold text-white">
              {user.firstName} {user.lastName}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-btn border border-navy-600 px-3 py-2 text-left text-[13px] font-semibold text-navy-200 transition-colors hover:border-red hover:text-red"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

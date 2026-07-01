'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';

const NAV = [
  { label: 'Emergency', href: '/institution/emergency' },
  { label: 'Dispatchers', href: '/institution/dispatchers' },
  { label: 'History', href: '/institution/history' },
  { label: 'Settings', href: '/institution/settings' },
  { label: 'Guide', href: '/institution/guide' },
];

export default function InstitutionSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push('/signin?tab=institution');
  }

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-navy-700 bg-navy text-white">
      <nav className="flex-1 space-y-1 px-3 pb-3 pt-8">
        {NAV.map((item) => {
          const isActive = pathname === item.href;
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
              {user.name}
            </p>
            <p className="truncate text-[10px] uppercase tracking-[0.12em] text-navy-300">
              {user.type}
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

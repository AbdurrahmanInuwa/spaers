'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '../components/Toast';
import { API_URL, apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import OtpVerifyForm from '../components/OtpVerifyForm';

const tabs = ['Citizen', 'Institution'];

function tabFromParam(value) {
  if (!value) return 'Citizen';
  const v = String(value).toLowerCase();
  if (v === 'institution' || v === 'institutions') return 'Institution';
  if (v === 'citizen' || v === 'citizens') return 'Citizen';
  return 'Citizen';
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <SignInPageInner />
    </Suspense>
  );
}

function SignInPageInner() {
  const router = useRouter();
  const toast = useToast();
  const { refresh } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(() =>
    tabFromParam(searchParams.get('tab'))
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // 2FA state — set when /login returns { pending2FA: true }
  const [pending2FA, setPending2FA] = useState(null); // { role, email }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const role = activeTab.toLowerCase(); // 'citizen' | 'institution'
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, email: username, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 202 && data.pending2FA) {
        setSubmitting(false); // free the button before the screen swaps
        setPending2FA({ role: data.role, email: username.trim().toLowerCase() });
        toast('Verification code sent');
        return;
      }
      if (!res.ok) {
        toast(data.error || 'Login failed', { variant: 'error' });
        return;
      }
      // Single-factor success — server set the cookie, hydrate context
      await refresh();
      setSubmitting(false);
      toast(
        `Welcome back, ${data.user?.firstName || data.user?.name || ''}`.trim()
      );
      // Use whichever role the server confirms; fall back to the tab the
      // user was on if the response omitted it.
      const finalRole = data.role || role;
      if (finalRole === 'citizen') router.push('/dashboard');
      else if (finalRole === 'institution') router.push('/institution');
      else console.warn('login: unknown role in response', data);
    } catch (err) {
      console.error(err);
      toast('Network error. Is the server running?', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  if (pending2FA) {
    return (
      <div className="flex min-h-[calc(100vh-100px)] items-center justify-center bg-ice px-6 py-12">
        <div className="w-full max-w-lg overflow-hidden rounded-card border border-navy-100 bg-white shadow-spaers-md">
          <div className="border-b border-navy-100 px-7 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red">
              Two-factor sign-in
            </p>
            <h1 className="mt-1 text-[20px] font-extrabold leading-tight tracking-[-0.01em] text-navy">
              Verify it&apos;s you
            </h1>
            <p className="mt-1 text-[13px] text-muted">
              Enter the 6-digit code we sent to{' '}
              <span className="font-semibold text-navy">{pending2FA.email}</span>.
            </p>
          </div>
          <div className="p-7">
            <OtpVerifyForm
              role={pending2FA.role}
              email={pending2FA.email}
              purpose="login_2fa"
              submitLabel="Sign in"
              submit={({ code }) =>
                apiFetch('/auth/verify-login-otp', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    role: pending2FA.role,
                    email: pending2FA.email,
                    code,
                  }),
                })
              }
              onSuccess={async () => {
                await refresh();
                toast('Welcome back');
                if (pending2FA.role === 'citizen') router.push('/dashboard');
                else router.push('/institution');
              }}
            />
            <button
              type="button"
              onClick={() => setPending2FA(null)}
              className="mt-4 w-full text-center text-[12px] font-semibold text-muted transition-colors hover:text-red"
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-100px)] items-center justify-center bg-ice px-6 py-12">
      <div className="w-full max-w-lg overflow-hidden rounded-card border border-navy-100 bg-white shadow-spaers-md">
        {/* Header — eyebrow + title */}
        <div className="px-7 pt-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red">
            Welcome back
          </p>
          <h1 className="mt-1 text-[24px] font-extrabold leading-tight tracking-[-0.01em] text-navy">
            Sign in to SPAERS
          </h1>
          <p className="mt-1.5 text-[13px] text-muted">
            Choose how you&apos;re signing in.
          </p>
        </div>

        {/* Role tabs — segmented control */}
        <div className="px-7 pt-5">
          <div className="grid grid-cols-2 gap-1 rounded-btn bg-navy-50 p-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={[
                    'rounded-btn px-4 py-2.5 text-[13px] font-semibold uppercase tracking-[0.05em] transition-all',
                    isActive
                      ? 'bg-white text-navy shadow-spaers-sm'
                      : 'text-navy-600 hover:text-navy',
                  ].join(' ')}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-7">
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-navy-600"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-btn border border-navy-100 bg-white px-3.5 py-2.5 text-[14px] text-navy outline-none transition-colors placeholder:text-navy-300 focus:border-red"
              required
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label
                htmlFor="password"
                className="text-[11px] font-semibold uppercase tracking-[0.08em] text-navy-600"
              >
                Password
              </label>
              <Link
                href={`/forgot-password?tab=${activeTab.toLowerCase()}`}
                className="text-[12px] font-semibold text-muted transition-colors hover:text-red"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-btn border border-navy-100 bg-white px-3.5 py-2.5 text-[14px] text-navy outline-none transition-colors placeholder:text-navy-300 focus:border-red"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-btn bg-red px-6 text-[14px] font-bold uppercase tracking-[0.05em] text-white shadow-spaers-md transition-all duration-150 ease-out hover:bg-red-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Login'}
          </button>

          <p className="pt-1 text-center text-[13px] text-muted">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-semibold text-red transition-colors hover:text-red-dark"
            >
              Create account now
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

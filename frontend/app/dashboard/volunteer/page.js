'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../components/Toast';
import { apiFetch } from '../../lib/api';
import { uploadToS3 } from '../../lib/uploads';
import { getDialCode } from '../../lib/countries';

const FIELDS_OF_EMERGENCY = [
  'Medical / First Aid',
  'Fire & Rescue',
  'Search & Rescue',
  'Public Safety',
  'Disaster Relief',
  'Mental Health Support',
  'Hazmat / Environmental',
  'General',
];

export default function VolunteerPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [hydrated, setHydrated] = useState(false);
  const [volunteer, setVolunteer] = useState(null);

  // Form state
  const [field, setField] = useState('');
  const [idFile, setIdFile] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load existing application from server
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/volunteers/me');
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) setVolunteer(data.volunteer);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!field) {
      toast('Choose a field of emergency', { variant: 'error' });
      return;
    }
    if (!idFile) {
      toast('Upload a valid government-issued ID', { variant: 'error' });
      return;
    }
    if (!agreed) {
      toast('Please acknowledge the terms', { variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      // Upload the ID file to S3 first
      let idFileKey = null;
      try {
        const up = await uploadToS3({
          category: 'volunteer-id',
          file: idFile,
          ownerId: user.id,
        });
        idFileKey = up.key;
      } catch (uploadErr) {
        toast(uploadErr.message || 'Could not upload ID', { variant: 'error' });
        return;
      }

      const res = await apiFetch('/volunteers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          idFileName: idFile?.name || null,
          idFileKey,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Could not submit', { variant: 'error' });
        return;
      }
      setVolunteer(data.volunteer);
      toast('Application submitted');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || !hydrated) return null;

  // Approved / paused / pending profile view
  if (volunteer && volunteer.status !== 'revoked') {
    return (
      <VolunteerProfile
        volunteer={volunteer}
        user={user}
        onChange={setVolunteer}
      />
    );
  }

  // Application form (also shown if previously revoked — they can re-apply)
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-6 text-center sm:px-6 sm:py-8">
      <h1 className="text-2xl font-extrabold text-slate-900">Volunteer</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Help us keep your community safer. Become a trusted volunteer responder
        in your neighborhood.
      </p>

      {volunteer?.status === 'revoked' && (
        <div className="mt-4 w-full max-w-2xl rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          Your previous application was revoked. You may re-apply.
          {volunteer.decisionNote && (
            <span className="ml-1">Reason: {volunteer.decisionNote}</span>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 w-full max-w-3xl space-y-6 rounded-lg border border-slate-200 bg-white p-6 text-left shadow-sm"
      >
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Your information
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ReadOnlyField
              label="Name"
              value={`${user.firstName} ${user.lastName}`}
            />
            <ReadOnlyField label="Email" value={user.email} />
            <ReadOnlyField
              label="Date of birth"
              value={
                user.dob
                  ? new Date(user.dob).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
                    })
                  : '—'
              }
            />
            <ReadOnlyField label="Phone" value={user.phone} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Field of emergency
            </label>
            <select
              value={field}
              onChange={(e) => setField(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="">Select a field…</option>
              {FIELDS_OF_EMERGENCY.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Government-issued ID
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500 hover:border-brand hover:text-brand">
              <span className="truncate">
                {idFile ? idFile.name : 'Upload (driver license, ID, passport)'}
              </span>
              <span className="ml-3 rounded bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 shadow-sm">
                Browse
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
          />
          <span className="text-sm text-slate-700">
            By ticking this box, I confirm that the information I provide is
            true, that I am at least 18 years old, and that I agree to be
            contacted as a volunteer responder in emergencies through SPAERS.
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting || !agreed}
          className="w-full rounded-md bg-navy px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Register as volunteer'}
        </button>
      </form>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-800">{value || '—'}</p>
    </div>
  );
}

/* ─────────── Volunteer profile view (approved / pending) ─────────── */

function formatVolunteerPhone(phone, country) {
  if (!phone) return '—';
  const dial = getDialCode(country);
  if (!dial) return phone;
  const local = String(phone).replace(/\D/g, '').replace(/^0+/, '');
  return `+${dial} ${local}`;
}

function VolunteerProfile({ volunteer, user, onChange }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null); // 'pause' | 'resume' | 'stop' | null

  const isApproved = volunteer.status === 'approved';
  const isPaused = volunteer.status === 'paused';
  const isPending = volunteer.status === 'pending';

  const statusMeta = isApproved
    ? { eyebrow: 'Approved volunteer', headline: 'You are an approved volunteer', color: 'text-teal-dark', accent: 'bg-teal', badge: 'Active' }
    : isPaused
      ? { eyebrow: 'Volunteering paused', headline: 'Your volunteering is on pause', color: 'text-navy-600', accent: 'bg-navy', badge: 'Paused' }
      : { eyebrow: 'Application under review', headline: 'Your application is being processed', color: 'text-amber-600', accent: 'bg-amber-500', badge: 'Pending review' };

  const lede = isApproved
    ? 'We may contact you when an emergency in your field needs help. Keep your contact details up to date so responders can reach you quickly.'
    : isPaused
      ? 'You will not receive volunteer alerts until you resume. Your approval is preserved — just tap Resume to come back.'
      : 'We will notify you as soon as an admin reviews your application. This usually takes 1 to 2 business days.';

  async function post(action) {
    if (busy) return;
    if (action === 'stop') {
      const ok = confirm(
        'Stop volunteering completely? You will have to reapply and be re-approved by an admin to come back.'
      );
      if (!ok) return;
    }
    setBusy(action);
    try {
      const res = await apiFetch(`/volunteers/me/${action}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Action failed', { variant: 'error' });
        return;
      }
      onChange?.(data.volunteer);
      toast(
        action === 'pause'
          ? 'Volunteering paused'
          : action === 'resume'
            ? 'Welcome back, you are active again'
            : 'You are no longer volunteering'
      );
    } catch (err) {
      console.error(`volunteer ${action} failed:`, err);
      toast('Network error', { variant: 'error' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="max-w-4xl">
        {/* Header */}
        <p
          className={[
            'text-[11px] font-semibold uppercase tracking-[0.18em]',
            statusMeta.color,
          ].join(' ')}
        >
          {statusMeta.eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight text-navy sm:text-3xl">
          {statusMeta.headline}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{lede}</p>

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Field */}
          <VolunteerCard title="Field" accent={statusMeta.accent}>
            <ProfileTile label="Emergency field" value={volunteer.field} />
            <ProfileTile
              label="Status"
              value={statusMeta.badge}
              highlight={isApproved}
            />
            {volunteer.decidedAt && (
              <ProfileTile
                label="Approved on"
                value={new Date(volunteer.decidedAt).toLocaleDateString(
                  undefined,
                  { year: 'numeric', month: 'short', day: 'numeric' }
                )}
              />
            )}
            <ProfileTile
              label="Applied on"
              value={new Date(volunteer.createdAt).toLocaleDateString(
                undefined,
                { year: 'numeric', month: 'short', day: 'numeric' }
              )}
            />
          </VolunteerCard>

          {/* Contact */}
          <VolunteerCard title="Contact information" accent="bg-red">
            <ProfileTile
              label="Name"
              value={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '—'}
            />
            <ProfileTile label="Email" value={user?.email} />
            <ProfileTile
              label="Phone"
              value={formatVolunteerPhone(user?.phone, user?.country)}
            />
            <ProfileTile label="Country" value={user?.country} />
          </VolunteerCard>
        </div>

        {volunteer.decisionNote && (
          <div className="mt-5 rounded-card border border-navy-100 bg-white p-5 shadow-spaers-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-300">
              Note from admin
            </p>
            <p className="mt-1 text-sm text-navy-600">
              {volunteer.decisionNote}
            </p>
          </div>
        )}

        {/* Actions — only shown once the application has been approved */}
        {(isApproved || isPaused) && (
          <div className="mt-8 flex flex-col gap-3 rounded-card border border-navy-100 bg-white p-5 shadow-spaers-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">
                Manage
              </p>
              <p className="mt-1 text-sm text-navy-600">
                {isApproved
                  ? 'Take a break, or step down permanently.'
                  : 'Come back now, or step down permanently.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isApproved && (
                <button
                  type="button"
                  onClick={() => post('pause')}
                  disabled={!!busy}
                  className="rounded-btn bg-navy px-4 py-2 text-sm font-bold text-white shadow-spaers-sm transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy === 'pause' ? 'Pausing…' : 'Pause'}
                </button>
              )}
              {isPaused && (
                <button
                  type="button"
                  onClick={() => post('resume')}
                  disabled={!!busy}
                  className="rounded-btn bg-teal px-4 py-2 text-sm font-bold text-white shadow-spaers-sm transition-colors hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy === 'resume' ? 'Resuming…' : 'Resume'}
                </button>
              )}
              <button
                type="button"
                onClick={() => post('stop')}
                disabled={!!busy}
                className="rounded-btn border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === 'stop' ? 'Stopping…' : 'Stop volunteering'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VolunteerCard({ title, accent, children }) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-card border border-navy-100 bg-white shadow-spaers-sm">
      <header className="flex items-center gap-2 border-b border-navy-50 px-5 py-3">
        <span className={`h-2 w-2 rounded-full ${accent}`} />
        <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">
          {title}
        </h2>
      </header>
      <div className="grid flex-1 grid-cols-1 gap-px bg-navy-50 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function ProfileTile({ label, value, highlight = false }) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-300">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-medium ${
          highlight ? 'text-teal-dark' : 'text-navy'
        }`}
      >
        {value || '—'}
      </p>
    </div>
  );
}

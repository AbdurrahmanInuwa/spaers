'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, API_URL } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../components/Toast';
import { uploadToS3 } from '../../../lib/uploads';

const TYPES = ['Shooting', 'Medical', 'Assault', 'Kidnapping', 'Fire', 'Flooding'];

const PRIORITIES = [
  { value: 'low', label: 'Low', tint: 'bg-slate-500' },
  { value: 'medium', label: 'Medium', tint: 'bg-amber-500' },
  { value: 'high', label: 'High', tint: 'bg-rose-600' },
  { value: 'critical', label: 'Critical', tint: 'bg-brand' },
];

const MIN_DESC = 10;
const MAX_DESC = 1000;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

export default function NewReportPage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const photoRef = useRef(null);
  const videoRef = useRef(null);

  const [type, setType] = useState(null);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [anonymous, setAnonymous] = useState(false);
  // Media is either a photo OR a video — single slot, replace each other.
  // Shape: { file, mediaType: 'image' | 'video', previewUrl }.
  const [media, setMedia] = useState(null);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [locBusy, setLocBusy] = useState(false);
  const [locError, setLocError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Revoke blob URLs when replaced/removed to avoid memory leaks.
  useEffect(() => {
    return () => {
      if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
    };
  }, [media]);

  // Auto-fetch location on mount.
  useEffect(() => {
    fetchLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchLocation() {
    if (locBusy) return;
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported by this browser.');
      return;
    }
    setLocBusy(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(p);
        setLocBusy(false);
        // Best-effort friendly address.
        fetch(`${API_URL}/ai/place-name`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        })
          .then((r) => r.json().catch(() => ({})))
          .then((d) => {
            if (d?.name) setAddress(d.name);
          })
          .catch(() => {});
      },
      (err) => {
        setLocBusy(false);
        setLocError(
          err.code === 1
            ? 'Location permission denied. Enable it in your browser settings.'
            : 'Could not get your location.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function pickPhoto(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast('Please choose an image file', { variant: 'error' });
      return;
    }
    if (f.size > MAX_PHOTO_BYTES) {
      toast('Photo must be under 5 MB', { variant: 'error' });
      return;
    }
    if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
    setMedia({
      file: f,
      mediaType: 'image',
      previewUrl: URL.createObjectURL(f),
    });
    if (photoRef.current) photoRef.current.value = '';
  }

  function pickVideo(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      toast('Please choose a video file', { variant: 'error' });
      return;
    }
    if (f.size > MAX_VIDEO_BYTES) {
      toast('Video must be under 30 MB', { variant: 'error' });
      return;
    }
    if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
    setMedia({
      file: f,
      mediaType: 'video',
      previewUrl: URL.createObjectURL(f),
    });
    if (videoRef.current) videoRef.current.value = '';
  }

  function clearMedia() {
    if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
    setMedia(null);
  }

  const descLen = description.trim().length;
  const descError =
    descLen === 0
      ? null
      : descLen < MIN_DESC
        ? `Add at least ${MIN_DESC - descLen} more character${MIN_DESC - descLen === 1 ? '' : 's'}.`
        : descLen > MAX_DESC
          ? `Maximum ${MAX_DESC} characters.`
          : null;

  const canSubmit =
    !submitting &&
    type !== null &&
    descLen >= MIN_DESC &&
    descLen <= MAX_DESC &&
    location !== null;

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Upload the chosen media (photo OR video) if any.
      const attachmentKeys = [];
      if (media?.file) {
        try {
          const { key } = await uploadToS3({
            category: 'report-media',
            file: media.file,
            ownerId: user?.id,
          });
          attachmentKeys.push(key);
        } catch (err) {
          toast(
            media.mediaType === 'video'
              ? 'Video upload failed — submitting without it'
              : 'Photo upload failed — submitting without it',
            { variant: 'error' }
          );
        }
      }
      const res = await apiFetch('/emergencies/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description: description.trim(),
          priority,
          anonymous,
          lat: location.lat,
          lng: location.lng,
          attachmentKeys: attachmentKeys.length ? attachmentKeys : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Could not submit report', { variant: 'error' });
        return;
      }
      const n = data.notifiedInstitutions || 0;
      toast(
        n > 0
          ? `Report sent to ${n} institution${n === 1 ? '' : 's'}`
          : 'Report filed'
      );
      router.replace('/dashboard/reports');
    } catch (err) {
      console.error('Submit report failed:', err);
      toast('Network error', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="max-w-2xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
          File a report
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          For witness reports or non-life-threatening situations. Use the SOS
          button instead if you are in immediate danger.
        </p>

        <form
          onSubmit={submit}
          className="mt-6 space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <Section title="Emergency type">
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  selected={type === t}
                  onClick={() => setType(t)}
                />
              ))}
            </div>
          </Section>

          <Section title="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={MAX_DESC + 50}
              placeholder="What is happening? Where? Anything important responders should know."
              className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <div className="mt-1 flex items-center justify-between">
              <p
                className={`text-[11px] ${
                  descError ? 'text-rose-700' : 'text-slate-400'
                }`}
              >
                {descError || ' '}
              </p>
              <p className="text-[11px] text-slate-400">
                {descLen} / {MAX_DESC}
              </p>
            </div>
          </Section>

          <Section title="Priority">
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <Chip
                  key={p.value}
                  label={p.label}
                  tint={p.tint}
                  selected={priority === p.value}
                  onClick={() => setPriority(p.value)}
                />
              ))}
            </div>
          </Section>

          <Section title="Photo or video (optional)">
            {media ? (
              <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-2">
                {media.mediaType === 'video' ? (
                  <video
                    src={media.previewUrl}
                    className="h-16 w-16 rounded-md bg-slate-900 object-cover"
                    muted
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={media.previewUrl}
                    alt="Selected"
                    className="h-16 w-16 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {media.file.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {(media.file.size / 1024).toFixed(0)} KB ·{' '}
                    <span className="font-mono uppercase tracking-wider text-slate-400">
                      {media.mediaType}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearMedia}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label="Remove media"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center justify-between rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500 hover:border-brand hover:text-brand">
                  <span>Add a photo</span>
                  <span className="rounded bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 shadow-sm">
                    Browse
                  </span>
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    onChange={pickPhoto}
                    className="hidden"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500 hover:border-brand hover:text-brand">
                  <span>Add a video</span>
                  <span className="rounded bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 shadow-sm">
                    Browse
                  </span>
                  <input
                    ref={videoRef}
                    type="file"
                    accept="video/*"
                    onChange={pickVideo}
                    className="hidden"
                  />
                </label>
              </div>
            )}
            <p className="mt-1 text-[11px] text-slate-400">
              Photo up to 5 MB · Video up to 30 MB · single attachment per
              report.
            </p>
          </Section>

          <Section title="Location">
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2.5">
              <div className="min-w-0">
                {location ? (
                  <>
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {address || 'Current location'}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400">
                      {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    {locError || 'Locating…'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={fetchLocation}
                disabled={locBusy}
                className="ml-3 rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-brand hover:text-brand disabled:opacity-60"
              >
                {locBusy ? 'Locating…' : 'Refresh'}
              </button>
            </div>
          </Section>

          <Section title="Privacy">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Report anonymously
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Institutions see the report without your name. You can still
                  see it in My Reports.
                </p>
              </div>
              <Toggle
                checked={anonymous}
                onChange={() => setAnonymous((v) => !v)}
              />
            </label>
          </Section>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-md bg-brand px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Submit report'}
          </button>
          <p className="text-center text-[11px] text-slate-400">
            You can cancel a pending report from My Reports.
          </p>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
        {title}
      </p>
      {children}
    </div>
  );
}

function Chip({ label, selected, onClick, tint = 'bg-brand' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-semibold transition ${
        selected
          ? `border-transparent ${tint} text-white shadow-sm`
          : 'border-slate-200 bg-white text-slate-700 hover:border-brand hover:text-brand'
      }`}
    >
      {label}
    </button>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? 'bg-brand' : 'bg-slate-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

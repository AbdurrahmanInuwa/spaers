'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useToast } from './Toast';
import { apiFetch, API_URL } from '../lib/api';
import { uploadToS3 } from '../lib/uploads';

// Right-side slide-in panel containing the full "file a report" form.
// Replaces the standalone /dashboard/reports/new page for citizens already
// on My Reports — keeps them in context, no navigation required.
//
// Props:
//   open:        bool — controls visibility / animation
//   onClose():   dismiss without submitting
//   onSubmitted(): called after a successful POST so the list can refresh

const TYPES = ['Shooting', 'Medical', 'Assault', 'Kidnapping', 'Fire', 'Flooding'];

const PRIORITIES = [
  { value: 'low', label: 'Low', tint: 'bg-navy-600' },
  { value: 'medium', label: 'Medium', tint: 'bg-amber-500' },
  { value: 'high', label: 'High', tint: 'bg-rose-600' },
  { value: 'critical', label: 'Critical', tint: 'bg-red' },
];

const MIN_DESC = 10;
const MAX_DESC = 1000;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

export default function FileReportModal({ open, onClose, onSubmitted }) {
  const { user } = useAuth();
  const toast = useToast();
  const photoRef = useRef(null);
  const videoRef = useRef(null);

  const [type, setType] = useState(null);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [anonymous, setAnonymous] = useState(false);
  const [media, setMedia] = useState(null);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [locBusy, setLocBusy] = useState(false);
  const [locError, setLocError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Revoke blob URLs when replaced/removed
  useEffect(() => {
    return () => {
      if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
    };
  }, [media]);

  // Reset form whenever the modal opens fresh
  useEffect(() => {
    if (open) {
      setType(null);
      setDescription('');
      setPriority('medium');
      setAnonymous(false);
      if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
      setMedia(null);
      setLocation(null);
      setAddress(null);
      setLocError(null);
      fetchLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function fetchLocation() {
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
      onSubmitted?.();
      onClose();
    } catch (err) {
      console.error('Submit report failed:', err);
      toast('Network error', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Scrim */}
      <div
        className={[
          'fixed inset-0 z-40 bg-navy/40 transition-opacity duration-200',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal — originates from the bottom-right FAB. Anchored bottom-right
          of the viewport so the transform-origin lines up with the button. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-report-title"
        className={[
          'fixed bottom-24 right-6 z-50 flex max-h-[calc(100dvh-8rem)] w-[calc(100vw-3rem)] max-w-xl origin-bottom-right flex-col overflow-hidden rounded-card border border-navy-100 bg-white shadow-spaers-lg transition-all duration-200 ease-out',
          open
            ? 'pointer-events-auto scale-100 opacity-100'
            : 'pointer-events-none scale-0 opacity-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-navy-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red">
              New report
            </p>
            <h2
              id="file-report-title"
              className="mt-1 text-xl font-extrabold tracking-tight text-navy"
            >
              File a report
            </h2>
            <p className="mt-1 text-xs text-muted">
              For witness reports or non-life-threatening situations. Use the
              SOS button instead if you are in immediate danger.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-btn text-muted transition-colors hover:bg-navy-50 hover:text-navy"
          >
            ✕
          </button>
        </div>

        {/* Form (scrollable) */}
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
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
                className="w-full resize-y rounded-btn border border-navy-100 bg-white px-3 py-2 text-sm text-navy outline-none transition-colors placeholder:text-navy-300 focus:border-red"
              />
              <div className="mt-1 flex items-center justify-between">
                <p
                  className={`text-[11px] ${
                    descError ? 'text-rose-700' : 'text-muted'
                  }`}
                >
                  {descError || ' '}
                </p>
                <p className="text-[11px] text-muted">
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
                <div className="flex items-center gap-3 rounded-btn border border-navy-100 bg-white p-2">
                  {media.mediaType === 'video' ? (
                    <video
                      src={media.previewUrl}
                      className="h-16 w-16 rounded-btn bg-navy object-cover"
                      muted
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={media.previewUrl}
                      alt="Selected"
                      className="h-16 w-16 rounded-btn object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy">
                      {media.file.name}
                    </p>
                    <p className="text-[11px] text-muted">
                      {(media.file.size / 1024).toFixed(0)} KB ·{' '}
                      <span className="font-mono uppercase tracking-wider text-navy-300">
                        {media.mediaType}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearMedia}
                    className="text-muted transition-colors hover:text-navy"
                    aria-label="Remove media"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center justify-between rounded-btn border border-dashed border-navy-100 bg-ice px-3 py-3 text-sm text-muted transition-colors hover:border-red hover:text-red">
                    <span>Add a photo</span>
                    <span className="rounded bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-navy-600 shadow-spaers-sm">
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
                  <label className="flex cursor-pointer items-center justify-between rounded-btn border border-dashed border-navy-100 bg-ice px-3 py-3 text-sm text-muted transition-colors hover:border-red hover:text-red">
                    <span>Add a video</span>
                    <span className="rounded bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-navy-600 shadow-spaers-sm">
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
              <p className="mt-1 text-[11px] text-muted">
                Photo up to 5 MB · Video up to 30 MB · single attachment per
                report.
              </p>
            </Section>

            <Section title="Location">
              <div className="flex items-center justify-between rounded-btn border border-navy-100 bg-white px-3 py-2.5">
                <div className="min-w-0">
                  {location ? (
                    <>
                      <p className="truncate text-sm font-semibold text-navy">
                        {address || 'Current location'}
                      </p>
                      <p className="font-mono text-[11px] text-navy-300">
                        {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted">
                      {locError || 'Locating…'}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={fetchLocation}
                  disabled={locBusy}
                  className="ml-3 rounded-btn border border-navy-100 px-2.5 py-1 text-[11px] font-semibold text-navy-600 transition-colors hover:border-red hover:text-red disabled:opacity-60"
                >
                  {locBusy ? 'Locating…' : 'Refresh'}
                </button>
              </div>
            </Section>

            <Section title="Privacy">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-btn border border-navy-100 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-navy">
                    Report anonymously
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
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
          </div>

          {/* Sticky footer */}
          <div className="border-t border-navy-100 bg-white px-6 py-4">
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-btn bg-navy px-4 py-3 text-sm font-bold text-white shadow-spaers-sm transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Submit report'}
            </button>
            <p className="mt-2 text-center text-[11px] text-muted">
              You can cancel a pending report from My Reports.
            </p>
          </div>
        </form>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted">
        {title}
      </p>
      {children}
    </div>
  );
}

function Chip({ label, selected, onClick, tint = 'bg-red' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-btn border px-3.5 py-2 text-xs font-semibold transition-colors ${
        selected
          ? `border-transparent ${tint} text-white shadow-spaers-sm`
          : 'border-navy-100 bg-white text-navy-600 hover:border-red hover:text-red'
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
        checked ? 'bg-red' : 'bg-navy-100'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

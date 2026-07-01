'use client';

import {
  GoogleMap,
  OverlayView,
  useJsApiLoader,
} from '@react-google-maps/api';
import { googleMapsLoaderOptions } from '../lib/googleMaps';

const containerStyle = { width: '100%', height: '100%' };

// Brand red — matches tailwind.config.js (`red`)
const RED = '#E63946';
const RED_DARK = '#C1121F';

// Visible "reach" radius used in the subtitle. Pure UX copy for now — the
// real proximity check lives on the backend.
const REACH_KM = 3;

export default function InstitutionReview({
  form,
  onBack,
  onConfirm,
  submitting,
}) {
  const { isLoaded, loadError } = useJsApiLoader(googleMapsLoaderOptions);

  const hasCoords =
    typeof form.addressLat === 'number' && typeof form.addressLng === 'number';
  const center = hasCoords
    ? {
        lat: form.centerLat ?? form.addressLat,
        lng: form.centerLng ?? form.addressLng,
      }
    : null;

  const canConfirm = hasCoords && !submitting;

  return (
    <div className="flex min-h-[calc(100vh-100px)] items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand"
        >
          ← Back to details
        </button>

        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Institution Location
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Your institution will be notified of any incidents occurring within{' '}
          {REACH_KM} kilometers of this location.
        </p>

        {/* Map card */}
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="relative h-[360px] w-full sm:h-[440px]">
            {!hasCoords ? (
              <EmptyMap message="No coordinates available for this address. Go back and re-pick it from the suggestions." />
            ) : loadError ? (
              <EmptyMap message="Failed to load Google Maps. Check your network and try again." />
            ) : !isLoaded ? (
              <EmptyMap message="Loading map…" loading />
            ) : (
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={15}
                options={{
                  mapTypeId: 'roadmap',
                  disableDefaultUI: true,
                  zoomControl: true,
                  clickableIcons: false,
                  gestureHandling: 'cooperative',
                }}
              >
                <OverlayView
                  position={center}
                  mapPaneName={OverlayView.OVERLAY_LAYER}
                  getPixelPositionOffset={(w, h) => ({
                    x: -w / 2,
                    y: -h / 2,
                  })}
                >
                  <div
                    style={{ position: 'relative', width: 20, height: 20 }}
                    aria-hidden="true"
                  >
                    {/* Fading ping behind */}
                    <span
                      className="absolute inset-0 animate-location-ping rounded-full"
                      style={{ backgroundColor: RED }}
                    />
                    {/* Fixed 20 px core */}
                    <span
                      className="absolute inset-0 rounded-full"
                      style={{
                        backgroundColor: RED,
                        border: `2px solid ${RED_DARK}`,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                      }}
                    />
                  </div>
                </OverlayView>
              </GoogleMap>
            )}
          </div>

          {/* Pinned address */}
          <div className="border-t border-slate-200 bg-white px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Pinned address
            </p>
            <p className="mt-1 text-sm text-slate-800">{form.address || '—'}</p>
          </div>
        </div>

        {/* Confirm button */}
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Confirming…' : 'Confirm & continue'}
        </button>

        {!canConfirm && !submitting && (
          <p className="mt-3 text-center text-xs text-slate-500">
            Go back and pick the institution&apos;s address before confirming.
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyMap({ message, loading = false }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50 px-6 text-center text-sm text-slate-500">
      {loading ? (
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />
      ) : (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </span>
      )}
      <p>{message}</p>
    </div>
  );
}


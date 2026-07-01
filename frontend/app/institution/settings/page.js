'use client';

import { useEffect, useState } from 'react';
import {
  GoogleMap,
  OverlayView,
  Polygon,
  useJsApiLoader,
} from '@react-google-maps/api';
import { googleMapsLoaderOptions } from '../../lib/googleMaps';
import { useInstitution } from '../InstitutionContext';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../components/Toast';
import { apiFetch } from '../../lib/api';
import { getDialCode } from '../../lib/countries';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import TwoFactorToggleModal from '../../components/TwoFactorToggleModal';

const containerStyle = { width: '100%', height: '100%' };

export default function InstitutionSettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { institution, loading, refresh } = useInstitution();
  const { isLoaded, loadError } = useJsApiLoader(googleMapsLoaderOptions);
  const [editingContacts, setEditingContacts] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [numbers, setNumbers] = useState([]);
  const [emails, setEmails] = useState([]);
  const [savingContacts, setSavingContacts] = useState(false);

  // Reset local edit buffers whenever the institution data refreshes
  useEffect(() => {
    if (institution) {
      setNumbers(
        institution.responseNumbers?.length ? institution.responseNumbers : ['']
      );
      setEmails(
        institution.responseEmails?.length ? institution.responseEmails : ['']
      );
    }
  }, [institution]);

  const dialCode = institution ? getDialCode(institution.country) : null;

  function startContactsEdit() {
    setNumbers(
      institution.responseNumbers?.length
        ? institution.responseNumbers.map((n) =>
            // strip the country code so the user only edits the local part
            dialCode && n.startsWith(`+${dialCode}`)
              ? n.slice(dialCode.length + 1)
              : n
          )
        : ['']
    );
    setEmails(
      institution.responseEmails?.length ? institution.responseEmails : ['']
    );
    setEditingContacts(true);
  }

  function cancelContactsEdit() {
    setEditingContacts(false);
  }

  async function saveContacts() {
    setSavingContacts(true);
    try {
      const cleanedNumbers = numbers
        .filter((n) => n && n.trim())
        .map((n) =>
          dialCode ? `+${dialCode}${n.replace(/\D/g, '')}` : n.trim()
        );
      const cleanedEmails = emails.map((e) => e.trim()).filter(Boolean);
      if (cleanedEmails.length === 0) {
        toast('Add at least one response email', { variant: 'error' });
        return;
      }
      const res = await apiFetch('/institutions/me',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            responseNumbers: cleanedNumbers,
            responseEmails: cleanedEmails,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Failed to save contacts', { variant: 'error' });
        return;
      }
      toast('Contacts updated');
      setEditingContacts(false);
      refresh();
    } finally {
      setSavingContacts(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Loading…
      </div>
    );
  }
  if (!institution) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Could not load institution.
      </div>
    );
  }

  const center = { lat: institution.centerLat, lng: institution.centerLng };
  const polygon = institution.coveragePolygon || [];

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red">
        Account
      </p>
      <h1 className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">
        Settings
      </h1>
      <p className="mt-1 text-sm text-muted">
        Institution profile, response channels, and coverage area.
      </p>

      <div className="mt-6 mb-5 rounded-card border border-navy-100 bg-white px-5 py-4 shadow-spaers-sm">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-navy" />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">
            Security
          </h2>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-btn border border-navy-100 bg-navy-50 px-3 py-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                Password
              </p>
              <p className="text-sm text-navy-600">••••••••</p>
            </div>
            <button
              type="button"
              onClick={() => setShowChangePassword(true)}
              className="rounded-btn bg-navy px-3 py-1.5 text-sm font-bold text-white shadow-spaers-sm transition-colors hover:bg-navy-700"
            >
              Change password
            </button>
          </div>
          <div className="flex items-center justify-between rounded-btn border border-navy-100 bg-navy-50 px-3 py-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                Two-factor auth
              </p>
              <p
                className={`text-sm font-medium ${
                  institution.twoFactorEnabled
                    ? 'text-teal-dark'
                    : 'text-muted'
                }`}
              >
                {institution.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTwoFactor(true)}
              className="rounded-btn border border-navy-100 bg-white px-3 py-1.5 text-xs font-semibold text-navy-600 transition-colors hover:border-red hover:text-red"
            >
              {institution.twoFactorEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Left: institution info */}
        <section className="flex h-full flex-col overflow-hidden rounded-card border border-navy-100 bg-white shadow-spaers-sm">
          <header className="flex items-center justify-between border-b border-navy-50 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red" />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">
                Institution
              </h2>
            </div>
            {editingContacts ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelContactsEdit}
                  className="rounded-btn border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveContacts}
                  disabled={savingContacts}
                  className="rounded-btn bg-red px-3 py-1.5 text-xs font-bold text-white shadow-spaers-sm transition hover:bg-red-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingContacts ? 'Saving…' : 'Save'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startContactsEdit}
                className="rounded-btn bg-navy px-3 py-1.5 text-sm font-bold text-white shadow-spaers-sm transition-colors hover:bg-navy-700"
              >
                Edit contacts
              </button>
            )}
          </header>
          <div className="grid flex-1 grid-cols-1 gap-px bg-navy-50">
            <Tile label="Name" value={institution.name} />
            <Tile label="Type" value={institution.type} />
            <Tile label="Year established" value={institution.yearEstablished || '—'} />
            <Tile label="Country" value={institution.country} />
            <Tile label="Address" value={institution.address} />

            {/* Response numbers — editable */}
            <div className="bg-white px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-300">
                Response numbers
              </p>
              {editingContacts ? (
                <DynamicList
                  values={numbers}
                  onChange={setNumbers}
                  type="tel"
                  prefix={dialCode ? `+${dialCode}` : null}
                  placeholder={dialCode ? '700 000 000' : ''}
                />
              ) : (
                <p className="mt-1 text-sm font-medium text-navy">
                  {(institution.responseNumbers || []).join(', ') || '—'}
                </p>
              )}
            </div>

            {/* Response emails — editable */}
            <div className="bg-white px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-300">
                Response emails
              </p>
              {editingContacts ? (
                <DynamicList
                  values={emails}
                  onChange={setEmails}
                  type="email"
                  placeholder="dispatch@example.org"
                />
              ) : (
                <p className="mt-1 text-sm font-medium text-navy">
                  {(institution.responseEmails || []).join(', ') || '—'}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Right: coverage map + Edit */}
        <section className="flex flex-col overflow-hidden rounded-card border border-navy-100 bg-white shadow-spaers-sm">
          <header className="flex items-center justify-between border-b border-navy-50 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal" />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">
                Coverage
              </h2>
            </div>
          </header>
          <div>
            <div className="h-[360px] w-full">
              {!isLoaded ? (
                <div className="flex h-full w-full items-center justify-center bg-navy-50 text-sm text-muted">
                  {loadError ? 'Failed to load map.' : 'Loading map…'}
                </div>
              ) : (
                <GoogleMap
                  mapContainerStyle={containerStyle}
                  center={center}
                  zoom={13}
                  options={{
                    mapTypeId: 'roadmap',
                    disableDefaultUI: true,
                    zoomControl: true,
                    clickableIcons: false,
                  }}
                >
                  {polygon.length > 0 && (
                    <Polygon
                      paths={polygon}
                      options={{
                        fillColor: '#E63946',
                        fillOpacity: 0.16,
                        strokeColor: '#C1121F',
                        strokeOpacity: 0.95,
                        strokeWeight: 2,
                        clickable: false,
                      }}
                    />
                  )}
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
                      {/* Pinging ring behind — teal */}
                      <span
                        className="absolute inset-0 animate-location-ping rounded-full"
                        style={{ backgroundColor: '#2A9D8F' }}
                      />
                      {/* Fixed 20 px core — teal */}
                      <span
                        className="absolute inset-0 rounded-full"
                        style={{
                          backgroundColor: '#2A9D8F',
                          border: '2px solid #1F7A6F',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                        }}
                      />
                    </div>
                  </OverlayView>
                </GoogleMap>
              )}
            </div>
          </div>
        </section>
      </div>

      {showChangePassword && (
        <ChangePasswordModal
          role="institution"
          email={user.email}
          onClose={() => setShowChangePassword(false)}
        />
      )}
      {showTwoFactor && (
        <TwoFactorToggleModal
          currentlyEnabled={!!institution.twoFactorEnabled}
          onClose={() => setShowTwoFactor(false)}
          onChanged={() => refresh()}
        />
      )}
    </div>
  );
}

function DynamicList({ values, onChange, type, prefix, placeholder }) {
  function update(idx, v) {
    onChange(values.map((x, i) => (i === idx ? v : x)));
  }
  function add() {
    onChange([...values, '']);
  }
  function remove(idx) {
    onChange(values.filter((_, i) => i !== idx));
  }
  return (
    <div className="mt-2 space-y-2">
      {values.map((value, idx) => (
        <div key={idx} className="flex gap-2">
          <div className="flex flex-1 items-stretch overflow-hidden rounded-btn border border-navy-100 bg-white transition-colors focus-within:border-red">
            {prefix && (
              <span className="flex items-center border-r border-navy-100 bg-navy-50 px-2 text-xs font-medium text-navy-600">
                {prefix}
              </span>
            )}
            <input
              type={type}
              value={value}
              onChange={(e) => update(idx, e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent px-2 py-1.5 text-sm text-navy outline-none"
            />
          </div>
          {values.length > 1 && (
            <button
              type="button"
              onClick={() => remove(idx)}
              className="rounded-btn border border-navy-100 px-2 text-sm text-muted hover:border-red hover:text-red"
              aria-label="Remove"
            >
              −
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 text-xs font-semibold text-red hover:underline"
      >
        + Add another
      </button>
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-300">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-navy">{value}</p>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import {
  mapBackendStatus,
  PriorityChip,
  StatusChip,
} from '../../components/IncidentChips';
import { timeAgo } from '../../lib/timeAgo';

// Institution-side history — read-only log of every emergency this institution
// handled. Mirrors the design of the citizen History tab so the system feels
// consistent across roles. Clicking a row opens a deeper-detail modal that
// surfaces dispatch info (response time, dispatcher, mode).

export default function HistoryPage() {
  const { user } = useAuth();
  const [emergencies, setEmergencies] = useState(null);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch('/emergencies/history');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not load history');
        setEmergencies([]);
        return;
      }
      setEmergencies(Array.isArray(data.emergencies) ? data.emergencies : []);
    } catch (e) {
      console.error('Load history failed:', e);
      setError('Network error');
      setEmergencies([]);
    }
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    load();
  }, [user?.email, load]);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="max-w-4xl">
        {/* Header */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red">
          Audit log
        </p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight text-navy sm:text-3xl">
          History
        </h1>
        <p className="mt-1 text-sm text-muted">
          An automatic record of every incident your institution touched —
          SOS presses and citizen-filed reports alike.
        </p>

        {/* Body */}
        <div className="mt-6">
          {emergencies === null ? (
            <div className="rounded-card border border-navy-100 bg-white p-6 text-sm text-muted">
              Loading…
            </div>
          ) : emergencies.length === 0 ? (
            <div className="rounded-card border border-dashed border-navy-100 bg-white p-8 text-center">
              <p className="text-sm font-semibold text-navy">
                No history yet.
              </p>
              {error && (
                <p className="mt-3 text-xs text-rose-700">{error}</p>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {emergencies.map((e) => (
                <HistoryCard
                  key={e.id}
                  emergency={e}
                  onOpen={() => setDetails(e)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {details && (
        <DetailsModal item={details} onClose={() => setDetails(null)} />
      )}
    </div>
  );
}

function HistoryCard({ emergency, onOpen }) {
  const status = mapBackendStatus(emergency.status);
  const dispatcher = emergency.dispatches?.[0]?.dispatcher;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="block w-full overflow-hidden rounded-card border border-navy-100 border-l-4 border-l-navy bg-white p-4 text-left shadow-spaers-sm transition-all hover:border-red hover:border-l-navy hover:shadow-spaers-md focus:border-red focus:border-l-navy focus:outline-none"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-navy">{emergency.type}</h3>
          {emergency.priority && (
            <PriorityChip priority={emergency.priority} />
          )}
          <StatusChip status={status} />
          {emergency.anonymous && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-navy-300">
              anon
            </span>
          )}
        </div>

        <p className="mt-1 text-xs text-muted">
          {timeAgo(emergency.createdAt)}
        </p>

        {emergency.notes && (
          <p className="mt-2 text-sm leading-relaxed text-navy-700">
            {emergency.notes}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {emergency.address && (
            <span className="min-w-0 truncate">{emergency.address}</span>
          )}
          {dispatcher && (
            <span>{dispatcher.name}</span>
          )}
        </div>
      </button>
    </li>
  );
}

function DetailsModal({ item, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dispatch = item.dispatches?.[0];
  const responseSec = dispatch?.startedAt
    ? Math.round(
        (new Date(dispatch.startedAt).getTime() -
          new Date(item.createdAt).getTime()) /
          1000
      )
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-card border border-navy-100 bg-white shadow-spaers-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-navy-100 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red">
              Incident
            </p>
            <h3 className="mt-1 text-base font-extrabold text-navy">
              {item.type}
            </h3>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-navy-300">
              {item.status} · {new Date(item.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-navy-300 transition-colors hover:text-navy-600"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-1 gap-px bg-navy-50">
          <Tile
            label="Victim location"
            value={`${item.victimLat.toFixed(5)}, ${item.victimLng.toFixed(5)}`}
          />
          <Tile
            label="Created"
            value={new Date(item.createdAt).toLocaleString()}
          />
          {item.resolvedAt && (
            <Tile
              label="Resolved"
              value={new Date(item.resolvedAt).toLocaleString()}
            />
          )}
          {dispatch && (
            <>
              <Tile label="Dispatcher" value={dispatch.dispatcher?.name || '—'} />
              <Tile
                label="Dispatcher ID"
                value={dispatch.dispatcher?.dispatcherId || '—'}
              />
              <Tile label="Mode" value={dispatch.dispatcher?.mode || '—'} />
              {dispatch.startedAt && (
                <Tile
                  label="Started"
                  value={new Date(dispatch.startedAt).toLocaleString()}
                />
              )}
              {responseSec != null && (
                <Tile label="Response time" value={`${responseSec}s`} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="bg-white px-5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-300">
        {label}
      </p>
      <p className="mt-1 text-sm text-navy">{value}</p>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  mapBackendStatus,
  PanicTag,
  PriorityChip,
  StatusChip,
} from './IncidentChips';
import { apiFetch, API_URL } from '../lib/api';
import { useToast } from './Toast';
import { timeAgo } from '../lib/timeAgo';

// Slim, in-context Incident Command panel for the institution Emergency tab.
// Pulls from /api/emergencies/incidents (same endpoint as the full
// /institution/incidents page) and surfaces the high-level numbers + filterable
// list. The dedicated /incidents page remains the place for dispatcher
// assignment, media viewing, and other deep actions.
//
// Modal opens animated from the bottom-center FAB on the Emergency page —
// transform-origin: bottom center, scale-up, opacity fade.

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'inProgress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
];

const PRIORITY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const TERMINAL = new Set(['resolved', 'cancelled', 'expired']);

export default function IncidentCommandModal({ open, onClose }) {
  const toast = useToast();
  const [incidents, setIncidents] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  // When set, the modal swaps the list for a detail view of this incident.
  const [selectedId, setSelectedId] = useState(null);
  // Dispatcher pool — loaded once per open. Used by the "Assign dispatcher"
  // action in the detail view.
  const [dispatchers, setDispatchers] = useState([]);
  // Per-incident action flight (so we can disable buttons mid-flight).
  const [busyAction, setBusyAction] = useState(null); // null | 'resolve' | 'assign'

  const load = useCallback(async () => {
    setError(null);
    let rows = [];
    try {
      const res = await apiFetch('/emergencies/incidents');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not load incidents');
      } else {
        rows = Array.isArray(data.emergencies) ? data.emergencies : [];
      }
    } catch (e) {
      console.error('Load incidents failed:', e);
      setError('Network error');
    }
    setIncidents(rows);
  }, []);

  // Fetch each time the modal opens; close = no background polling.
  // Also reset the detail view so reopening starts on the list.
  useEffect(() => {
    if (open) {
      setSelectedId(null);
      setBusyAction(null);
      load();
      // Lazy-load dispatchers in the background; we only need them once the
      // user actually drills into a card.
      (async () => {
        try {
          const res = await apiFetch('/dispatchers');
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            setDispatchers(
              Array.isArray(data.dispatchers) ? data.dispatchers : []
            );
          }
        } catch {
          /* swallow — dispatchers list isn't critical to the panel */
        }
      })();
    }
  }, [open, load]);

  // Escape: pop the detail view first, then close the modal.
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key !== 'Escape') return;
      if (selectedId) setSelectedId(null);
      else onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, selectedId]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  // Filter
  const filtered = useMemo(() => {
    if (!incidents) return null;
    return incidents.filter((i) => {
      if (statusFilter !== 'all') {
        if (mapBackendStatus(i.status) !== statusFilter) return false;
      }
      if (priorityFilter !== 'all') {
        if (i.priority !== priorityFilter) return false;
      }
      return true;
    });
  }, [incidents, statusFilter, priorityFilter]);

  // Resolve the currently-selected incident object for the detail view.
  const selectedIncident = useMemo(
    () => incidents?.find((i) => i.id === selectedId) || null,
    [incidents, selectedId]
  );

  // ────────── Action handlers ──────────

  async function handleResolve(inc) {
    if (!inc) return;
    if (
      !confirm(
        'Mark this incident resolved? Dispatchers en route will be told to stand down.'
      )
    ) {
      return;
    }
    setBusyAction('resolve');
    try {
      const res = await apiFetch(`/emergencies/${inc.id}/resolve`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Could not resolve', { variant: 'error' });
        return;
      }
      toast('Incident resolved');
      // Patch the row locally so the UI matches before the socket event lands.
      setIncidents((prev) =>
        (prev || []).map((i) =>
          i.id === inc.id ? { ...i, status: 'resolved' } : i
        )
      );
      setSelectedId(null);
    } catch (err) {
      console.error('Resolve failed:', err);
      toast('Network error', { variant: 'error' });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAssign(inc, dispatcherId) {
    if (!inc || !dispatcherId) return;
    setBusyAction('assign');
    try {
      // 1) mint admin token for this incident
      const tokenRes = await apiFetch(
        `/emergencies/${inc.id}/admin-token`,
        { method: 'POST' }
      );
      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) {
        toast(tokenData.error || 'Could not open dispatch', {
          variant: 'error',
        });
        return;
      }
      // 2) hit the public dispatch endpoint with the chosen dispatcher
      const dispatchRes = await fetch(
        `${API_URL}/public/e/${tokenData.token}/dispatch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dispatcherId }),
        }
      );
      const dispatchData = await dispatchRes.json().catch(() => ({}));
      if (!dispatchRes.ok) {
        toast(dispatchData.error || 'Dispatch failed', { variant: 'error' });
        return;
      }
      toast('Dispatcher assigned');
      // Re-load so the assigned dispatcher chip appears.
      await load();
    } catch (err) {
      console.error('Assign dispatcher failed:', err);
      toast('Network error', { variant: 'error' });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      {/* Scrim */}
      <div
        className={[
          'fixed inset-0 z-40 bg-navy/40 transition-opacity duration-200',
          open
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal — originates from the bottom-center FAB. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-command-title"
        className={[
          'fixed bottom-24 left-1/2 z-50 flex max-h-[calc(100dvh-8rem)] w-[calc(100vw-3rem)] max-w-3xl -translate-x-1/2 origin-bottom flex-col overflow-hidden rounded-card border border-navy-100 bg-white shadow-spaers-lg transition-all duration-200 ease-out md:left-[calc(50%+8rem)] md:w-[calc(100vw-19rem)]',
          open
            ? 'pointer-events-auto scale-100 opacity-100'
            : 'pointer-events-none scale-0 opacity-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-navy-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red">
              Incident Command
            </p>
            <h2
              id="incident-command-title"
              className="mt-1 text-xl font-extrabold tracking-tight text-navy"
            >
              Real-time emergency management
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh"
              title="Refresh"
              className="flex h-8 w-8 items-center justify-center rounded-btn text-navy-600 transition-colors hover:bg-navy-50 hover:text-navy disabled:opacity-50"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={refreshing ? 'animate-spin' : ''}
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-btn text-muted transition-colors hover:bg-navy-50 hover:text-navy"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {/* Filters */}
          <FilterRow
            title="Filter by status"
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <FilterRow
            title="Filter by priority"
            options={PRIORITY_FILTERS}
            value={priorityFilter}
            onChange={setPriorityFilter}
          />

          {/* List or Detail */}
          {selectedIncident ? (
            <IncidentDetail
              incident={selectedIncident}
              dispatchers={dispatchers}
              busyAction={busyAction}
              onBack={() => setSelectedId(null)}
              onResolve={() => handleResolve(selectedIncident)}
              onAssign={(dispatcherId) =>
                handleAssign(selectedIncident, dispatcherId)
              }
            />
          ) : (
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                {(filtered?.length ?? 0)} incident{(filtered?.length ?? 0) === 1 ? '' : 's'} found
              </p>

              {filtered === null ? (
                <div className="rounded-card border border-navy-100 bg-white p-6 text-sm text-muted">
                  Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-card border border-dashed border-navy-100 bg-white p-8 text-center">
                  <p className="text-sm font-semibold text-navy">
                    No incidents in your coverage yet.
                  </p>
                  {error && (
                    <p className="mt-2 text-xs text-rose-700">{error}</p>
                  )}
                </div>
              ) : (
                <ul className="space-y-3">
                  {filtered.map((inc) => (
                    <IncidentRow
                      key={inc.id}
                      incident={inc}
                      onOpen={() => setSelectedId(inc.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function FilterRow({ title, options, value, onChange }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const isActive = value === o.value;
          return (
            <button
              key={o.label}
              type="button"
              onClick={() => onChange(o.value)}
              className={[
                'rounded-btn border px-3 py-1 text-xs font-semibold transition-colors',
                isActive
                  ? 'border-transparent bg-red text-white shadow-spaers-sm'
                  : 'border-navy-100 bg-white text-navy-600 hover:border-red hover:text-red',
              ].join(' ')}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IncidentRow({ incident, onOpen }) {
  const status = mapBackendStatus(incident.status);
  const isPanic = incident.source === 'sos_panic';
  const attachmentCount = incident.attachments?.length ?? 0;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="block w-full rounded-card border border-navy-100 bg-white p-4 text-left shadow-spaers-sm transition-all hover:border-red hover:shadow-spaers-md focus:border-red focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {isPanic && <PanicTag />}
            <h3 className="text-sm font-bold text-navy">{incident.type}</h3>
            {incident.priority && <PriorityChip priority={incident.priority} />}
          </div>
          <StatusChip status={status} />
        </div>
        <p className="mt-0.5 text-xs text-muted">{timeAgo(incident.createdAt)}</p>
        {incident.notes && (
          <p className="mt-2 truncate text-xs text-navy-600">{incident.notes}</p>
        )}
        <div className="mt-1 flex items-center justify-between gap-3">
          {incident.address ? (
            <p className="truncate text-[11px] text-navy-300">
              {incident.address}
            </p>
          ) : (
            <span />
          )}
          {attachmentCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-semibold text-navy-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              {attachmentCount}
            </span>
          )}
        </div>
      </button>
    </li>
  );
}

function IncidentDetail({
  incident,
  dispatchers = [],
  busyAction,
  onBack,
  onResolve,
  onAssign,
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [pickedDispatcherId, setPickedDispatcherId] = useState('');
  const status = mapBackendStatus(incident.status);
  const isPanic = incident.source === 'sos_panic';
  const attachments = incident.attachments || [];
  const isTerminal = TERMINAL.has(incident.status);
  const isResolving = busyAction === 'resolve';
  const isAssigning = busyAction === 'assign';

  // Reset the inline picker whenever we open a different incident.
  useEffect(() => {
    setAssignOpen(false);
    setPickedDispatcherId('');
  }, [incident.id]);

  function submitAssign(e) {
    e.preventDefault();
    if (!pickedDispatcherId) return;
    onAssign?.(pickedDispatcherId);
    setAssignOpen(false);
    setPickedDispatcherId('');
  }

  return (
    <div className="mt-3 space-y-5 pb-4">
      {/* Back row */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-btn px-2 py-1 text-xs font-semibold text-navy-600 transition-colors hover:bg-navy-50 hover:text-navy"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to incidents
        </button>
      </div>

      {/* Headline */}
      <div className="rounded-card border border-navy-100 bg-white p-5 shadow-spaers-sm">
        <div className="flex flex-wrap items-center gap-2">
          {isPanic && <PanicTag />}
          <h3 className="text-lg font-extrabold tracking-tight text-navy">
            {incident.type}
          </h3>
          {incident.priority && <PriorityChip priority={incident.priority} />}
          <StatusChip status={status} />
        </div>
        <p className="mt-1 text-xs text-muted">
          {new Date(incident.createdAt).toLocaleString()} ·{' '}
          {timeAgo(incident.createdAt)}
        </p>
        {incident.notes && (
          <p className="mt-3 text-sm leading-relaxed text-navy-600">
            {incident.notes}
          </p>
        )}
        {incident.address && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {incident.address}
          </p>
        )}
      </div>

      {/* Attachments */}
      <div className="rounded-card border border-navy-100 bg-white p-5 shadow-spaers-sm">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          Evidence ({attachments.length})
        </p>
        {attachments.length === 0 ? (
          <p className="text-xs text-muted">No media attached to this incident.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {attachments.map((a) => (
              <AttachmentCard key={a.id} attachment={a} />
            ))}
          </div>
        )}
      </div>

      {/* Action buttons — sit at the end of the content flow, scroll with it */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onResolve}
          disabled={isTerminal || isResolving || isAssigning}
          className="inline-flex items-center justify-center gap-2 rounded-btn bg-navy px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-spaers-sm transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {isResolving ? 'Resolving…' : isTerminal ? 'Resolved' : 'Mark resolved'}
        </button>
        <button
          type="button"
          onClick={() => setAssignOpen((o) => !o)}
          disabled={isTerminal || isResolving || isAssigning}
          aria-expanded={assignOpen}
          className="inline-flex items-center justify-center gap-2 rounded-btn bg-red px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-spaers-sm transition-colors hover:bg-red-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {isAssigning ? 'Assigning…' : 'Assign dispatcher'}
        </button>
      </div>

      {/* Inline dispatcher picker — expands below the action row */}
      {assignOpen && (
        <form
          onSubmit={submitAssign}
          className="rounded-card border border-red/30 bg-red/5 p-4"
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-red">
            Pick a dispatcher
          </p>
          {dispatchers.length === 0 ? (
            <p className="text-xs text-navy-600">
              No dispatchers on file. Add one in{' '}
              <span className="font-semibold text-navy">Dispatchers</span> first.
            </p>
          ) : (
            <>
              <select
                value={pickedDispatcherId}
                onChange={(e) => setPickedDispatcherId(e.target.value)}
                className="w-full rounded-btn border border-navy-100 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-red"
                required
              >
                <option value="" disabled>
                  Select a dispatcher…
                </option>
                {dispatchers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.dispatcherId ? ` · ${d.dispatcherId}` : ''}
                    {d.mode ? ` · ${d.mode}` : ''}
                  </option>
                ))}
              </select>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssignOpen(false)}
                  className="rounded-btn border border-navy-100 bg-white px-3 py-1.5 text-xs font-semibold text-navy-600 hover:border-red hover:text-red"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!pickedDispatcherId || isAssigning}
                  className="rounded-btn bg-red px-3 py-1.5 text-xs font-bold text-white shadow-spaers-sm hover:bg-red-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAssigning ? 'Assigning…' : 'Confirm assignment'}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
}

function AttachmentCard({ attachment }) {
  const isVideo = attachment.mediaType === 'video';
  const src = attachment.previewUrl;
  return (
    <div className="group relative overflow-hidden rounded-btn border border-navy-100 bg-navy-50">
      <div className="aspect-video w-full">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={attachment.originalName || (isVideo ? 'Video preview' : 'Image attachment')}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-navy-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>
      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
        <span
          className={[
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
            isVideo
              ? 'bg-rose-600 text-white'
              : 'bg-navy text-white',
          ].join(' ')}
        >
          {isVideo ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
          {isVideo ? 'Video' : 'Image'}
        </span>
      </div>
    </div>
  );
}

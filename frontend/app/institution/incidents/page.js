'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  mapBackendStatus,
  PanicTag,
  PriorityChip,
  StatusChip,
} from '../../components/IncidentChips';
import { apiFetch, API_URL } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getSocket } from '../../lib/socket';
import { timeAgo } from '../../lib/timeAgo';
import { getSignedDownloadUrl } from '../../lib/uploads';

// "Incident Command" — responder feed of every emergency in this institution's
// coverage polygon. Filterable by status and priority on the client. Subscribes
// to the same socket stream as the institution dashboard so new incidents,
// dispatch updates, and resolutions appear without a poll round-trip. Can be
// re-fetched on demand via the refresh button.

const STATUS_FILTERS = [
  { value: null, label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'inProgress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
];

const PRIORITY_FILTERS = [
  { value: null, label: 'All' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function IncidentCommandPage() {
  const toast = useToast();
  const [incidents, setIncidents] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState(null);
  const [dispatchers, setDispatchers] = useState([]);
  // The card we're currently assigning a dispatcher for; null when no modal.
  const [assignFor, setAssignFor] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadRef = useRef(null);
  // The attachment currently displayed in the full-size media modal; null = closed.
  const [viewingMedia, setViewingMedia] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch('/emergencies/incidents');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not load incidents');
        setIncidents([]);
        return;
      }
      setIncidents(Array.isArray(data.emergencies) ? data.emergencies : []);
    } catch (e) {
      setError('Network error');
      setIncidents([]);
    }
  }, []);

  // Keep a stable ref to the latest `load` so the socket effect can call it
  // on `emergency:resolved` without re-subscribing every time `load` changes.
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  // Initial fetch.
  useEffect(() => {
    load();
  }, [load]);

  // Dispatcher list — fetched once. Used by the assign-dispatcher modal so
  // we don't have to round-trip every time the responder opens it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/dispatchers');
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) {
          setDispatchers(Array.isArray(data.dispatchers) ? data.dispatchers : []);
        }
      } catch (_) {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function assignDispatcher(incident, dispatcherId) {
    // Two-step flow that matches the legacy emergency dashboard:
    //   1. Mint a short-lived institution token scoped to this emergency.
    //   2. POST it to the unauthenticated public dispatch endpoint with the
    //      chosen dispatcherId. The server records the dispatch, flips the
    //      emergency to 'dispatched', notifies the dispatcher, and broadcasts
    //      `emergency:updated` so this card refreshes via the socket.
    try {
      const tokenRes = await apiFetch(
        `/emergencies/${incident.id}/admin-token`,
        { method: 'POST' }
      );
      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) {
        toast(tokenData.error || 'Could not open dispatch', {
          variant: 'error',
        });
        return false;
      }
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
        return false;
      }
      toast('Dispatcher assigned');
      return true;
    } catch (err) {
      console.error('Assign dispatcher failed:', err);
      toast('Network error', { variant: 'error' });
      return false;
    }
  }

  // ─── Live institution feed via socket.io ───
  // New incidents appear instantly. Updates patch in place. On a resolve/
  // cancel event we refetch the row's authoritative state instead of guessing
  // because the resolve event payload only carries an emergency id.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function doSubscribe() {
      socket.emit('subscribe:institution', null, () => {});
    }
    function onCreated(e) {
      if (!e?.id) return;
      setIncidents((cur) => {
        const list = cur || [];
        if (list.find((x) => x.id === e.id)) return list;
        return [e, ...list];
      });
    }
    function onUpdated(e) {
      if (!e?.id) return;
      setIncidents((cur) => {
        const list = cur || [];
        const idx = list.findIndex((x) => x.id === e.id);
        if (idx === -1) return [e, ...list]; // out-of-order arrival
        const next = list.slice();
        next[idx] = e;
        return next;
      });
    }
    function onResolved({ emergencyId } = {}) {
      if (!emergencyId) return;
      // Refetch so the row picks up its actual terminal state (resolved
      // vs cancelled vs expired) and any dispatcher info written at close.
      loadRef.current?.();
    }

    if (socket.connected) doSubscribe();
    socket.on('connect', doSubscribe);
    socket.on('emergency:created', onCreated);
    socket.on('emergency:updated', onUpdated);
    socket.on('emergency:resolved', onResolved);

    return () => {
      socket.off('connect', doSubscribe);
      socket.off('emergency:created', onCreated);
      socket.off('emergency:updated', onUpdated);
      socket.off('emergency:resolved', onResolved);
      socket.emit('unsubscribe:institution', null, () => {});
    };
  }, []);

  async function manualRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const all = incidents || [];
  const total = all.length;
  const active = all.filter(
    (i) => i.status === 'active' || i.status === 'dispatched'
  ).length;
  const critical = all.filter((i) => i.priority === 'critical').length;
  const pending = all.filter((i) => i.status === 'active').length;

  const filtered = useMemo(() => {
    return all.filter((i) => {
      if (statusFilter && mapBackendStatus(i.status) !== statusFilter) {
        return false;
      }
      if (priorityFilter && i.priority !== priorityFilter) return false;
      return true;
    });
  }, [all, statusFilter, priorityFilter]);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="max-w-5xl">
        {/* Header + refresh */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">
              Incident Command
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Real-time emergency management
            </p>
          </div>
          <button
            type="button"
            onClick={manualRefresh}
            aria-label="Refresh"
            disabled={refreshing}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-brand hover:text-brand disabled:opacity-60"
          >
            <svg
              width="18"
              height="18"
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
        </div>

        <div className="my-6 h-px bg-slate-200" />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total" value={total} />
          <StatTile label="Active" value={active} accent="text-brand" />
          <StatTile
            label="Critical"
            value={critical}
            accent="text-brand"
            highlight={critical > 0}
          />
          <StatTile
            label="Pending"
            value={pending}
            accent="text-amber-800"
          />
        </div>

        {/* Filters */}
        <div className="mt-7">
          <FilterLabel>Filter by status</FilterLabel>
          <FilterRow
            options={STATUS_FILTERS}
            current={statusFilter}
            onSelect={setStatusFilter}
          />
        </div>
        <div className="mt-5">
          <FilterLabel>Filter by priority</FilterLabel>
          <FilterRow
            options={PRIORITY_FILTERS}
            current={priorityFilter}
            onSelect={setPriorityFilter}
          />
        </div>

        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
          {filtered.length} incident{filtered.length === 1 ? '' : 's'} found
        </p>

        {/* Body */}
        <div className="mt-3">
          {incidents === null ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                {total === 0
                  ? 'No incidents in your coverage yet.'
                  : 'No incidents match these filters.'}
              </p>
              {error && (
                <p className="mt-3 text-xs text-rose-700">{error}</p>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((i) => (
                <li key={i.id}>
                  <IncidentCard
                    incident={i}
                    canAssign={
                      i.status === 'active' && dispatchers.length > 0
                    }
                    onAssign={() => setAssignFor(i)}
                    onViewMedia={(att) => setViewingMedia(att)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {assignFor && (
        <AssignDispatcherModal
          incident={assignFor}
          dispatchers={dispatchers}
          onClose={() => setAssignFor(null)}
          onAssign={async (dispatcherId) => {
            const ok = await assignDispatcher(assignFor, dispatcherId);
            if (ok) setAssignFor(null);
            return ok;
          }}
        />
      )}

      {viewingMedia && (
        <MediaViewerModal
          attachment={viewingMedia}
          onClose={() => setViewingMedia(null)}
        />
      )}
    </div>
  );
}

function IncidentCard({ incident, canAssign = false, onAssign, onViewMedia }) {
  const isCritical = incident.priority === 'critical';
  const isPanic = incident.source === 'sos_panic';
  const status = mapBackendStatus(incident.status);
  const dispatcherName = incident.dispatches?.[0]?.dispatcher?.name;
  const reporterName = incident.anonymous
    ? 'Anonymous'
    : incident.citizen
      ? `${incident.citizen.firstName || ''} ${incident.citizen.lastName || ''}`.trim()
      : 'Anonymous';

  return (
    <div
      className={`rounded-xl border bg-white p-4 transition sm:p-5 ${
        isCritical
          ? 'border-brand shadow-[0_12px_30px_-12px_rgba(220,38,38,0.35)]'
          : 'border-slate-200 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-slate-900">
            {incident.type}
          </h3>
          {isPanic && <PanicTag />}
        </div>
        {incident.priority && <PriorityChip priority={incident.priority} />}
      </div>
      <p className="mt-0.5 text-xs text-slate-500">
        {timeAgo(incident.createdAt)}
        {' · '}
        <span
          className={
            incident.anonymous ? 'text-slate-400' : 'text-slate-600'
          }
        >
          {reporterName}
        </span>
      </p>
      {incident.notes && (
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {incident.notes}
        </p>
      )}

      {dispatcherName && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span>
            Dispatcher:{' '}
            <span className="font-semibold text-slate-800">
              {dispatcherName}
            </span>
          </span>
        </div>
      )}

      {incident.attachments?.length > 0 && (
        <AttachmentsStrip
          attachments={incident.attachments}
          onView={onViewMedia}
        />
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
          {incident.address ? (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="truncate">{incident.address}</span>
            </>
          ) : (
            <span className="font-mono text-[11px] text-slate-400">
              {Number(incident.victimLat).toFixed(4)},{' '}
              {Number(incident.victimLng).toFixed(4)}
            </span>
          )}
        </div>
        <StatusChip status={status} />
      </div>

      {canAssign && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onAssign}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-brand-dark"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Assign dispatcher
          </button>
        </div>
      )}
    </div>
  );
}

function AssignDispatcherModal({ incident, dispatchers, onClose, onAssign }) {
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  async function confirm() {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      await onAssign(selected);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Assign dispatcher
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {incident.type} · pick a responder to send to this incident.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
          {dispatchers.length === 0 ? (
            <p className="rounded-md bg-slate-50 px-3 py-3 text-xs italic text-slate-500">
              No dispatchers on file. Add one in Dispatchers first.
            </p>
          ) : (
            <ul className="space-y-2">
              {dispatchers.map((d) => {
                const isSelected = selected === d.id;
                return (
                  <li key={d.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition ${
                        isSelected
                          ? 'border-brand bg-red-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="dispatcher"
                        checked={isSelected}
                        onChange={() => setSelected(d.id)}
                        className="h-4 w-4 border-slate-300 text-brand focus:ring-brand"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {d.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          <span className="font-mono uppercase tracking-wider">
                            {d.dispatcherId}
                          </span>{' '}
                          · {d.mode}
                        </p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!selected || submitting}
            className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Send dispatcher'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AttachmentsStrip({ attachments, onView }) {
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto">
      {attachments.map((a) => (
        <AttachmentThumb
          key={a.id}
          attachment={a}
          onClick={() => onView?.(a)}
        />
      ))}
    </div>
  );
}

function AttachmentThumb({ attachment, onClick }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getSignedDownloadUrl(attachment.mediaKey);
      if (!cancelled) setUrl(u);
    })();
    return () => {
      cancelled = true;
    };
  }, [attachment.mediaKey]);
  const isVideo = attachment.mediaType === 'video';
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-900 transition hover:border-brand"
      aria-label={isVideo ? 'Play attached video' : 'Open attached photo'}
    >
      {url ? (
        isVideo ? (
          <>
            <video
              src={url}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="pointer-events-none absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[9px] font-bold uppercase tracking-wider text-white">
              Video
            </span>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={attachment.originalName || 'attachment'}
            className="h-full w-full bg-slate-100 object-cover"
          />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      )}
    </button>
  );
}

// Full-screen modal that plays a video or displays a photo at its native
// size. Click backdrop or Esc to close.
function MediaViewerModal({ attachment, onClose }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getSignedDownloadUrl(attachment.mediaKey);
      if (!cancelled) setUrl(u);
    })();
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      document.removeEventListener('keydown', onKey);
    };
  }, [attachment.mediaKey, onClose]);

  const isVideo = attachment.mediaType === 'video';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        ✕
      </button>
      <div
        className="max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {!url ? (
          <div className="flex h-32 w-64 items-center justify-center rounded-md bg-slate-900 text-sm text-slate-300">
            Loading…
          </div>
        ) : isVideo ? (
          <video
            src={url}
            controls
            autoPlay
            playsInline
            className="max-h-[90vh] max-w-[90vw] rounded-md bg-black"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={attachment.originalName || 'attachment'}
            className="max-h-[90vh] max-w-[90vw] rounded-md object-contain"
          />
        )}
        {attachment.originalName && (
          <p className="mt-3 truncate text-center text-xs text-slate-200">
            {attachment.originalName}
          </p>
        )}
      </div>
    </div>
  );
}

// ── filter primitives ────────────────────────────────────────────────────

function FilterLabel({ children }) {
  return (
    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
      {children}
    </p>
  );
}

function FilterRow({ options, current, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = current === opt.value;
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              isActive
                ? 'border-brand bg-brand text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-brand hover:text-brand'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function StatTile({ label, value, accent = 'text-slate-900', highlight = false }) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        highlight ? 'border-brand' : 'border-slate-200'
      }`}
    >
      <p className={`text-2xl font-extrabold ${accent}`}>{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

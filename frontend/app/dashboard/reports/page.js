'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  mapBackendStatus,
  PanicBanner,
  PriorityChip,
  StatusChip,
} from '../../components/IncidentChips';
import { useToast } from '../../components/Toast';
import { apiFetch } from '../../lib/api';
import { timeAgo } from '../../lib/timeAgo';
import { getSignedDownloadUrl } from '../../lib/uploads';

// History — automatic, read-only record of everything the citizen has put
// into the system: every SOS press and every report filed from the
// Emergency tab. Nothing is created from this page.
//
// Items come from GET /api/emergencies/mine and are tagged by `source`:
//   - 'sos_panic'  → emergency triggered by the SOS button
//   - otherwise    → witness/incident report filed via "File a report"
const TERMINAL = new Set(['resolved', 'cancelled', 'expired']);

export default function HistoryPage() {
  const toast = useToast();
  const [items, setItems] = useState(null); // null = loading, [] = empty
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch('/emergencies/mine');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not load history');
        setItems([]);
        return;
      }
      setItems(Array.isArray(data.emergencies) ? data.emergencies : []);
    } catch (e) {
      console.error('Load history failed:', e);
      setError('Network error');
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function cancelReport(id) {
    if (cancellingId) return;
    if (
      !confirm('Cancel this report? Responders will be told to stand down.')
    ) {
      return;
    }
    setCancellingId(id);
    try {
      const res = await apiFetch(`/emergencies/${id}/cancel`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Could not cancel', { variant: 'error' });
        return;
      }
      toast('Report cancelled');
      await load();
    } finally {
      setCancellingId(null);
    }
  }

  const visible = items;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold leading-tight text-navy sm:text-3xl">
            History
          </h1>
          <p className="mt-1 text-sm text-muted">
            An automatic record of every SOS press and report you&apos;ve
            filed. Nothing is added manually from here.
          </p>
        </div>

        {/* Body */}
        <div className="mt-6">
          {visible === null ? (
            <div className="rounded-card border border-navy-100 bg-white p-6 text-sm text-muted">
              Loading…
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-card border border-dashed border-navy-100 bg-white p-8 text-center">
              <p className="text-sm font-semibold text-navy">
                No history yet.
              </p>
              {error && <p className="mt-3 text-xs text-rose-700">{error}</p>}
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((r) => (
                <HistoryCard
                  key={r.id}
                  report={r}
                  onCancel={() => cancelReport(r.id)}
                  cancelling={cancellingId === r.id}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryCard({ report, onCancel, cancelling }) {
  const status = mapBackendStatus(report.status);
  const isPanic = report.source === 'sos_panic';
  const isCancellable = report.status === 'active';
  return (
    <li className="overflow-hidden rounded-card border border-navy-100 border-l-4 border-l-navy bg-white p-4 shadow-spaers-sm transition-shadow hover:shadow-spaers-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-navy">{report.type}</h3>
          {report.priority && <PriorityChip priority={report.priority} />}
          {report.anonymous && (
            <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.13em] text-navy-600">
              Anonymous
            </span>
          )}
        </div>
        <StatusChip status={status} />
      </div>
      <p className="mt-0.5 text-xs text-muted">
        {timeAgo(report.createdAt)}
      </p>
      {report.notes && (
        <p className="mt-2 text-sm leading-relaxed text-navy-700">
          {report.notes}
        </p>
      )}
      {report.attachments?.length > 0 && (
        <AttachmentsStrip attachments={report.attachments} />
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        {report.address ? (
          <p className="min-w-0 truncate text-xs text-muted">
            {report.address}
          </p>
        ) : (
          <span />
        )}
        {isCancellable && !isPanic && (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 transition-colors hover:text-rose-800 disabled:opacity-60"
          >
            {cancelling ? 'Cancelling…' : 'Cancel report'}
          </button>
        )}
      </div>
    </li>
  );
}

function AttachmentsStrip({ attachments }) {
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto">
      {attachments.map((a) => (
        <AttachmentThumb key={a.id} attachment={a} />
      ))}
    </div>
  );
}

function AttachmentThumb({ attachment }) {
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
  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noreferrer"
      className="block h-16 w-16 shrink-0 overflow-hidden rounded-btn border border-navy-100 bg-navy-50"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={attachment.originalName || 'attachment'}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-navy-300">
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
    </a>
  );
}


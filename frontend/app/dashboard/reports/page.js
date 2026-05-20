'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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

// "My Reports" — citizen-facing list of their own incident reports + SOS
// presses. Pulls from GET /api/emergencies/mine. Active = anything not in
// a terminal state (resolved/cancelled/expired).
const TERMINAL = new Set(['resolved', 'cancelled', 'expired']);

export default function MyReportsPage() {
  const toast = useToast();
  const [reports, setReports] = useState(null); // null = loading, [] = empty
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch('/emergencies/mine');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not load reports');
        setReports([]);
        return;
      }
      setReports(Array.isArray(data.emergencies) ? data.emergencies : []);
    } catch (e) {
      console.error('Load my reports failed:', e);
      setError('Network error');
      setReports([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function cancelReport(id) {
    if (cancellingId) return;
    if (
      !confirm(
        'Cancel this report? Responders will be told to stand down.'
      )
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

  const total = reports?.length ?? 0;
  const active = (reports || []).filter(
    (r) => !TERMINAL.has(r.status)
  ).length;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">
              My Reports
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track the status of your emergency reports
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              aria-label="Refresh"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-brand hover:text-brand"
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
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
            <Link
              href="/dashboard/reports/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
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
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New report
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
          <StatTile label="Total Reports" value={total} />
          <StatTile label="Active" value={active} accent="text-brand" />
        </div>

        {/* Body */}
        <div className="mt-6">
          {reports === null ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Loading…
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                No reports yet.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Trigger an SOS or file a new report to get started.
              </p>
              <Link
                href="/dashboard/reports/new"
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
              >
                + New report
              </Link>
              {error && (
                <p className="mt-3 text-xs text-rose-700">{error}</p>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {reports.map((r) => (
                <ReportCard
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

function ReportCard({ report, onCancel, cancelling }) {
  const status = mapBackendStatus(report.status);
  const isPanic = report.source === 'sos_panic';
  const isCancellable = report.status === 'active';
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-slate-900">{report.type}</h3>
          {report.priority && <PriorityChip priority={report.priority} />}
          {report.anonymous && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.13em] text-slate-600">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
              Anonymous
            </span>
          )}
        </div>
        <StatusChip status={status} />
      </div>
      <p className="mt-0.5 text-xs text-slate-500">
        {timeAgo(report.createdAt)}
      </p>
      {report.notes && (
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {report.notes}
        </p>
      )}
      {isPanic && (
        <div className="mt-3">
          <PanicBanner />
        </div>
      )}
      {report.attachments?.length > 0 && (
        <AttachmentsStrip attachments={report.attachments} />
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        {report.address ? (
          <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
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
            <span className="truncate">{report.address}</span>
          </div>
        ) : (
          <span />
        )}
        {isCancellable && !isPanic && (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 transition hover:text-rose-800 disabled:opacity-60"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
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
      className="block h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={attachment.originalName || 'attachment'}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-400">
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

function StatTile({ label, value, accent = 'text-slate-900' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-extrabold ${accent}`}>{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

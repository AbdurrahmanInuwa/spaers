// Shared incident UI primitives — priority/status pills, PANIC tag, panic
// banner. Used by both citizen "My Reports" and responder "Incident Command".

const PRIORITY_STYLE = {
  critical: {
    bg: 'bg-brand/10',
    fg: 'text-brand',
    dot: 'bg-brand',
    label: 'CRITICAL',
  },
  high: {
    bg: 'bg-rose-50',
    fg: 'text-rose-700',
    dot: 'bg-rose-600',
    label: 'HIGH',
  },
  medium: {
    bg: 'bg-amber-50',
    fg: 'text-amber-800',
    dot: 'bg-amber-500',
    label: 'MEDIUM',
  },
  low: {
    bg: 'bg-slate-100',
    fg: 'text-slate-600',
    dot: 'bg-slate-400',
    label: 'LOW',
  },
};

export function PriorityChip({ priority }) {
  const s = PRIORITY_STYLE[priority] || PRIORITY_STYLE.low;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${s.bg} px-2.5 py-1 text-[10px] font-bold tracking-[0.13em] ${s.fg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}

const STATUS_STYLE = {
  pending: {
    bg: 'bg-amber-50',
    fg: 'text-amber-800',
    label: 'Pending',
  },
  inProgress: {
    bg: 'bg-sky-50',
    fg: 'text-sky-800',
    label: 'In Progress',
  },
  resolved: {
    bg: 'bg-emerald-50',
    fg: 'text-emerald-700',
    label: 'Resolved',
  },
  cancelled: {
    bg: 'bg-slate-100',
    fg: 'text-slate-600',
    label: 'Cancelled',
  },
  expired: {
    bg: 'bg-slate-100',
    fg: 'text-slate-500',
    label: 'Expired',
  },
};

// Maps the backend's raw `Emergency.status` enum onto the display tier
// used by My Reports / Incident Command.
export function mapBackendStatus(raw) {
  switch (raw) {
    case 'active':
      return 'pending';
    case 'dispatched':
      return 'inProgress';
    case 'resolved':
      return 'resolved';
    case 'cancelled':
      return 'cancelled';
    case 'expired':
      return 'expired';
    default:
      return 'pending';
  }
}

export function StatusChip({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span
      className={`inline-flex items-center rounded-full ${s.bg} px-2.5 py-1 text-[11px] font-bold ${s.fg}`}
    >
      {s.label}
    </span>
  );
}

export function PanicTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-brand px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-white">
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
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
      PANIC
    </span>
  );
}

export function PanicBanner() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
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
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      Panic Alert
    </div>
  );
}

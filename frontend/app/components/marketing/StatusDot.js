// Status indicator dot for "dispatch center" UI accents. Matches the
// design spec's three states.
//
//   active   → red, blinking + pulse ring (emergency in progress)
//   safe     → solid teal (resolved / online / OK)
//   offline  → muted slate (no signal)
export default function StatusDot({
  status = 'safe',
  label,
  className = '',
  labelClassName = 'text-navy',
}) {
  const color =
    status === 'active' ? 'bg-red'
    : status === 'safe' ? 'bg-teal'
    : 'bg-navy-200';

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2.5 w-2.5">
        {status === 'active' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red/60" />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color} ${
            status === 'active' ? 'animate-status-blink' : ''
          }`}
        />
      </span>
      {label && (
        <span
          className={`text-micro font-semibold uppercase tracking-[0.12em] ${labelClassName}`}
        >
          {label}
        </span>
      )}
    </span>
  );
}

// Standardized section header: small uppercase eyebrow + H2 title +
// optional muted lead paragraph. Centers by default; pass align="left"
// for split layouts.
export default function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'center',
  className = '',
}) {
  const alignClass = align === 'left' ? 'text-left' : 'text-center';
  return (
    <div className={`${alignClass} ${className}`}>
      {eyebrow && (
        <p className="text-micro font-semibold uppercase tracking-[0.18em] text-red">
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 className="mt-2 text-h2 font-bold text-navy">{title}</h2>
      )}
      {lead && (
        <p
          className={`mt-4 text-body text-muted ${
            align === 'center' ? 'mx-auto max-w-2xl' : ''
          }`}
        >
          {lead}
        </p>
      )}
    </div>
  );
}

import Container from './Container';

// Shared shell for all legal / policy pages so we get consistent
// typography, max-width and "last updated" metadata in one place.
// Children render between the title and a sticky bottom contact strip.
export default function PolicyShell({
  title,
  updatedOn,
  intro,
  children,
}) {
  return (
    <article className="bg-ice pb-section">
      <header className="border-b border-navy-100 bg-white py-section-mobile sm:py-section">
        <Container size="wide">
          <p className="text-micro font-semibold uppercase tracking-[0.18em] text-red">
            Legal
          </p>
          <h1 className="mt-3 text-h1 font-extrabold leading-[1.05] text-navy">
            {title}
          </h1>
          {updatedOn && (
            <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.12em] text-muted">
              Last updated: {updatedOn}
            </p>
          )}
          {intro && (
            <p className="mt-6 max-w-2xl text-body text-muted">{intro}</p>
          )}
        </Container>
      </header>
      <Container size="wide" className="prose prose-slate max-w-4xl py-section-mobile sm:py-section">
        <div className="space-y-10 text-[15px] leading-relaxed text-navy-700 [&_h2]:text-h3 [&_h2]:font-bold [&_h2]:text-navy [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-[18px] [&_h3]:font-semibold [&_h3]:text-navy [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:my-3 [&_ul]:my-4 [&_ul]:pl-6 [&_ul]:space-y-2 [&_ul]:list-disc [&_li]:marker:text-red [&_a]:text-red [&_a]:underline [&_a:hover]:text-red-dark">
          {children}
        </div>
      </Container>
    </article>
  );
}

import Link from 'next/link';
import Container from '../../components/marketing/Container';

export const dynamic = 'force-dynamic';

// Placeholder article shell — populate per-slug content later or wire
// to a CMS / MDX collection.
export default function BlogArticlePage({ params }) {
  const title = (params.slug || '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return (
    <article className="bg-ice pb-section">
      <header className="border-b border-navy-100 bg-white py-section-mobile sm:py-section">
        <Container className="max-w-3xl">
          <Link
            href="/blog"
            className="text-micro font-semibold uppercase tracking-[0.18em] text-red hover:underline"
          >
            ← Back to all articles
          </Link>
          <h1 className="mt-6 text-h1 font-extrabold leading-[1.05] text-navy">
            {title || 'Article'}
          </h1>
          <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.12em] text-muted">
            Coming soon · This article is being written
          </p>
        </Container>
      </header>
      <Container className="max-w-3xl py-section-mobile sm:py-section">
        <div className="rounded-card border border-navy-100 bg-white p-8 text-[15px] leading-relaxed text-navy-700 shadow-spaers-sm">
          <p>
            This article is part of the SPAERS Knowledge Center. Full content
            will be published shortly. In the meantime, browse{' '}
            <Link href="/blog" className="text-red underline">our other articles</Link>{' '}
            or jump into the{' '}
            <Link href="/faq" className="text-red underline">FAQ</Link>.
          </p>
        </div>
      </Container>
    </article>
  );
}

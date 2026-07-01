import Container from '../components/marketing/Container';

export const metadata = {
  title: 'Resources & Blog. SPAERS',
  description: 'Safety knowledge, response tech updates, and SPAERS announcements.',
};

export default function BlogPage() {
  return (
    <>
      <section className="bg-navy py-section-mobile text-white sm:py-section">
        <Container size="wide">
          <p className="text-micro font-semibold uppercase tracking-[0.18em] text-red">
            The Knowledge Center
          </p>
          <h1 className="mt-3 max-w-3xl text-h1 font-extrabold leading-[1.05]">
            Safety, decoded.
          </h1>
          <p className="mt-6 max-w-2xl text-body text-navy-100">
            Guides, frameworks, and product news for individuals, families, and
            public-safety teams.
          </p>
        </Container>
      </section>

      <section className="bg-ice py-section-mobile sm:py-section">
        <Container size="wide">
          <div className="rounded-card border border-dashed border-navy-100 bg-white p-12 text-center shadow-spaers-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red">
              Nothing here yet
            </p>
            <h2 className="mt-3 text-h3 font-semibold text-navy">
              No blog posts yet. Check back later.
            </h2>
          </div>
        </Container>
      </section>
    </>
  );
}

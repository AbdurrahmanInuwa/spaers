import Container from '../components/marketing/Container';
import Card from '../components/marketing/Card';
import SectionHeading from '../components/marketing/SectionHeading';
import Button from '../components/marketing/Button';

export const metadata = {
  title: 'For Users. SPAERS',
  description: 'Protection for every moment of life. Plans for individuals, families, and workplaces.',
};

const AUDIENCES = [
  {
    title: 'Individuals',
    body: 'Solo travelers, hikers, drivers, students. Anyone who walks alone after dark.',
    bullet: [],
  },
  {
    title: 'Families',
    body: 'Protect children getting to school and elderly relatives living alone.',
    bullet: [],
  },
  {
    title: 'Workplace',
    body: 'Remote workers, late-shift staff, lone field crews, high-risk job sites.',
    bullet: [],
  },
];

const FEATURES = [
  { title: 'One-Touch SOS', body: 'Simple enough for a child or a panicked adult. No menus, no confirmation taps in the moment of need.' },
  { title: 'Medical ID', body: 'Pre-load critical medical info, blood group, allergies, conditions, implants, so responders arrive informed.' },
  { title: 'Family Sharing', body: 'Build a family group, loved ones get notified the moment you trigger SOS, with your live location.' },
  { title: 'Pre-Cancel Window', body: 'A 5-second countdown after every press lets you cancel an accidental trigger before help is dispatched.' },
];

export default function ForUsersPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy py-section-mobile text-white sm:py-section">
        <Container size="wide">
          <p className="text-micro font-semibold uppercase tracking-[0.18em] text-red">
            For You · For Your Family
          </p>
          <h1 className="mt-3 max-w-3xl text-h1 font-extrabold leading-[1.05]">
            Protection for every moment of life.
          </h1>
          <p className="mt-6 max-w-2xl text-body text-navy-100">
            SPAERS works whether you&apos;re hiking solo, walking home at night,
            checking on a parent, or running a 200-person field crew.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button intent="primary" size="lg" href="/signup">
              Create Free Account
            </Button>
          </div>
        </Container>
      </section>

      {/* Audiences */}
      <section className="bg-ice py-section-mobile sm:py-section">
        <Container size="wide">
          <SectionHeading
            eyebrow="Who Is It For?"
            title="A safety net that fits your life."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {AUDIENCES.map((a) => (
              <Card key={a.title} hover className="flex flex-col gap-4">
                <h3 className="text-h3 font-semibold text-navy">{a.title}</h3>
                <p className="text-[15px] leading-relaxed text-muted">{a.body}</p>
                <ul className="mt-2 space-y-2 text-[14px] text-navy-700">
                  {a.bullet.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="border-y border-navy-100 bg-white py-section-mobile sm:py-section">
        <Container size="wide">
          <SectionHeading
            eyebrow="Features"
            title="Designed for moments when thinking is hard."
            lead="Every feature exists because real users, under real stress, needed it."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} hover>
                <h3 className="text-h3 font-semibold text-navy">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">
                  {f.body}
                </p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

    </>
  );
}

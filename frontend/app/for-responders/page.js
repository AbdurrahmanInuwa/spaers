import Container from '../components/marketing/Container';
import Card from '../components/marketing/Card';
import SectionHeading from '../components/marketing/SectionHeading';
import Button from '../components/marketing/Button';

export const metadata = {
  title: 'For Responders. SPAERS',
  description: 'Smarter dispatch. Safer communities. Built for municipalities, hospitals, and security firms.',
};

const REASONS = [
  {
    title: 'Reduce Call Handling Time',
    body: 'Skip the "Where are you?" conversation entirely. SPAERS gives you the pin on the map the moment the alert lands.',
    stat: '40%',
  },
  {
    title: 'Resource Management',
    body: 'View every active alert in your jurisdiction on a live map. Assign, dispatch, and track without leaving the screen.',
    stat: 'Real-time',
  },
];

export default function ForRespondersPage() {
  return (
    <>
      {/* Reasons */}
      <section className="bg-ice py-section-mobile sm:py-section">
        <Container size="wide">
          <SectionHeading
            title="Built for the people on the other end of the call."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {REASONS.map((r) => (
              <Card key={r.title} hover className="flex flex-col gap-4">
                <p className="font-mono text-h2 font-extrabold leading-none text-red">
                  {r.stat}
                </p>
                <h3 className="text-h3 font-semibold text-navy">{r.title}</h3>
                <p className="text-[15px] leading-relaxed text-muted">{r.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Hero */}
      <section className="bg-navy py-section-mobile text-white sm:py-section">
        <Container size="wide">
          <div className="flex flex-col items-center text-center">
            <h1 className="max-w-3xl text-h1 font-extrabold leading-[1.05]">
              <span className="text-white">Safer communities.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-body text-navy-100">
              SPAERS plugs into the public safety stack your department already
              runs and shaves precious seconds off every incident.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button intent="primary" size="lg" href="/signup">
                Create Free Account
              </Button>
            </div>
          </div>
        </Container>
      </section>

    </>
  );
}

import Container from '../components/marketing/Container';
import Card from '../components/marketing/Card';
import SectionHeading from '../components/marketing/SectionHeading';

export const metadata = {
  title: 'About. SPAERS',
  description:
    'SPAERS was built to close the gap between an incident occurring and a dispatcher knowing about it.',
};

const TEAM = [
  { name: 'Sidi Ubayda Adamu',          role: 'RTDRS Lead', bio: '', initials: 'SA' },
  { name: 'Abdurrahman Muhammad Inuwa', role: 'SOS Lead',  bio: 'Smart Panic Alert architecture, geo-fenced dispatch, anonymous response flows.', initials: 'AM' },
  { name: 'Fatima Isa Daku',            role: 'IRRC Lead',  bio: 'Incident Reporting & Responder Coordination, web + mobile, real-time incident lifecycle.', initials: 'FD' },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy py-section-mobile text-white sm:py-section">
        <Container size="wide">
          <p className="text-micro font-semibold uppercase tracking-[0.18em] text-red">
            About SPAERS
          </p>
          <h1 className="mt-3 max-w-3xl text-h1 font-extrabold leading-[1.05]">
            Innovating safety for a safer tomorrow.
          </h1>
          <p className="mt-6 max-w-2xl text-body text-navy-100">
            We built SPAERS because we saw the critical gap between an incident
            occurring and a dispatcher receiving accurate details. We are a team
            of computer scientists, engineers, and emergency-response advisors
            dedicated to saving lives.
          </p>
        </Container>
      </section>

      {/* Mission strip */}
      <section className="border-y border-navy-100 bg-white py-section-mobile sm:py-section">
        <Container className="max-w-4xl text-center">
          <p className="text-micro font-semibold uppercase tracking-[0.18em] text-red">
            Our Mission
          </p>
          <p className="mt-4 text-h2 font-bold text-navy">
            To ensure that no one is alone in an emergency.
          </p>
          <p className="mt-6 text-body text-muted">
            Every press is heard. Every alert is routed. Every responder arrives
            with the context they need. That&apos;s the standard we hold every
            line of code, every cellular link, and every dispatcher integration to.
          </p>
        </Container>
      </section>

      {/* Team */}
      <section className="bg-ice py-section-mobile sm:py-section">
        <Container size="wide">
          <SectionHeading
            eyebrow="The Team"
            title="The people behind SPAERS."
            lead="Computer Science @ Nile University of Nigeria."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((t) => (
              <Card key={t.name} hover className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-navy text-h3 font-extrabold text-white">
                  {t.initials}
                </div>
                <p className="text-[15px] font-semibold text-navy">{t.name}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

    </>
  );
}

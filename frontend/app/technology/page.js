import Container from '../components/marketing/Container';
import Card from '../components/marketing/Card';
import SectionHeading from '../components/marketing/SectionHeading';

export const metadata = {
  title: 'Technology. SPAERS',
  description:
    'How the SPAERS ecosystem turns a single press into a coordinated emergency response.',
};

const STEPS = [
  {
    n: '01',
    title: 'The Trigger',
    body:
      'Press the physical device or tap the app. The signal leaves your hand in under 250 ms and reaches our servers in under a second.',
    detail: 'Hardware: dedicated cellular chip. Mobile: WebSocket + SMS fallback.',
  },
  {
    n: '02',
    title: 'The Cloud',
    body:
      'Our servers verify the alert, capture your exact location, look up your medical profile, and identify which jurisdiction owns the response.',
    detail: 'Geo-fenced coverage matching, audit-logged, end-to-end encrypted.',
  },
  {
    n: '03',
    title: 'The Response',
    body:
      'The matched dispatch center receives the alert with your profile and an interactive pin. Multiple responders can join the same incident.',
    detail: 'Dashboards stream live. SMS + email + voice fan-out fires in parallel.',
  },
  {
    n: '04',
    title: 'The Rescue',
    body:
      'Responders are dispatched to your exact location. You see them approach on a live map until help is at your door.',
    detail: 'Real-time GPS streaming. Mutual cancellation if the situation resolves.',
  },
];

const STACK = [
  { group: 'Frontend',       items: ['Next.js 14 (Web)', 'Flutter (iOS + Android)'] },
  { group: 'Backend',        items: ['Node.js · Express', 'Prisma ORM'] },
  { group: 'Data',           items: ['PostgreSQL', 'Redis'] },
  { group: 'Realtime',       items: ['Socket.IO', 'MQTT (IoT telemetry)'] },
  { group: 'Notifications',  items: ['Twilio (SMS + Voice)', 'Gmail SMTP'] },
  { group: 'Storage & AI',   items: ['AWS S3', 'Google Maps Platform', 'Anthropic Claude'] },
];

export default function TechnologyPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy py-section-mobile text-white sm:py-section">
        <Container>
          <p className="text-micro font-semibold uppercase tracking-[0.18em] text-red">
            How It Works
          </p>
          <h1 className="mt-3 max-w-3xl text-h1 font-extrabold leading-[1.05]">
            The SPAERS Ecosystem.
            <br />
            <span className="text-red">Seamless integration, end-to-end.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-body text-navy-100">
            Four steps. Sub-second handoffs. No paperwork between the press and
            the rescue.
          </p>
        </Container>
      </section>

      {/* Ecosystem steps */}
      <section className="bg-ice py-section-mobile sm:py-section">
        <Container>
          <div className="grid gap-6 lg:grid-cols-2">
            {STEPS.map((s) => (
              <Card key={s.n} className="flex gap-6">
                <p className="font-mono text-h2 font-extrabold leading-none text-red">
                  {s.n}
                </p>
                <div>
                  <h3 className="text-h3 font-semibold text-navy">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">
                    {s.body}
                  </p>
                  <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.12em] text-teal">
                    {s.detail}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Tech stack */}
      <section className="border-y border-navy-100 bg-white py-section-mobile sm:py-section">
        <Container>
          <SectionHeading
            eyebrow="Under the Hood"
            title="Built on proven, production-grade tooling."
            lead="No reinventing the wheel. SPAERS uses widely-deployed infrastructure that your IT auditors already trust."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {STACK.map((g) => (
              <Card key={g.group}>
                <p className="text-micro font-semibold uppercase tracking-[0.15em] text-red">
                  {g.group}
                </p>
                <ul className="mt-3 space-y-2">
                  {g.items.map((i) => (
                    <li
                      key={i}
                      className="font-mono text-[14px] text-navy-700"
                    >
                      {i}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </Container>
      </section>

    </>
  );
}

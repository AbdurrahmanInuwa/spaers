import Link from 'next/link';
import Container from './components/marketing/Container';
import Button from './components/marketing/Button';
import Card from './components/marketing/Card';
import SectionHeading from './components/marketing/SectionHeading';
import StatusDot from './components/marketing/StatusDot';

// SPAERS. Marketing home. Spec sections (in scroll order):
//   1. Hero,  massive headline + two CTAs over dark navy backdrop
//   2. Problem,  why traditional emergency calls fail
//   3. Solution,  three feature columns
//   4. Live demo strip,  mock dispatch-center vibes
//   5. Stats / Social proof
//   6. Audience tiles,  link out to /for-users + /for-responders
//   7. CTA banner,  last chance to act

export const metadata = {
  title: 'SPAERS. When Every Second Counts',
  description:
    'Smart Emergency Alert & Response System. One press. Immediate action. Total peace of mind.',
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <Solution />
      <DispatchStrip />
      <Audiences />
      <CTABanner />
    </>
  );
}

/* ─────────────────────────── HERO ─────────────────────────── */
function Hero() {
  return (
    <section className="relative isolate flex min-h-[88vh] flex-col overflow-hidden bg-navy text-white">
      {/* Subtle grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <Container size="wide" className="relative flex flex-1 flex-col pt-32 pb-12 sm:pb-16 lg:pt-36">
        {/* ─── Top right slot, left intentionally empty for new content ─── */}
        <div className="flex justify-end">
          {/* TODO: drop new content here */}
        </div>

        {/* ─── Editorial wordmark headline ───
            `my-auto` centers the H1 vertically in the remaining space below
            the meta row, regardless of viewport height. */}
        <h1 className="my-auto max-w-5xl text-[clamp(3rem,8vw,7rem)] font-extrabold leading-[0.95] tracking-[-0.02em] text-white">
          <span className="block">Help is</span>
          <span className="block">
            <span className="text-red">one press</span>{' '}
            <span className="relative">
              away.
              {/* Highlight underline */}
              <span
                aria-hidden="true"
                className="absolute -bottom-2 left-0 right-0 h-1.5 bg-red"
              />
            </span>
          </span>
          <span
            className="block bg-clip-text text-transparent"
            style={{
              WebkitTextStroke: '1.5px rgba(255,255,255,0.35)',
              color: 'transparent',
            }}
          >
            Anywhere.
          </span>
        </h1>
      </Container>

      {/* Soft transition into next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-ice" aria-hidden="true" />
    </section>
  );
}

function HeroStat({ value, label }) {
  return (
    <div>
      <p className="font-mono text-[clamp(1.25rem,2vw,1.75rem)] font-extrabold leading-none text-white">
        {value}
      </p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-300">
        {label}
      </p>
    </div>
  );
}

/* ─────────────────────────── PROBLEM ─────────────────────────── */
function Problem() {
  const failures = [
    {
      stat: '~6.4 min',
      label: 'Average call-handling time',
      detail: 'Most spent on "Where are you?" / "What\'s your name?"',
    },
    {
      stat: '34%',
      label: 'Of mobile 911 calls have wrong location',
      detail: 'Cell-tower triangulation alone is not enough.',
    },
    {
      stat: '1 in 5',
      label: 'Bystanders freeze under panic',
      detail: 'Multi-step dialing fails when fine motor skills lock up.',
    },
  ];
  return (
    <section className="bg-ice py-section-mobile sm:py-section">
      <Container size="wide">
        <SectionHeading
          eyebrow="The Problem"
          title="In an Emergency, Speed is Survival."
          lead="Traditional emergency calls fail due to location inaccuracies, panic-induced confusion, and delayed manual dialing. SPAERS eliminates those barriers."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {failures.map((f) => (
            <Card key={f.label} className="flex flex-col gap-3">
              <p className="font-mono text-h2 font-extrabold leading-none text-red">
                {f.stat}
              </p>
              <p className="text-h3 font-semibold text-navy">{f.label}</p>
              <p className="text-[15px] leading-relaxed text-muted">{f.detail}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────── SOLUTION ─────────────────────────── */
function Solution() {
  const features = [
    {
      icon: <BoltIcon />,
      title: 'Instant Activation',
      body: 'A dedicated device and app that fires a distress signal the moment you press. No dial tones. No menus. No fumbling.',
    },
    {
      icon: <PinIcon />,
      title: 'Precise Location',
      body: 'GPS-powered coordinates delivered to the responder with every alert. Dispatchers see your pin on the map before they finish reading the alert.',
    },
    {
      icon: <RadioIcon />,
      title: 'Live Response',
      body: 'Direct connection to local responding authorities in your area. You watch them approach on a live map until help is at your door.',
    },
  ];
  return (
    <section className="border-y border-navy-100 bg-white py-section-mobile sm:py-section">
      <Container size="wide">
        <SectionHeading
          eyebrow="The Solution"
          title="One press. Help is on its way."
          lead="SPAERS turns a single tap into a full emergency response, coordinated across every available channel."
        />
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} hover className="flex flex-col gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-btn bg-red-light text-red">
                {f.icon}
              </div>
              <h3 className="text-h3 font-semibold text-navy">{f.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted">{f.body}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────── DISPATCH STRIP ─────────────────────────── */
function DispatchStrip() {
  return (
    <section className="bg-navy py-section-mobile text-white sm:py-section">
      <Container size="wide">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-micro font-semibold uppercase tracking-[0.18em] text-red">
              Dispatch Center View
            </p>
            <h2 className="mt-3 text-h2 font-bold text-white">
              Built for the people on the other end of the call.
            </h2>
            <p className="mt-4 text-body text-navy-100">
              Every alert arrives with location, victim profile, medical context, and
              real-time status. No questions. No wasted seconds.
            </p>
            <ul className="mt-6 space-y-3 text-[15px]">
              {[
                'GPS pin within 5 m accuracy on arrival',
                'Pre-loaded medical ID + emergency contacts',
                'Live in-app updates between victim and responder',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <CheckMark />
                  <span className="text-navy-100">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mock dispatch panel, pure CSS, no real data needed */}
          <div className="rounded-card border border-white/10 bg-navy-800 p-6 shadow-spaers-lg">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <StatusDot status="active" label="Active Alert" labelClassName="text-white" />
              <span className="font-mono text-[12px] text-navy-200">02:34</span>
            </div>
            <div className="grid grid-cols-2 gap-4 py-5 text-[13px]">
              <Field label="Type" value="Medical" />
              <Field label="Priority" value="HIGH" highlight />
              <Field label="Location" value="34.0522,–118.2437" mono />
              <Field label="Accuracy" value="±4 m" mono />
              <Field label="Victim" value="J. Carter, 34" />
              <Field label="Blood" value="O+" />
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-navy-200">
                Dispatcher en route
              </span>
              <span className="font-mono text-[12px] text-teal">ETA 4:32</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Field({ label, value, mono, highlight }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-navy-300">
        {label}
      </p>
      <p
        className={[
          'mt-1',
          mono ? 'font-mono' : '',
          highlight ? 'text-red' : 'text-white',
          'font-semibold',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  );
}

/* ─────────────────────────── STATS ─────────────────────────── */
function Stats() {
  const stats = [
    {
      value: '↓ 40%',
      label: 'Reduction in response time',
      sub:   'Vs. traditional voice dispatch, measured against average call-handling baseline.',
      icon:  <StopwatchIcon />,
      accent:'red',
    },
    {
      value: '<30s',
      label: 'From press to dispatcher notified',
      sub:   'GPS, profile, and incident type land on the responder dashboard before the SOS button finishes pulsing.',
      icon:  <BoltStatIcon />,
      accent:'navy',
    },
  ];
  return (
    <section className="bg-ice py-section-mobile sm:py-section">
      <Container size="wide">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {stats.map((s) => (
            <div
              key={s.label}
              className="group relative overflow-hidden rounded-card border border-navy-100 bg-white p-8 shadow-spaers-sm transition-shadow duration-150 ease-out hover:shadow-spaers-md sm:p-10"
            >
              {/* Decorative accent bar */}
              <span
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 w-1.5 ${
                  s.accent === 'red' ? 'bg-red' : 'bg-navy'
                }`}
              />

              <div className="flex items-start gap-5">
                <div
                  className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-btn ${
                    s.accent === 'red'
                      ? 'bg-red-light text-red'
                      : 'bg-navy-50 text-navy'
                  }`}
                >
                  {s.icon}
                </div>

                <div className="min-w-0">
                  <p
                    className={`font-mono font-extrabold leading-none ${
                      s.accent === 'red' ? 'text-red' : 'text-navy'
                    } text-[clamp(2.25rem,4vw,3.25rem)]`}
                  >
                    {s.value}
                  </p>
                  <p className="mt-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-navy">
                    {s.label}
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">
                    {s.sub}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────── AUDIENCES ─────────────────────────── */
function Audiences() {
  return (
    <section className="bg-white py-section-mobile sm:py-section">
      <Container size="wide">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card hover className="flex flex-col gap-4 p-8">
            <p className="text-micro font-semibold uppercase tracking-[0.05em] text-red">
              For Individuals & Families
            </p>
            <h3 className="text-h2 font-bold text-navy">Peace of mind in your pocket.</h3>
            <p className="text-body text-muted">
              Solo travelers, hikers, parents, older relatives. Anyone who values
              knowing help is one tap away.
            </p>
          </Card>
          <Card hover tone="dark" className="flex flex-col gap-4 p-8">
            <p className="text-micro font-semibold uppercase tracking-[0.05em] text-red">
              For Responders & Municipalities
            </p>
            <h3 className="text-h2 font-bold text-white">
              Smarter dispatch.
            </h3>
            <p className="text-body text-navy-100">
              Cut call-handling time, see every active alert on a live map,
              and dispatch responders to the exact location in seconds.
            </p>
          </Card>
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────── CTA BANNER ─────────────────────────── */
function CTABanner() {
  return (
    <section className="bg-red py-section-mobile text-white sm:py-section">
      <Container size="wide">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="text-h2 font-bold text-white">
            Don&apos;t wait for the worst day.
          </h2>
          <p className="max-w-2xl text-body text-white/90">
            SPAERS takes minutes to set up and works for a lifetime. Be ready
            before you need it.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button intent="white" size="lg" href="/signup">
              Get Protected Now
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────── Icons (inline, 1.5 stroke) ─────────────────────────── */
function BoltIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="m13 2-9 13h7l-1 7 9-13h-7l1-7z" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function StopwatchIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="14" r="8" />
      <path d="M12 10v4l2.5 2" />
      <path d="M9 2h6" />
      <path d="M12 2v3" />
      <path d="m18.5 7.5 1.5-1.5" />
    </svg>
  );
}
function BoltStatIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="m13 2-9 13h7l-1 7 9-13h-7l1-7z" />
    </svg>
  );
}
function RadioIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49" />
      <path d="M20.07 4.93a10 10 0 0 1 0 14.14M3.93 19.07a10 10 0 0 1 0-14.14" />
    </svg>
  );
}
function CheckMark() {
  return (
    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal/20 text-teal">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round"
        strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

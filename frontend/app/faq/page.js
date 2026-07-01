import Container from '../components/marketing/Container';
import SectionHeading from '../components/marketing/SectionHeading';
import Button from '../components/marketing/Button';

export const metadata = {
  title: 'FAQ. SPAERS',
  description: 'Frequently asked questions about SPAERS.',
};

const FAQS = [
  {
    tag: 'Setup',
    q: 'Does the app require Wi-Fi?',
    a: 'No. The app uses mobile data. The dedicated SPAERS hardware device runs on its own cellular chip and works even when your phone is off.',
  },
  {
    tag: 'SOS',
    q: 'What if I accidentally trigger it?',
    a: 'Every SOS has a 5-second countdown. Tap Cancel during that window and no alert is sent. After the countdown, you can still cancel the in-progress emergency from the live overlay until the first responder is en route.',
  },
  {
    tag: 'Privacy',
    q: 'Who can see my location?',
    a: 'Your live location is only shared with the dispatcher you assigned the alert to, any family members you have explicitly added, and approved volunteers if you opted in to community response. Never advertisers. Never third parties.',
  },
  {
    tag: 'Plans',
    q: 'Do I have to buy the hardware?',
    a: 'No. The app is fully functional on its own. The hardware is for users who want a dedicated panic button they can wear or keep on a keychain, plus 24/7 monitoring.',
  },
  {
    tag: 'Response',
    q: 'Are the authorities obligated to come?',
    a: 'SPAERS forwards every alert to the official public-safety dispatcher for your area. They are bound by the same response policies as a 911 or 112 call.',
  },
];

export default function FAQPage() {
  return (
    <>
      <section className="bg-navy py-section-mobile text-white sm:py-section">
        <Container size="wide">
          <p className="text-micro font-semibold uppercase tracking-[0.18em] text-red">
            Knowledge Base
          </p>
          <h1 className="mt-3 max-w-3xl text-h1 font-extrabold leading-[1.05]">
            Frequently Asked Questions.
          </h1>
          <p className="mt-6 max-w-2xl text-body text-navy-100">
            The answers to the questions we get most often. Can&apos;t find
            yours? Contact support, we reply within one business day.
          </p>
        </Container>
      </section>

      <section className="bg-ice py-section-mobile sm:py-section">
        <Container size="wide">
          <ol className="space-y-5">
            {FAQS.map((f, i) => (
              <li
                key={f.q}
                className="flex flex-col gap-4 overflow-hidden rounded-card border border-navy-100 border-l-4 border-l-navy bg-white p-6 shadow-spaers-sm sm:flex-row sm:p-8"
              >
                {/* Number chip — the small touch of dark color */}
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-navy font-mono text-sm font-extrabold text-white">
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Question + answer, all left-aligned */}
                <div className="flex-1 text-left">
                  <h3 className="text-h3 font-semibold text-navy">{f.q}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-muted">
                    {f.a}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="border-t border-navy-100 bg-white py-section-mobile sm:py-section">
        <Container className="text-center">
          <SectionHeading
            eyebrow="Still Stuck?"
            title="We're a quick email away."
          />
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button intent="primary" href="/contact">Contact Support</Button>
          </div>
        </Container>
      </section>
    </>
  );
}

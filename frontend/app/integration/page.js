import Container from '../components/marketing/Container';
import Button from '../components/marketing/Button';

export const metadata = {
  title: 'IoT Device. SPAERS',
  description:
    'A rugged panic button that talks to SPAERS. One press, one incident on every institution dashboard.',
};

export default function IntegrationPage() {
  return (
    <section className="bg-ice py-section-mobile sm:py-section">
      <Container size="wide">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: short description */}
          <div>
            <p className="text-micro font-semibold uppercase tracking-[0.18em] text-red">
              IoT Device
            </p>
            <h1 className="mt-3 text-h1 font-extrabold leading-[1.05] text-navy">
              The button that talks to SPAERS.
            </h1>
            <p className="mt-6 max-w-xl text-body text-muted">
              A ruggedised field node with a physical panic button, an LTE
              modem, and hybrid GNSS + WiFi positioning. One press sends a
              distress signal over MQTT that lands as a live incident on every
              institution dashboard within a 3 km reach.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button intent="primary" size="lg" href="/signup">
                Get Started
              </Button>
            </div>
          </div>

          {/* Right: reserved image slot. Drop the device photo here. */}
          <div
            className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-card border border-dashed border-navy-100 bg-white shadow-spaers-sm"
            aria-label="Device image placeholder"
          >
            {/* TODO: <Image src="/images/iot-device.png" alt="SPAERS IoT device" fill className="object-contain" /> */}
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-300">
              Device image
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

import Container from '../components/marketing/Container';
import StubForm from '../components/marketing/StubForm';

export const metadata = {
  title: 'Contact. SPAERS',
  description: 'Get in touch with the SPAERS team.',
};

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy py-section-mobile text-white sm:py-section">
        <Container size="wide">
          <p className="text-micro font-semibold uppercase tracking-[0.18em] text-red">
            Contact
          </p>
          <h1 className="mt-3 max-w-3xl text-h1 font-extrabold leading-[1.05]">
            Get in touch.
          </h1>
          <p className="mt-6 max-w-2xl text-body text-navy-100">
            Tell us what you need. We will get back to you soon.
          </p>
        </Container>
      </section>

      {/* Form */}
      <section className="bg-ice py-section-mobile sm:py-section">
        <Container size="wide">
          <div className="mx-auto max-w-2xl rounded-card border border-navy-100 bg-white p-6 shadow-spaers-sm sm:p-8">
            <StubForm className="space-y-4">
              <Field label="Your name" name="name" required />
              <Field label="Email" name="email" type="email" required />
              <div>
                <label
                  htmlFor="message"
                  className="mb-1 block text-[13px] font-medium text-navy"
                >
                  Message <span className="text-red">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  className="w-full rounded-btn border border-navy-100 bg-white px-3 py-2 text-[14px] text-ink outline-none transition-colors focus:border-red"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-btn bg-navy px-4 py-3 text-sm font-bold uppercase tracking-[0.05em] text-white shadow-spaers-sm transition-colors hover:bg-navy-700"
              >
                Send message
              </button>
            </StubForm>
          </div>
        </Container>
      </section>
    </>
  );
}

function Field({ label, name, type = 'text', required }) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1 block text-[13px] font-medium text-navy"
      >
        {label}
        {required && <span className="ml-1 text-red">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full rounded-btn border border-navy-100 bg-white px-3 py-2 text-[14px] text-ink outline-none transition-colors focus:border-red"
      />
    </div>
  );
}

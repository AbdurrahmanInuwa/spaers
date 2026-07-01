import PolicyShell from '../components/marketing/PolicyShell';

export const metadata = {
  title: 'Cookie Policy. SPAERS',
  description: 'How and why SPAERS uses cookies.',
};

export default function CookiesPage() {
  return (
    <PolicyShell
      title="Cookie Policy"
      updatedOn="June 30, 2026"
      intro="We use a small number of cookies, none for advertising. This page lists exactly what we set and why."
    >
      <h2>What is a cookie?</h2>
      <p>A cookie is a small text file a website stores in your browser. They let us recognize you between page loads (so you stay signed in) and remember small preferences.</p>

      <h2>Cookies we set</h2>
      <h3>Essential, always on</h3>
      <ul>
        <li><code>spaers_sid</code>, your session identifier. Required to stay signed in. <strong>HttpOnly · Secure · SameSite=None</strong>. Expires in 30 days from your last activity.</li>
        <li><code>spaers_csrf</code>, protects against cross-site request forgery on form submissions. Expires with your session.</li>
      </ul>
      <h3>Functional, opt-in</h3>
      <ul>
        <li><code>spaers_prefs</code>, remembers UI preferences (e.g. dismissed banners). Set only after you interact with the relevant control. Lasts 1 year.</li>
      </ul>

      <h2>What we don&apos;t set</h2>
      <ul>
        <li>No advertising or third-party tracking cookies.</li>
        <li>No analytics cookies that personally identify you.</li>
        <li>No fingerprinting or cross-site tracking.</li>
      </ul>

      <h2>Third-party cookies</h2>
      <p>Some sub-systems are powered by third parties who may set their own cookies on their domains, not ours:</p>
      <ul>
        <li><strong>Google Maps</strong>, when you load a map, Google may set cookies for the map tile session.</li>
        <li><strong>Stripe</strong> (payment pages only), fraud-prevention cookies on the payment iframe.</li>
      </ul>
      <p>These run only on the pages that need them.</p>

      <h2>Local storage</h2>
      <p>In addition to cookies, SPAERS stores a small amount of state in your browser&apos;s <em>localStorage</em>, for example, your active emergency token so the live overlay survives a refresh. This data never leaves your device unless required for an active SOS.</p>

      <h2>How to control cookies</h2>
      <ul>
        <li>Use your browser settings to clear or block cookies. Doing so will sign you out and may break parts of the dashboard.</li>
        <li>Use your browser&apos;s incognito/private mode for a cookie-free session.</li>
      </ul>

      <h2>Contact</h2>
      <p>Questions about this policy? Email <a href="mailto:spears.nile@gmail.com">spears.nile@gmail.com</a>.</p>
    </PolicyShell>
  );
}

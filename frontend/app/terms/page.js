import PolicyShell from '../components/marketing/PolicyShell';

export const metadata = {
  title: 'Terms of Service. SPAERS',
  description: 'The terms that govern your use of SPAERS.',
};

export default function TermsPage() {
  return (
    <PolicyShell
      title="Terms of Service"
      updatedOn="June 30, 2026"
      intro="These terms govern your use of the SPAERS web app, mobile app, hardware device, and dispatcher dashboard. By creating an account or using the service, you agree to them."
    >
      <h2>1. The service</h2>
      <p>SPAERS provides a Smart Panic Alert & Emergency Response System designed to dispatch help to your location. SPAERS is a supplement to, not a replacement for, public emergency services such as 911 or 112.</p>

      <h2>2. Account responsibilities</h2>
      <ul>
        <li>You must be at least 13 years old to self-register.</li>
        <li>You are responsible for the accuracy of the information in your profile.</li>
        <li>You are responsible for safeguarding your password and any hardware device assigned to you.</li>
        <li>You agree not to trigger false alerts. Repeated false alerts may result in account suspension and may be reportable to local authorities.</li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>You may not:</p>
      <ul>
        <li>Use SPAERS to harass, defraud, or endanger any person.</li>
        <li>Attempt to access another user&apos;s account or data.</li>
        <li>Reverse-engineer, modify, or redistribute the SPAERS service.</li>
        <li>Use SPAERS to violate any applicable law.</li>
      </ul>

      <h2>4. No guarantee of response</h2>
      <p>SPAERS routes alerts to the appropriate dispatch authority. We cannot and do not guarantee that any specific responder will arrive within any specific time. Local infrastructure, weather, traffic, and dispatcher availability all affect response.</p>
      <p><strong>For immediate life-threatening emergencies, always also call your local emergency number (911 / 112 / etc.).</strong></p>

      <h2>5. Payment & billing</h2>
      <ul>
        <li>The free app tier is provided at no charge.</li>
        <li>Premium plans renew automatically. You may cancel at any time and you will keep access until the end of the paid period.</li>
        <li>Hardware purchases are subject to a 30-day return window for unused devices in original packaging.</li>
      </ul>

      <h2>6. Intellectual property</h2>
      <p>SPAERS and its underlying software, design, and branding are owned by us and our licensors. You receive a limited, non-transferable license to use the service for its intended purpose.</p>

      <h2>7. Termination</h2>
      <p>You may delete your account at any time. We may suspend or terminate accounts that violate these terms, with notice where possible.</p>

      <h2>8. Limitation of liability</h2>
      <p>To the maximum extent permitted by law, SPAERS&apos; total liability for any claim arising from your use of the service is limited to the fees you have paid us in the prior 12 months. We are not liable for indirect, incidental, or consequential damages.</p>

      <h2>9. Indemnification</h2>
      <p>You agree to indemnify SPAERS against any claims arising from your misuse of the service or violation of these terms.</p>

      <h2>10. Governing law</h2>
      <p>These terms are governed by the laws of the Federal Republic of Nigeria, without regard to conflict-of-laws principles. Any disputes will be resolved in the courts of Abuja, FCT.</p>

      <h2>11. Changes</h2>
      <p>We will notify you of material changes at least 30 days before they take effect. Continued use after the effective date constitutes acceptance.</p>

      <h2>12. Contact</h2>
      <p>Questions about these terms? Email <a href="mailto:spears.nile@gmail.com">spears.nile@gmail.com</a>.</p>
    </PolicyShell>
  );
}

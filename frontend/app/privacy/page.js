import PolicyShell from '../components/marketing/PolicyShell';

export const metadata = {
  title: 'Privacy Policy. SPAERS',
  description: 'How SPAERS collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <PolicyShell
      title="Privacy Policy"
      updatedOn="June 30, 2026"
      intro="SPAERS exists to protect you in an emergency. That mission only works if you trust us with the minimum data we need to act on your behalf. This policy explains what we collect, why we collect it, who can see it, and how you stay in control."
    >
      <h2>1. What we collect</h2>
      <p>We collect three categories of personal data:</p>
      <ul>
        <li><strong>Account data</strong>, name, date of birth, email, phone number, country, hashed password.</li>
        <li><strong>Medical context</strong> (optional), blood group, known allergies, chronic conditions, implanted devices. Used only when an emergency is active.</li>
        <li><strong>Location data</strong>, your GPS coordinates at the moment you trigger an SOS, and (with permission) while an active emergency is in progress so responders can find you.</li>
      </ul>

      <h2>2. Why we collect it</h2>
      <ul>
        <li>To dispatch the right responder to the right place during an emergency.</li>
        <li>To give responders the medical context they need to treat you safely.</li>
        <li>To notify your family members and approved volunteers if you opt in.</li>
        <li>To improve the platform, fix bugs, and meet legal/audit obligations.</li>
      </ul>

      <h2>3. Who can see your data</h2>
      <ul>
        <li><strong>You</strong>, always.</li>
        <li><strong>Responders dispatched to your active emergency</strong>, only for the duration of that emergency.</li>
        <li><strong>Family members</strong> you have explicitly added to your family group.</li>
        <li><strong>Approved volunteers</strong> matched to your emergency type, only if you opt in to volunteer routing.</li>
        <li><strong>SPAERS staff</strong>, only for support requests you initiate, or fraud/abuse investigations.</li>
      </ul>
      <p>We never sell, rent, or trade your personal data. Period.</p>

      <h2>4. How we protect it</h2>
      <ul>
        <li>Encrypted at rest (AES-256) and in transit (TLS 1.3).</li>
        <li>Access-controlled with role-based permissions and audit logging.</li>
        <li>Stored on AWS infrastructure in your region where possible.</li>
        <li>Annual third-party security review and ongoing vulnerability disclosure program.</li>
      </ul>

      <h2>5. Your rights</h2>
      <ul>
        <li>Access, request a full export of everything we hold about you.</li>
        <li>Correction, fix anything inaccurate.</li>
        <li>Deletion, remove your account and personal data at any time via{' '}
          <a href="/dashboard/profile">Profile → Danger Zone</a>. We anonymize past emergency records for audit. Everything else is purged within 30 days.</li>
        <li>Portability, receive your data in a machine-readable format.</li>
        <li>Withdraw consent, disable family sharing, volunteer routing, or location streaming at any time.</li>
      </ul>

      <h2>6. Cookies & tracking</h2>
      <p>We use a small set of essential cookies for authentication and session management. We do not embed advertising trackers. See our <a href="/cookies">Cookie Policy</a> for details.</p>

      <h2>7. Children</h2>
      <p>SPAERS self-signup is restricted to users 13 and older. Children under 13 may be added as family members by an adult account holder, who manages their profile and receives any alerts on their behalf.</p>

      <h2>8. International transfers</h2>
      <p>If you use SPAERS from outside the region where your data is hosted, we transfer it under standard contractual safeguards and with end-to-end encryption.</p>

      <h2>9. Changes</h2>
      <p>We will notify you by email of material changes to this policy at least 30 days before they take effect.</p>

      <h2>10. Contact</h2>
      <p>For privacy questions or to exercise your rights, email <a href="mailto:spears.nile@gmail.com">spears.nile@gmail.com</a> or write to our HQ address listed on the <a href="/contact">Contact page</a>.</p>
    </PolicyShell>
  );
}

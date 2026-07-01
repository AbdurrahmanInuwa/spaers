import PolicyShell from '../components/marketing/PolicyShell';

export const metadata = {
  title: 'Security. SPAERS',
  description: 'How SPAERS protects your data and what to do if you find a vulnerability.',
};

export default function SecurityPage() {
  return (
    <PolicyShell
      title="Security"
      updatedOn="June 30, 2026"
      intro="SPAERS handles life-critical data. Security is treated as a product feature, not an afterthought. This page describes our controls and our responsible-disclosure program."
    >
      <h2>Data protection</h2>
      <ul>
        <li><strong>Encryption in transit</strong>, TLS 1.3 between every client, dispatcher, and our servers.</li>
        <li><strong>Encryption at rest</strong>, AES-256 for primary databases and S3 object storage.</li>
        <li><strong>Key management</strong>, managed via AWS KMS with rotation and audit logging.</li>
        <li><strong>Secrets</strong>, never in source control. Injected via environment at deploy time.</li>
      </ul>

      <h2>Access control</h2>
      <ul>
        <li>Role-based access control: citizen · responder · dispatcher · institution-admin · platform-admin</li>
        <li>Email-based 2FA available for every account, mandatory for institution + admin roles.</li>
        <li>Single-use SHA-256-hashed tokens for every responder-side action, plaintext never stored.</li>
        <li>Session cookies are <code>HttpOnly · Secure · SameSite=None</code>, 30-day sliding TTL.</li>
      </ul>

      <h2>Application security</h2>
      <ul>
        <li>Input validation at every API boundary (Prisma + Zod-style guards).</li>
        <li>Per-IP rate limiting on anonymous SOS to prevent abuse.</li>
        <li>CSRF protection on every state-changing form.</li>
        <li>Content Security Policy + strict CORS allowlist.</li>
      </ul>

      <h2>Infrastructure</h2>
      <ul>
        <li>Hosted on AWS in security-group-isolated VPCs.</li>
        <li>Database backups every 4 hours, retained 30 days, with point-in-time recovery.</li>
        <li>Production deploys go through PR review, automated tests, and a staging gate.</li>
        <li>Continuous dependency scanning + automated patching for critical CVEs.</li>
      </ul>

      <h2>Incident response</h2>
      <p>If a breach is detected, we will:</p>
      <ul>
        <li>Contain the impact within 1 hour.</li>
        <li>Notify affected users within 72 hours (and earlier if jurisdictional regulations require it).</li>
        <li>Publish a post-mortem within 30 days of resolution.</li>
      </ul>

      <h2>Responsible disclosure</h2>
      <p>We welcome security research. If you discover a vulnerability, please:</p>
      <ul>
        <li>Email <a href="mailto:spears.nile@gmail.com">spears.nile@gmail.com</a> with a detailed report.</li>
        <li>Do not exploit it beyond what&apos;s necessary to demonstrate.</li>
        <li>Give us a reasonable window to remediate (typically 90 days) before public disclosure.</li>
      </ul>
      <p>We acknowledge every report within 24 hours and credit researchers in our security hall-of-fame (with permission).</p>

      <h2>Compliance</h2>
      <ul>
        <li>GDPR-aligned for European users.</li>
        <li>HIPAA-style controls applied to medical data, even when not strictly required.</li>
        <li>Nigeria Data Protection Act (NDPA) 2023 compliant for primary jurisdiction.</li>
      </ul>

      <h2>Status page</h2>
      <p>Live system status at <a href="/">spaers.app</a> footer indicator. Full uptime history available on request.</p>
    </PolicyShell>
  );
}

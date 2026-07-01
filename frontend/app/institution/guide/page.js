'use client';

import { useState } from 'react';

// Institution Guide — end-to-end how-to for responders. The layout is a
// vertical subnav on the left (collapsible into a horizontal scroll on
// mobile) and the selected section on the right.

const SECTIONS = [
  { id: 'overview', title: 'Getting started' },
  { id: 'dispatchers', title: 'Adding dispatchers' },
  { id: 'receiving', title: 'Receiving incidents' },
  { id: 'incident-command', title: 'Incident Command' },
  { id: 'assigning', title: 'Assigning a dispatcher' },
  { id: 'resolving', title: 'Marking resolved' },
  { id: 'history', title: 'History & audits' },
  { id: 'settings', title: 'Settings & coverage' },
];

export default function GuidePage() {
  const [active, setActive] = useState(SECTIONS[0].id);
  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">Guide</h1>
        <p className="mt-1 text-sm text-muted">
          Everything you need to run SPAERS as an institution — from onboarding
          your team to closing out an incident.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Subtab nav */}
        <nav
          aria-label="Guide sections"
          className="flex-none lg:sticky lg:top-6 lg:w-64"
        >
          {/* Mobile: horizontal scroll. Desktop: vertical list. */}
          <div className="flex gap-1.5 overflow-x-auto rounded-card border border-navy-100 bg-white p-1.5 shadow-spaers-sm lg:flex-col">
            {SECTIONS.map((s) => {
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  className={[
                    'whitespace-nowrap rounded-btn px-3 py-2 text-left text-[13px] font-semibold transition-colors lg:whitespace-normal',
                    isActive
                      ? 'bg-red text-white shadow-spaers-sm'
                      : 'text-navy-600 hover:bg-navy-50 hover:text-navy',
                  ].join(' ')}
                >
                  {s.title}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Section content */}
        <article className="flex-1 rounded-card border border-navy-100 bg-white p-6 shadow-spaers-sm sm:p-8">
          {active === 'overview' && <SectionOverview />}
          {active === 'dispatchers' && <SectionDispatchers />}
          {active === 'receiving' && <SectionReceiving />}
          {active === 'incident-command' && <SectionIncidentCommand />}
          {active === 'assigning' && <SectionAssigning />}
          {active === 'resolving' && <SectionResolving />}
          {active === 'history' && <SectionHistory />}
          {active === 'settings' && <SectionSettings />}
        </article>
      </div>
    </div>
  );
}

/* ─────────── Section content blocks ─────────── */

function SectionOverview() {
  return (
    <Section
      eyebrow="Start here"
      title="What SPAERS does for your institution"
      lede="SPAERS routes life-threatening SOS presses and citizen-filed incident reports to the nearest qualified responders in real time. As an institution, you receive incidents that fall inside your service area, triage them, and dispatch your team."
    >
      <H3>The portal at a glance</H3>
      <ul className="mt-2 space-y-2 text-sm text-navy-600">
        <Bullet>
          <strong className="text-navy">Emergency</strong> — your live
          situational dashboard. Shows the map, your institution&apos;s reach,
          and a floating <em>Incident Command</em> button for the full incident
          queue.
        </Bullet>
        <Bullet>
          <strong className="text-navy">Dispatchers</strong> — manage the
          people you can assign to incidents.
        </Bullet>
        <Bullet>
          <strong className="text-navy">History</strong> — every incident
          your institution touched, with outcomes and timestamps.
        </Bullet>
        <Bullet>
          <strong className="text-navy">Settings</strong> — institution
          profile, coverage area pin, contact channels.
        </Bullet>
      </ul>

      <Callout tone="info">
        Every screen is read-only safe — you cannot accidentally create a
        report or dispatch a team without explicit confirmation.
      </Callout>
    </Section>
  );
}

function SectionDispatchers() {
  return (
    <Section
      eyebrow="Step 1"
      title="Build your dispatcher roster"
      lede="A dispatcher is anyone you can send to an incident — a paramedic team, a patrol car, a fire unit. You need at least one dispatcher on file before you can respond."
    >
      <H3>Adding a dispatcher</H3>
      <Steps>
        <Step n={1}>
          Open the <Tab>Dispatchers</Tab> tab in the sidebar.
        </Step>
        <Step n={2}>
          Click the <Pill>+ Add dispatcher</Pill> button in the top right.
        </Step>
        <Step n={3}>
          Fill in the name, contact number, and mode (vehicle, foot, etc.).
          The system auto-assigns a short, human-readable Dispatcher ID.
        </Step>
        <Step n={4}>
          Press <Pill tone="navy">Save</Pill>. The dispatcher appears as a card
          on the grid.
        </Step>
      </Steps>

      <H3>Editing or removing</H3>
      <p className="mt-2 text-sm text-navy-600">
        Hover any card to reveal the edit and delete controls. Deleting is
        soft — past incidents the dispatcher worked on keep their history.
      </p>

      <Callout tone="warn">
        Dispatchers do not log into SPAERS themselves — they receive
        single-use links and turn-by-turn directions on their device when
        you assign them an incident.
      </Callout>
    </Section>
  );
}

function SectionReceiving() {
  return (
    <Section
      eyebrow="Step 2"
      title="How incidents reach you"
      lede="SPAERS automatically pushes every qualifying incident to your portal in real time. There is nothing to poll for and nothing to refresh."
    >
      <H3>Two kinds of incidents</H3>
      <ul className="mt-2 space-y-2 text-sm text-navy-600">
        <Bullet>
          <strong className="text-navy">SOS press</strong> — a citizen
          triggered the panic button. These get the red <em>SOS</em> tag and
          jump to the top of the queue.
        </Bullet>
        <Bullet>
          <strong className="text-navy">Filed report</strong> — a citizen used
          the &ldquo;File a report&rdquo; form to log a witness/incident
          report. Tagged as <em>Report</em>; priority is chosen by the citizen.
        </Bullet>
      </ul>

      <H3>What triggers a push</H3>
      <p className="mt-2 text-sm text-navy-600">
        Incidents reach your institution when the citizen&apos;s location is
        within your configured coverage area. You can update that area at any
        time from <Tab>Settings</Tab>.
      </p>

      <H3>How you&apos;ll know</H3>
      <ul className="mt-2 space-y-2 text-sm text-navy-600">
        <Bullet>
          The <strong className="text-navy">Total</strong> and{' '}
          <strong className="text-navy">Active</strong> counters in
          Incident Command tick up immediately.
        </Bullet>
        <Bullet>
          New incidents appear at the top of the list with their type,
          priority, and time-since-creation chip.
        </Bullet>
        <Bullet>
          The institution&apos;s configured response numbers and emails also
          receive SMS / email alerts as a backup channel.
        </Bullet>
      </ul>
    </Section>
  );
}

function SectionIncidentCommand() {
  return (
    <Section
      eyebrow="Step 3"
      title="Opening Incident Command"
      lede="Incident Command is the single panel where you triage everything happening in your coverage area."
    >
      <H3>Opening the panel</H3>
      <Steps>
        <Step n={1}>
          Go to the <Tab>Emergency</Tab> tab.
        </Step>
        <Step n={2}>
          Click the navy <Pill tone="navy">Incident Command</Pill> button
          centred below the map.
        </Step>
        <Step n={3}>
          The panel animates open showing live counts, filters, and the full
          incident list.
        </Step>
      </Steps>

      <H3>Stats at the top</H3>
      <ul className="mt-2 space-y-2 text-sm text-navy-600">
        <Bullet>
          <strong className="text-navy">Total</strong> — every incident in
          your coverage today.
        </Bullet>
        <Bullet>
          <strong className="text-navy">Active</strong> — anything that is
          not yet resolved, cancelled, or expired.
        </Bullet>
        <Bullet>
          <strong className="text-navy">Critical</strong> — priority =
          critical.
        </Bullet>
        <Bullet>
          <strong className="text-navy">Pending</strong> — active and not yet
          assigned to a dispatcher.
        </Bullet>
      </ul>

      <H3>Filters</H3>
      <p className="mt-2 text-sm text-navy-600">
        Use the status chips (Pending / In Progress / Resolved) and priority
        chips (Low → Critical) to narrow the queue. Filters stack.
      </p>

      <H3>Opening an incident</H3>
      <p className="mt-2 text-sm text-navy-600">
        Click any card to drop into the detail view — full notes, attached
        evidence photos/videos, caller info (or &ldquo;Anonymous&rdquo;), and
        the action buttons.
      </p>
    </Section>
  );
}

function SectionAssigning() {
  return (
    <Section
      eyebrow="Step 4"
      title="Assigning a dispatcher"
      lede="When you decide to respond, assigning a dispatcher hands the incident off to your team in the field."
    >
      <H3>The flow</H3>
      <Steps>
        <Step n={1}>
          Open the incident&apos;s detail view from Incident Command.
        </Step>
        <Step n={2}>
          Scroll to the action buttons at the bottom and press{' '}
          <Pill tone="red">Assign dispatcher</Pill>.
        </Step>
        <Step n={3}>
          An inline picker expands. Choose the right dispatcher from the
          dropdown — the list reflects everyone on the Dispatchers tab.
        </Step>
        <Step n={4}>
          Press <Pill tone="red">Confirm assignment</Pill>. SPAERS sends the
          dispatcher a single-use link with the location and routing
          information.
        </Step>
      </Steps>

      <Callout tone="info">
        After assignment, the incident&apos;s status flips to{' '}
        <em>In Progress</em>. The card shows who you assigned and how long
        ago.
      </Callout>

      <H3>If the dispatcher is unreachable</H3>
      <p className="mt-2 text-sm text-navy-600">
        Re-open the incident, press Assign dispatcher again, and pick a
        different person. SPAERS keeps the previous attempt in the audit log.
      </p>
    </Section>
  );
}

function SectionResolving() {
  return (
    <Section
      eyebrow="Step 5"
      title="Closing out an incident"
      lede="When the situation is handled — on scene or remotely — mark the incident resolved so it stops appearing in your active queue."
    >
      <H3>How to resolve</H3>
      <Steps>
        <Step n={1}>
          Open the incident detail view.
        </Step>
        <Step n={2}>
          Press <Pill tone="navy">Mark resolved</Pill>.
        </Step>
        <Step n={3}>
          Confirm the prompt. The row leaves the Active queue, moves into
          History, and any dispatcher en route is told to stand down.
        </Step>
      </Steps>

      <H3>What happens behind the scenes</H3>
      <ul className="mt-2 space-y-2 text-sm text-navy-600">
        <Bullet>
          The status becomes <strong className="text-navy">Resolved</strong>{' '}
          and the resolution timestamp is recorded.
        </Bullet>
        <Bullet>
          Every other institution that received this row gets the same
          update — no duplicate response.
        </Bullet>
        <Bullet>
          The citizen sees the resolution in their own History view.
        </Bullet>
      </ul>

      <Callout tone="warn">
        Resolving is irreversible from the UI. Use this only when the
        incident is genuinely closed out.
      </Callout>
    </Section>
  );
}

function SectionHistory() {
  return (
    <Section
      eyebrow="Step 6"
      title="Reviewing past incidents"
      lede="History is your read-only audit log — every incident your institution touched, with outcomes, response times, and assignment chains."
    >
      <H3>What&apos;s in there</H3>
      <ul className="mt-2 space-y-2 text-sm text-navy-600">
        <Bullet>
          Every incident your institution received — resolved, cancelled, and
          expired alike.
        </Bullet>
        <Bullet>
          The dispatcher assigned (if any), the response time, and the
          resolved-at timestamp.
        </Bullet>
        <Bullet>
          Original notes, attached evidence, and the citizen&apos;s identity
          (unless they reported anonymously).
        </Bullet>
      </ul>

      <H3>Using it for review</H3>
      <p className="mt-2 text-sm text-navy-600">
        Click any row to see the original detail card. Use the filter chips
        to narrow by status. The list goes back as far as 100 incidents per
        page.
      </p>

      <Callout tone="info">
        History is the place to pull numbers for performance reviews,
        regulator reports, or shift reports.
      </Callout>
    </Section>
  );
}

function SectionSettings() {
  return (
    <Section
      eyebrow="Step 7"
      title="Keeping your details accurate"
      lede="Settings is where you change anything about your institution's profile, who responds to alerts, and where your service area is."
    >
      <H3>Profile</H3>
      <p className="mt-2 text-sm text-navy-600">
        Update institution name, type, year established, and address. Address
        changes also move your location pin on the map.
      </p>

      <H3>Response channels</H3>
      <p className="mt-2 text-sm text-navy-600">
        Add or remove the phone numbers and email addresses that get SMS /
        email alerts when an incident comes in. The first email in the list
        is your login username.
      </p>

      <H3>Coverage area</H3>
      <p className="mt-2 text-sm text-navy-600">
        Incidents within a configurable reach of your location pin will
        alert your institution. Move the pin or update the address to shift
        where you cover.
      </p>

      <H3>Account security</H3>
      <ul className="mt-2 space-y-2 text-sm text-navy-600">
        <Bullet>Change your password from the Security card.</Bullet>
        <Bullet>
          Enable two-factor authentication for an extra step at sign-in.
        </Bullet>
      </ul>

      <Callout tone="warn">
        Changes to coverage and contact channels go live immediately. Test by
        triggering a low-priority report from a citizen account if you want
        to confirm the new wiring.
      </Callout>
    </Section>
  );
}

/* ─────────── Reusable primitives ─────────── */

function Section({ eyebrow, title, lede, children }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-extrabold tracking-tight text-navy sm:text-2xl">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{lede}</p>
      <div className="mt-6 space-y-5">{children}</div>
    </div>
  );
}

function H3({ children }) {
  return (
    <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-navy-600">
      {children}
    </h3>
  );
}

function Bullet({ children }) {
  return (
    <li className="flex gap-2">
      <span
        className="mt-1.5 inline-block h-1.5 w-1.5 flex-none rounded-full bg-red"
        aria-hidden="true"
      />
      <span>{children}</span>
    </li>
  );
}

function Steps({ children }) {
  return <ol className="mt-2 space-y-3">{children}</ol>;
}

function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
        {n}
      </span>
      <span className="text-sm text-navy-600">{children}</span>
    </li>
  );
}

function Tab({ children }) {
  return (
    <span className="inline-flex items-center rounded-btn border border-navy-100 bg-navy-50 px-1.5 py-0.5 text-[11px] font-bold text-navy-600">
      {children}
    </span>
  );
}

function Pill({ children, tone = 'navy-outline' }) {
  const cls =
    tone === 'red'
      ? 'bg-red text-white'
      : tone === 'navy'
        ? 'bg-navy text-white'
        : 'border border-navy-100 bg-white text-navy-600';
  return (
    <span
      className={`inline-flex items-center rounded-btn px-2 py-0.5 text-[11px] font-bold ${cls}`}
    >
      {children}
    </span>
  );
}

function Callout({ tone = 'info', children }) {
  const cls =
    tone === 'warn'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : 'border-navy-100 bg-navy-50 text-navy-600';
  return (
    <div className={`mt-4 rounded-card border px-4 py-3 text-xs leading-relaxed ${cls}`}>
      {children}
    </div>
  );
}

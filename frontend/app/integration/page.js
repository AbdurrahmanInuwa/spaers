export default function IntegrationPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 sm:py-16">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
        Hardware
      </p>

      <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 md:text-5xl">
        <span className="text-brand">Field Personnel</span> Monitoring System.
      </h1>

      <div className="mt-8 space-y-5 text-[15px] leading-[1.7] text-slate-600">
        <p>
          The system is a real-time personnel monitoring platform comprising
          two integrated components: a field-deployed IoT node and a
          web-based monitoring dashboard accessible to supervisors.
        </p>
        <p>
          The field node is built on an ESP32 microcontroller paired with a
          SIM7600 LTE modem. It autonomously acquires and transmits
          telemetry every eight seconds over LTE via MQTT, carrying device
          identity, timestamp, signal strength, positioning source, and
          location data, all without requiring any interaction from the
          field operator. Location is determined through a hybrid three-tier
          fallback strategy: GNSS first using GPS, GLONASS, and BeiDou
          simultaneously; falling back to WiFi-based geolocation via access
          point scanning; and finally to cellular tower identification if
          WiFi yields no result. Two hardware interrupt-driven buttons
          provide distress signalling, one to flag the device state as
          DISTRESS and trigger an immediate out-of-cycle transmission, and
          one to return it to normal operational state. A 0.96-inch OLED
          display provides live on-device feedback on connectivity,
          positioning source, signal strength, and coordinates.
        </p>
        <p>
          On the supervisor side, the web dashboard receives all telemetry
          in real time via WebSocket and presents it through a live map,
          device status cards, signal indicators, distress alert
          notifications, and an analytics section. Access is protected by
          role-based authentication, with an admin panel for managing
          supervisors and device assignments.
        </p>
      </div>

      <div className="mt-8">
        <a
          href="http://45.77.136.172/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
        >
          Open the supervisor dashboard
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 17 17 7" />
            <path d="M7 7h10v10" />
          </svg>
        </a>
      </div>
    </div>
  );
}

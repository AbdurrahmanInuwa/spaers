// Hardware SOS ingest — subscribes to the MQTT topic your button devices
// publish on. Each message that carries `state: 'DISTRESS'` becomes an
// anonymous Emergency row that flows through the same fan-out pipeline as
// every other SOS: radius match against every institution's centerLat/Lng,
// realtime socket broadcast, and outbound SMS / email notification.
//
// Location resolution:
//   - positioning_source ∈ {'GPS','gps','GNSS'} → use lat/lng from the
//     payload (a handful of key spellings are accepted).
//   - positioning_source === 'WiFi'             → post the reported access
//     points to Google's Geolocation API and use the returned lat/lng.
//
// No dedup logic — every DISTRESS message creates a fresh Emergency.
// Environment:
//   MQTT_URL       e.g. mqtt://broker.example.com:1883 (or mqtts:// for TLS)
//   MQTT_USERNAME  optional
//   MQTT_PASSWORD  optional
//   MQTT_TOPIC     e.g. devices/+/telemetry — wildcards allowed
//   GOOGLE_MAPS_API_KEY — reused for the WiFi geolocation call

const mqtt = require('mqtt');
const prisma = require('./prisma');
const realtime = require('./realtime');
const { notifyInstitution } = require('./notify');

// Mirror of the radius constant in routes/emergencies.js. Keep in sync —
// this is the only backend gate that decides which institutions get a ping
// for hardware-sourced SOS events.
const INSTITUTION_REACH_M = 3000; // 3 km

const HARDWARE_TYPE = 'Hardware SOS';
const HARDWARE_PRIORITY = 'high';
const GPS_SOURCES = new Set(['GPS', 'gps', 'GNSS', 'gnss']);
const WIFI_SOURCES = new Set(['WiFi', 'wifi', 'WIFI']);

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;

/* ─────────────── Location resolution ─────────────── */

function readGpsCoords(payload) {
  const lat = Number(
    payload.latitude ?? payload.lat ?? payload.location?.lat ?? payload.location?.latitude
  );
  const lng = Number(
    payload.longitude ??
      payload.lng ??
      payload.lon ??
      payload.location?.lng ??
      payload.location?.longitude
  );
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, accuracyM: null };
  return null;
}

async function resolveWifi(payload) {
  if (!GOOGLE_KEY) {
    console.warn('deviceMqtt: GOOGLE_MAPS_API_KEY missing — cannot resolve WiFi position');
    return null;
  }
  const aps = Array.isArray(payload.wifi_access_points) ? payload.wifi_access_points : [];
  if (aps.length === 0) return null;
  const body = {
    considerIp: false,
    wifiAccessPoints: aps
      .filter((w) => w && w.mac_address)
      .map((w) => ({
        macAddress: String(w.mac_address),
        signalStrength: Number.isFinite(Number(w.rssi)) ? Number(w.rssi) : undefined,
      })),
  };
  try {
    const res = await fetch(
      `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(
        `deviceMqtt: Google Geolocation HTTP ${res.status}: ${errText.slice(0, 200)}`
      );
      return null;
    }
    const data = await res.json();
    if (typeof data?.location?.lat !== 'number' || typeof data?.location?.lng !== 'number') {
      return null;
    }
    return {
      lat: data.location.lat,
      lng: data.location.lng,
      accuracyM: Number.isFinite(data.accuracy) ? data.accuracy : null,
    };
  } catch (err) {
    console.warn('deviceMqtt: Google Geolocation call failed:', err?.message || err);
    return null;
  }
}

async function resolveLocation(payload) {
  const src = payload.positioning_source;
  if (GPS_SOURCES.has(src)) return readGpsCoords(payload);
  if (WIFI_SOURCES.has(src)) return await resolveWifi(payload);
  // Unknown / missing source — try GPS keys first, WiFi second.
  return readGpsCoords(payload) || (await resolveWifi(payload));
}

/* ─────────────── Geometry (kept local so lib/geometry stays simple) ─────────────── */

function haversineMeters(p1, p2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const lat1 = toRad(p1.lat);
  const lat2 = toRad(p2.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ─────────────── Message handler ─────────────── */

async function ingestDistress(topic, buffer) {
  let payload;
  try {
    payload = JSON.parse(buffer.toString());
  } catch (err) {
    console.warn(`deviceMqtt: invalid JSON on ${topic}`);
    return;
  }

  // Guard: only distress messages should turn into emergencies. Keepalive,
  // telemetry, low-battery, etc. get quietly dropped.
  if (String(payload.state || '').toUpperCase() !== 'DISTRESS') return;

  const loc = await resolveLocation(payload);
  if (!loc) {
    console.warn(
      `deviceMqtt: could not resolve location for ${payload.device_id || 'unknown device'} on ${topic}`
    );
    return;
  }

  const deviceId = payload.device_id ? String(payload.device_id) : 'unknown';
  const source = payload.positioning_source || 'unknown';
  const accuracyBit = loc.accuracyM
    ? ` (±${Math.round(loc.accuracyM)} m)`
    : '';
  const notes = `Hardware SOS from ${deviceId}. Positioned via ${source}${accuracyBit}.`;

  let emergency;
  try {
    emergency = await prisma.emergency.create({
      data: {
        type: HARDWARE_TYPE,
        source: 'hardware_sos',
        status: 'active',
        priority: HARDWARE_PRIORITY,
        anonymous: true,
        victimLat: loc.lat,
        victimLng: loc.lng,
        notes,
      },
    });
  } catch (err) {
    console.error('deviceMqtt: failed to create emergency', err);
    return;
  }

  // Fan out to every institution within reach — same radius / same helpers
  // as the SOS panic and citizen-report pipelines.
  const institutions = await prisma.institution.findMany({
    select: {
      id: true,
      name: true,
      responseNumbers: true,
      responseEmails: true,
      centerLat: true,
      centerLng: true,
    },
  });
  const matched = institutions.filter(
    (inst) =>
      typeof inst.centerLat === 'number' &&
      typeof inst.centerLng === 'number' &&
      haversineMeters(
        { lat: loc.lat, lng: loc.lng },
        { lat: inst.centerLat, lng: inst.centerLng }
      ) <= INSTITUTION_REACH_M
  );

  if (matched.length === 0) {
    console.log(
      `deviceMqtt: Hardware SOS ${emergency.id} at ${loc.lat.toFixed(5)},${loc.lng.toFixed(5)} → no institutions in range`
    );
    return;
  }

  // Reload with the shape the socket broadcast + notify expect (no citizen
  // block because this event has none).
  const broadcastable = await prisma.emergency.findUnique({
    where: { id: emergency.id },
    include: {
      dispatches: { take: 0 },
      attachments: true,
    },
  });

  for (const inst of matched) {
    notifyInstitution({ emergency, institution: inst, token: null }).catch(
      (err) => console.error('notifyInstitution(hardware) error:', err)
    );
    try {
      realtime.emitInstitutionEmergencyCreated(inst.id, broadcastable);
    } catch (err) {
      console.error('deviceMqtt: realtime emit failed', err);
    }
  }

  console.log(
    `deviceMqtt: Hardware SOS ${emergency.id} at ${loc.lat.toFixed(5)},${loc.lng.toFixed(5)} → ${matched.length} institution(s)`
  );
}

/* ─────────────── MQTT client bootstrap ─────────────── */

let client = null;

function initDeviceMqtt() {
  const url = process.env.MQTT_URL;
  const topic = process.env.MQTT_TOPIC;
  if (!url || !topic) {
    console.log('deviceMqtt: MQTT_URL/MQTT_TOPIC not set, skipping subscribe.');
    return null;
  }

  client = mqtt.connect(url, {
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    reconnectPeriod: 5000,
    clean: true,
    // Sensible defaults for a small ingest — QoS 1 subscription happens below
    // so brokered redelivery is handled by the broker if we crash mid-message.
  });

  client.on('connect', () => {
    console.log(`deviceMqtt: connected to ${url}`);
    client.subscribe(topic, { qos: 1 }, (err) => {
      if (err) console.error(`deviceMqtt: subscribe failed for ${topic}:`, err);
      else console.log(`deviceMqtt: subscribed to ${topic}`);
    });
  });

  client.on('reconnect', () => console.log('deviceMqtt: reconnecting…'));
  client.on('error', (err) => console.error('deviceMqtt error:', err?.message || err));
  client.on('close', () => console.log('deviceMqtt: connection closed'));

  client.on('message', (t, buf) => {
    ingestDistress(t, buf).catch((err) =>
      console.error('deviceMqtt: ingest error', err)
    );
  });

  return client;
}

module.exports = { initDeviceMqtt };

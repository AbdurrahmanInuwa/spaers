// Best-effort server-side reverse geocoding via Google Maps Geocoding API.
// Used at Emergency creation time to populate the human-readable `address`
// column so My Reports / Incident Command can render street info without
// asking the client to geocode on every list render.
//
// Returns null on any error (no API key, network blip, no results) — callers
// must treat the address as optional metadata, never a required field.

const KEY = process.env.GOOGLE_MAPS_API_KEY;

// 7-day in-memory cache keyed by quantized lat/lng (~110 m grid). Keeps us
// well below the free Geocoding tier and avoids hammering the API when the
// same SOS coordinate repeats (e.g. dev/test).
const CACHE = new Map();
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function gridKey(lat, lng) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {AbortSignal} [signal]
 * @returns {Promise<string|null>}
 */
async function reverseGeocode(lat, lng, signal) {
  if (!KEY) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const key = gridKey(lat, lng);
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.t < TTL_MS) return cached.v;

  try {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: KEY,
      // Drop noisy types so we land on a street/locality result first.
      result_type: 'street_address|premise|neighborhood|locality',
    });
    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
      // OK with no results, or ZERO_RESULTS — both mean "no nice address";
      // cache the null for the TTL so we don't retry every list render.
      CACHE.set(key, { v: null, t: Date.now() });
      return null;
    }
    // Prefer the most specific street_address; fall back to first result.
    const best =
      data.results.find((r) => (r.types || []).includes('street_address')) ||
      data.results[0];
    const value = best.formatted_address || null;
    CACHE.set(key, { v: value, t: Date.now() });
    return value;
  } catch (err) {
    // Swallow — geocoding is best-effort and must never block emergency
    // creation. Log so we can spot misconfigured keys in dev.
    if (err?.name !== 'AbortError') {
      console.warn('reverseGeocode error:', err?.message || err);
    }
    return null;
  }
}

module.exports = { reverseGeocode };

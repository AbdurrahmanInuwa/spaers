// SMS via Twilio. Falls back to a console stub if creds are missing so dev
// still works without keys. Returns { ok, messageId? } or { ok: false, reason }.
const twilio = require('twilio');

let client = null;
let warned = false;

function getClient() {
  if (client) return client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    if (!warned) {
      console.warn(
        '[sms] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set — SMS will be stubbed.'
      );
      warned = true;
    }
    return null;
  }
  client = twilio(sid, token);
  return client;
}

// Convert a possibly-local phone number to E.164 ("+<countryCode><number>").
// Twilio rejects anything not fully qualified. Rules:
//   "+2348103701448"   → "+2348103701448" (pass-through)
//   "2348103701448"    → "+2348103701448"
//   "08103701448"      → "+2348103701448" (replace leading 0 with +country)
//   "008103701448"     → "+8103701448"    (00 is the intl prefix → +)
// DEFAULT_DIAL_CODE env var overrides; falls back to "234" (Nigeria) since
// that is where the deployed institutions are based today.
function toE164(phone) {
  if (!phone) return null;
  let s = String(phone).trim().replace(/[\s()\-.]/g, '');
  if (!s) return null;
  if (s.startsWith('+')) return s;
  if (s.startsWith('00')) return '+' + s.slice(2);
  const dial = process.env.DEFAULT_DIAL_CODE || '234';
  if (s.startsWith('0')) return '+' + dial + s.slice(1);
  if (/^\d+$/.test(s)) return '+' + s;
  return null;
}

async function send({ to, message }) {
  const c = getClient();
  if (!c) return { ok: false, reason: 'no_credentials' };
  const dest = toE164(to);
  if (!dest) return { ok: false, reason: 'no_recipient' };

  // Either set TWILIO_FROM (e.g. +1XXXX a Twilio number) OR
  // TWILIO_MESSAGING_SERVICE_SID (recommended in prod — handles routing,
  // sender pooling, and per-country compliance automatically).
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = process.env.TWILIO_FROM;
  if (!messagingServiceSid && !from) {
    return { ok: false, reason: 'no_sender_configured' };
  }

  try {
    const opts = { to: dest, body: message };
    if (messagingServiceSid) opts.messagingServiceSid = messagingServiceSid;
    else opts.from = from;
    const msg = await c.messages.create(opts);
    return { ok: true, messageId: msg.sid, status: msg.status };
  } catch (err) {
    console.error('[sms] twilio send failed:', err.message || err);
    return {
      ok: false,
      reason: err.code ? `twilio_${err.code}` : err.message || 'send_failed',
    };
  }
}

module.exports = { send };

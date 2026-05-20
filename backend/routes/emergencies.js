const express = require('express');
const prisma = require('../lib/prisma');
const session = require('../lib/session');
const redis = require('../lib/redis');
const { pointInPolygon } = require('../lib/geometry');

// Backend haversine — keep here so we don't depend on the frontend's lib
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
const { issueToken, resolveToken } = require('../lib/tokens');
const {
  notifyInstitution,
  notifyFamilyMembers,
  notifyVolunteer,
  pickMatchingVolunteers,
} = require('../lib/notify');
const realtime = require('../lib/realtime');
const { reverseGeocode } = require('../lib/geocode');

// Default `notes` body for panic-sourced SOS rows. Renders in incident lists
// and "My Reports" cards as the human-readable description. Citizens can
// override later via PATCH (when the slow-path report flow ships).
const PANIC_NOTES_DEFAULT =
  'PANIC ALERT — Emergency assistance needed immediately';

// Allowed emergency types for both panic SOS and the slow-path report flow.
// Kept tight (5 values) per product decision.
const EMERGENCY_TYPES = new Set([
  'Shooting',
  'Medical',
  'Assault',
  'Fire',
  'Flooding',
]);

// Citizen-chosen priority values for `source='report'`.
const REPORT_PRIORITIES = new Set(['low', 'medium', 'high', 'critical']);

// Strip identifying citizen fields when the report was filed anonymously.
// Used in both the REST list (GET /incidents) and the socket broadcast so
// dispatchers never see the citizen's name/contact info regardless of channel.
// Medical fields (blood group, allergies, etc.) are preserved because they
// can be life-critical even when identity is redacted.
function sanitizeAnonymous(emergency) {
  if (!emergency?.anonymous) return emergency;
  return {
    ...emergency,
    citizen: emergency.citizen
      ? {
          id: null,
          spaersId: null,
          firstName: 'Anonymous',
          lastName: 'Reporter',
          dob: null,
          email: null,
          phone: null,
          country: null,
          bloodGroup: emergency.citizen.bloodGroup,
          allergies: emergency.citizen.allergies,
          chronicCondition: emergency.citizen.chronicCondition,
          implantDevice: emergency.citizen.implantDevice,
        }
      : null,
  };
}

const router = express.Router();

// POST /api/emergencies — citizen triggers SOS. Body: { type, lat, lng }
router.post('/', session.requireAuth('citizen'), async (req, res) => {
  try {
    const citizenId = req.session.userId;
    const { type, lat, lng } = req.body || {};
    if (!type || typeof lat !== 'number' || typeof lng !== 'number') {
      return res
        .status(400)
        .json({ error: 'type, lat, and lng are required' });
    }

    // Fire reverse geocode in parallel with the institution scan — both are
    // independent of the emergency row, and we don't want to add latency to
    // the panic press.
    const addressPromise = reverseGeocode(lat, lng).catch(() => null);

    const emergency = await prisma.emergency.create({
      data: {
        citizenId: citizenId || null,
        type: String(type),
        victimLat: lat,
        victimLng: lng,
        status: 'active',
        source: 'sos_panic',
        priority: 'critical',
        notes: PANIC_NOTES_DEFAULT,
      },
    });

    // Find institutions whose coverage polygon contains the victim
    const institutions = await prisma.institution.findMany({
      select: {
        id: true,
        name: true,
        responseNumbers: true,
        responseEmails: true,
        coveragePolygon: true,
      },
    });
    const matched = institutions.filter((inst) =>
      pointInPolygon({ lat, lng }, inst.coveragePolygon || [])
    );

    // Patch the geocoded address onto the row once it resolves — fire-and-forget
    // so the response stays fast.
    addressPromise
      .then((address) => {
        if (!address) return;
        return prisma.emergency.update({
          where: { id: emergency.id },
          data: { address },
        });
      })
      .catch((e) => console.warn('Geocode patch failed:', e?.message || e));

    // Build a "fat" emergency record once, matching the shape of /active so
    // each institution dashboard can render the new row without refetching.
    const broadcastable = await prisma.emergency.findUnique({
      where: { id: emergency.id },
      include: {
        citizen: {
          select: {
            spaersId: true,
            firstName: true,
            lastName: true,
            dob: true,
            email: true,
            phone: true,
            country: true,
            bloodGroup: true,
            allergies: true,
            chronicCondition: true,
            implantDevice: true,
          },
        },
        dispatches: { take: 0 },
      },
    });

    // Issue a token per institution and fire notifications (fire-and-forget)
    for (const inst of matched) {
      const token = await issueToken(prisma, {
        emergencyId: emergency.id,
        audience: 'institution',
        audienceId: inst.id,
      });
      notifyInstitution({ emergency, institution: inst, token }).catch((err) =>
        console.error('notifyInstitution error:', err)
      );
      // Live push to the institution dashboard — new row appears instantly
      realtime.emitInstitutionEmergencyCreated(inst.id, broadcastable);
    }

    // Notify the triggerer's family (adult members, not the triggerer)
    let notifiedFamily = 0;
    if (citizenId) {
      const triggerer = await prisma.citizen.findUnique({
        where: { id: citizenId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          familyId: true,
        },
      });
      if (triggerer?.familyId) {
        const members = await prisma.citizen.findMany({
          where: { familyId: triggerer.familyId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            country: true,
            dob: true,
            familyCallEligible: true,
          },
        });
        notifiedFamily = members.filter((m) => m.id !== triggerer.id).length;
        notifyFamilyMembers({ emergency, triggerer, members }).catch((err) =>
          console.error('notifyFamilyMembers error:', err)
        );
      }
    }

    // Notify approved volunteers whose field matches this emergency type.
    // Each gets their own one-time token so when they open /v/<token>, the
    // backend can hydrate the page + record their accept/decline.
    let notifiedVolunteers = 0;
    try {
      const volunteers = await prisma.volunteer.findMany({
        where: { status: 'approved' },
        include: {
          citizen: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              country: true,
              dob: true,
            },
          },
        },
      });
      const matching = pickMatchingVolunteers(volunteers, emergency.type);
      notifiedVolunteers = matching.length;
      for (const v of matching) {
        const token = await issueToken(prisma, {
          emergencyId: emergency.id,
          audience: 'volunteer',
          audienceId: v.id,
          ttlMs: 6 * 60 * 60 * 1000, // 6h
        });
        notifyVolunteer({
          emergency,
          volunteer: v,
          citizen: v.citizen,
          token,
        }).catch((err) => console.error('notifyVolunteer error:', err));
      }
    } catch (err) {
      console.error('Volunteer fan-out error:', err);
    }

    res.status(201).json({
      emergency,
      notifiedInstitutions: matched.length,
      notifiedFamily,
      notifiedVolunteers,
    });
  } catch (err) {
    console.error('Create emergency error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/emergencies/active-nearby?lat=&lng=&radiusKm=
// Public — returns the count + summary of active emergencies within radius
// of the given coordinates. Used by the marketing home page's safety card.
router.get('/active-nearby', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radiusKm) || 5;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'lat and lng required' });
    }
    const radiusM = radiusKm * 1000;
    const active = await prisma.emergency.findMany({
      where: { status: { in: ['active', 'dispatched'] } },
      select: {
        id: true,
        type: true,
        victimLat: true,
        victimLng: true,
        createdAt: true,
      },
      take: 200,
    });
    const nearby = active
      .map((e) => ({
        ...e,
        distanceM: haversineMeters(
          { lat, lng },
          { lat: e.victimLat, lng: e.victimLng }
        ),
      }))
      .filter((e) => e.distanceM <= radiusM)
      .sort((a, b) => a.distanceM - b.distanceM);
    res.json({ count: nearby.length, emergencies: nearby });
  } catch (err) {
    console.error('Active-nearby error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Anonymous SOS — no login required ─────────────────────────────────
//
// Rules:
//   - Per-IP rate limit: 1 / 60s, 5 / hour (Redis-backed)
//   - No volunteer fan-out (institutions only)
//   - All identity defaults to "Anonymous" — the citizenId column stays
//     null and the institution UI's existing null-citizen path renders the
//     fallback card.
//   - The user's browser holds a `victim` audience EmergencyToken in
//     localStorage; that token gates the GET status and POST cancel
//     endpoints below.
//   - Anonymous emergencies that stay 'active' for > 4h are lazily
//     transitioned to 'expired' on next read — keeps abandoned reports
//     out of dispatcher feeds without needing a cron job.

const ANON_SOS_TYPES = new Set([
  'Shooting',
  'Medical',
  'Assault',
  'Fire',
  'Flooding',
]);
const ANON_LIFETIME_MS = 4 * 60 * 60 * 1000; // 4h

// Returns null on success or { status, body } if rate-limited.
async function checkAnonRateLimit(ip) {
  if (!ip) ip = 'unknown';
  // 1 per 60 seconds
  const mKey = `anon_sos:rl:m:${ip}`;
  const mCount = await redis.incr(mKey);
  if (mCount === 1) await redis.expire(mKey, 60);
  if (mCount > 1) {
    return {
      status: 429,
      body: {
        error: "You just sent an SOS. Wait a minute before sending another.",
      },
    };
  }
  // 5 per hour
  const hKey = `anon_sos:rl:h:${ip}`;
  const hCount = await redis.incr(hKey);
  if (hCount === 1) await redis.expire(hKey, 3600);
  if (hCount > 5) {
    return {
      status: 429,
      body: { error: 'Hourly SOS limit reached. Please contact emergency services directly.' },
    };
  }
  return null;
}

async function lazyExpireIfStale(emergency) {
  if (!emergency) return emergency;
  if (emergency.citizenId) return emergency; // only anonymous gets lazy-expired
  if (emergency.status !== 'active' && emergency.status !== 'dispatched') {
    return emergency;
  }
  const ageMs = Date.now() - new Date(emergency.createdAt).getTime();
  if (ageMs <= ANON_LIFETIME_MS) return emergency;
  return prisma.emergency.update({
    where: { id: emergency.id },
    data: { status: 'expired' },
  });
}

// POST /api/emergencies/anonymous
// Body: { type, lat, lng }
// Returns: { emergencyId, victimToken, expiresAt }
router.post('/anonymous', async (req, res) => {
  try {
    const limited = await checkAnonRateLimit(req.ip);
    if (limited) return res.status(limited.status).json(limited.body);

    const { type, lat, lng } = req.body || {};
    if (!ANON_SOS_TYPES.has(String(type))) {
      return res.status(400).json({ error: 'Invalid emergency type' });
    }
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'lat and lng required' });
    }

    const addressPromise = reverseGeocode(lat, lng).catch(() => null);

    const emergency = await prisma.emergency.create({
      data: {
        citizenId: null,
        type: String(type),
        victimLat: lat,
        victimLng: lng,
        status: 'active',
        source: 'sos_panic',
        priority: 'critical',
        notes: PANIC_NOTES_DEFAULT,
      },
    });

    addressPromise
      .then((address) => {
        if (!address) return;
        return prisma.emergency.update({
          where: { id: emergency.id },
          data: { address },
        });
      })
      .catch((e) => console.warn('Geocode patch failed:', e?.message || e));

    // Mint the victim-audience token. Lifetime matches ANON_LIFETIME_MS so
    // an abandoned localStorage entry can't be reused after expiry.
    const victimToken = await issueToken(prisma, {
      emergencyId: emergency.id,
      audience: 'victim',
      audienceId: emergency.id, // self-referential — no separate audience entity
      ttlMs: ANON_LIFETIME_MS,
    });

    // Fan out to matching institutions only (no volunteers, no family).
    const institutions = await prisma.institution.findMany({
      select: {
        id: true,
        name: true,
        responseNumbers: true,
        responseEmails: true,
        coveragePolygon: true,
      },
    });
    const matched = institutions.filter((inst) =>
      pointInPolygon({ lat, lng }, inst.coveragePolygon || [])
    );

    // Same broadcast shape as the citizen flow so institution dashboards
    // can render the row without refetching. citizen will be null.
    const broadcastable = await prisma.emergency.findUnique({
      where: { id: emergency.id },
      include: {
        citizen: {
          select: {
            spaersId: true,
            firstName: true,
            lastName: true,
            dob: true,
            email: true,
            phone: true,
            country: true,
            bloodGroup: true,
            allergies: true,
            chronicCondition: true,
            implantDevice: true,
          },
        },
        dispatches: { take: 0 },
      },
    });

    for (const inst of matched) {
      const token = await issueToken(prisma, {
        emergencyId: emergency.id,
        audience: 'institution',
        audienceId: inst.id,
      });
      notifyInstitution({ emergency, institution: inst, token }).catch((err) =>
        console.error('notifyInstitution(anon) error:', err)
      );
      realtime.emitInstitutionEmergencyCreated(inst.id, broadcastable);
    }

    res.status(201).json({
      emergencyId: emergency.id,
      victimToken,
      type: emergency.type,
      victimLat: emergency.victimLat,
      victimLng: emergency.victimLng,
      createdAt: emergency.createdAt,
      expiresAt: new Date(Date.now() + ANON_LIFETIME_MS),
      notifiedInstitutions: matched.length,
    });
  } catch (err) {
    console.error('Anonymous SOS create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/emergencies/anonymous/:token
// Returns the live state of the emergency for the victim's overlay.
router.get('/anonymous/:token', async (req, res) => {
  try {
    const t = await resolveToken(prisma, req.params.token);
    if (!t || t._invalidReason) {
      return res
        .status(404)
        .json({ error: t?._invalidReason || 'Invalid token' });
    }
    if (t.audience !== 'victim') {
      return res.status(403).json({ error: 'Wrong audience' });
    }
    let emergency = await prisma.emergency.findUnique({
      where: { id: t.emergencyId },
      include: {
        dispatches: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            dispatcher: { select: { name: true, dispatcherId: true } },
            institution: { select: { id: true, name: true, type: true } },
          },
        },
      },
    });
    if (!emergency) return res.status(404).json({ error: 'Not found' });
    emergency = await lazyExpireIfStale(emergency);
    res.json({ emergency });
  } catch (err) {
    console.error('Anonymous SOS get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/emergencies/anonymous/:token/cancel
// User clicked Cancel in the overlay. We move status to 'cancelled' and
// fan out a socket event to dispatchers (if any are en route) and to all
// institutions that had this row in their feed.
router.post('/anonymous/:token/cancel', async (req, res) => {
  try {
    const t = await resolveToken(prisma, req.params.token);
    if (!t || t._invalidReason) {
      return res
        .status(404)
        .json({ error: t?._invalidReason || 'Invalid token' });
    }
    if (t.audience !== 'victim') {
      return res.status(403).json({ error: 'Wrong audience' });
    }
    const emergency = await prisma.emergency.findUnique({
      where: { id: t.emergencyId },
    });
    if (!emergency) return res.status(404).json({ error: 'Not found' });
    if (emergency.status === 'resolved' || emergency.status === 'cancelled') {
      // Already terminal — return success so the client clears localStorage.
      return res.json({ ok: true, status: emergency.status });
    }
    const updated = await prisma.emergency.update({
      where: { id: emergency.id },
      data: { status: 'cancelled', resolvedAt: new Date() },
    });

    // Broadcast: drop pin from institution feeds, tell dispatchers en route
    // they can stand down. We reuse the existing 'emergency:resolved' event
    // (institutions already react to it by removing the row) and add a
    // dedicated 'emergency:cancelled' for nuance on the dispatcher side.
    const dispatchInstitutions = await prisma.emergencyDispatch.findMany({
      where: { emergencyId: emergency.id },
      select: { institutionId: true },
    });
    const institutionIds = [
      ...new Set(dispatchInstitutions.map((d) => d.institutionId)),
    ];
    realtime.emitEmergencyResolved(emergency.id, institutionIds);
    redis.del(`emergency_pos:${emergency.id}`).catch(() => {});

    res.json({ ok: true, status: updated.status });
  } catch (err) {
    console.error('Anonymous SOS cancel error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/emergencies/active — active emergencies in this institution's coverage
router.get('/active', session.requireAuth('institution'), async (req, res) => {
  try {
    const inst = await prisma.institution.findUnique({
      where: { id: req.session.userId },
      select: { id: true, coveragePolygon: true },
    });
    if (!inst) return res.status(404).json({ error: 'Not found' });

    // Active = status != resolved/cancelled. Include the latest dispatch +
    // citizen bio so the institution UI can show victim info + status.
    const candidates = await prisma.emergency.findMany({
      where: { status: { in: ['active', 'dispatched'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        citizen: {
          select: {
            spaersId: true,
            firstName: true,
            lastName: true,
            dob: true,
            email: true,
            phone: true,
            country: true,
            bloodGroup: true,
            allergies: true,
            chronicCondition: true,
            implantDevice: true,
          },
        },
        dispatches: {
          where: { institutionId: inst.id },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            dispatcher: {
              select: { name: true, dispatcherId: true },
            },
          },
        },
      },
    });
    const polygon = inst.coveragePolygon || [];
    const inCoverage = candidates.filter((e) =>
      pointInPolygon({ lat: e.victimLat, lng: e.victimLng }, polygon)
    );
    res.json({ emergencies: inCoverage });
  } catch (err) {
    console.error('Active emergencies error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/emergencies/history — past emergencies in this institution's coverage
router.get('/history', session.requireAuth('institution'), async (req, res) => {
  try {
    const inst = await prisma.institution.findUnique({
      where: { id: req.session.userId },
      select: { id: true, coveragePolygon: true },
    });
    if (!inst) return res.status(404).json({ error: 'Not found' });

    const all = await prisma.emergency.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        dispatches: {
          where: { institutionId: inst.id },
          include: { dispatcher: true },
        },
      },
    });
    const polygon = inst.coveragePolygon || [];
    const inCoverage = all.filter((e) =>
      pointInPolygon({ lat: e.victimLat, lng: e.victimLng }, polygon)
    );
    res.json({ emergencies: inCoverage });
  } catch (err) {
    console.error('History emergencies error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/emergencies/incidents — Incident Command feed for institutions.
//
// Returns every emergency whose victim location sits inside this institution's
// coverage polygon, regardless of status. Used by the responder "Incident
// Command" view, which client-side filters by status + priority.
//
// Differences from /active:
//   - Includes resolved / cancelled / expired rows (no status filter)
//   - Returns priority, source, anonymous, attachments
//   - When `anonymous=true`, the citizen identity block is replaced with a
//     minimal redacted stub so dispatchers can still triage but can't see who
//     filed the report
//
// Capped at 200 rows newest first; pagination can come later if it matters.
router.get(
  '/incidents',
  session.requireAuth('institution'),
  async (req, res) => {
    try {
      const inst = await prisma.institution.findUnique({
        where: { id: req.session.userId },
        select: { id: true, coveragePolygon: true },
      });
      if (!inst) return res.status(404).json({ error: 'Not found' });

      const candidates = await prisma.emergency.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          citizen: {
            select: {
              id: true,
              spaersId: true,
              firstName: true,
              lastName: true,
              dob: true,
              email: true,
              phone: true,
              country: true,
              bloodGroup: true,
              allergies: true,
              chronicCondition: true,
              implantDevice: true,
            },
          },
          dispatches: {
            where: { institutionId: inst.id },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              dispatcher: {
                select: { name: true, dispatcherId: true },
              },
            },
          },
          attachments: {
            select: {
              id: true,
              mediaKey: true,
              mediaType: true,
              sizeBytes: true,
              originalName: true,
              createdAt: true,
            },
          },
        },
      });

      const polygon = inst.coveragePolygon || [];
      const inCoverage = candidates.filter((e) =>
        pointInPolygon(
          { lat: e.victimLat, lng: e.victimLng },
          polygon
        )
      );

      res.json({ emergencies: inCoverage.map(sanitizeAnonymous) });
    } catch (err) {
      console.error('Incidents feed error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/emergencies/report — citizen files a slow-path incident report.
//
// Body: { type, description, priority, lat, lng, anonymous?, attachmentKeys? }
//
// Differences from POST /api/emergencies (panic SOS):
//   - Description is required (10–1000 chars)
//   - Citizen chooses the priority
//   - Citizen can flip `anonymous = true` to hide identity in cross-org views
//   - Fan-out is institutions ONLY — no family, no volunteers, no voice calls
//   - `notes` carries the citizen's description verbatim
router.post('/report', session.requireAuth('citizen'), async (req, res) => {
  try {
    const citizenId = req.session.userId;
    const {
      type,
      description,
      priority,
      lat,
      lng,
      anonymous,
      attachmentKeys,
    } = req.body || {};

    if (!EMERGENCY_TYPES.has(String(type))) {
      return res.status(400).json({ error: 'Invalid emergency type' });
    }
    const desc = String(description || '').trim();
    if (desc.length < 10) {
      return res.status(400).json({
        error: 'Description must be at least 10 characters',
      });
    }
    if (desc.length > 1000) {
      return res
        .status(400)
        .json({ error: 'Description must be at most 1000 characters' });
    }
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'lat and lng are required' });
    }
    if (!REPORT_PRIORITIES.has(String(priority))) {
      return res
        .status(400)
        .json({ error: 'priority must be low | medium | high | critical' });
    }

    const addressPromise = reverseGeocode(lat, lng).catch(() => null);

    // Build attachment rows from the supplied S3 keys. Citizen must have
    // uploaded each key via /api/uploads/sign with category='report-media'.
    // mediaType is auto-inferred from the key's extension so the API stays
    // simple: client just hands us keys, we figure out whether each one is
    // an image or a video (per the uploads-sign content-type whitelist).
    const inferMediaType = (key) => {
      const lower = String(key || '').toLowerCase();
      if (
        lower.endsWith('.mp4') ||
        lower.endsWith('.mov') ||
        lower.endsWith('.webm')
      ) {
        return 'video';
      }
      return 'image';
    };
    const attachmentData = Array.isArray(attachmentKeys)
      ? attachmentKeys
          .filter((k) => typeof k === 'string' && k.startsWith('report-media/'))
          .slice(0, 5) // hard cap: 5 attachments per report
          .map((mediaKey) => ({
            mediaKey,
            mediaType: inferMediaType(mediaKey),
          }))
      : [];

    const emergency = await prisma.emergency.create({
      data: {
        citizenId,
        type: String(type),
        victimLat: lat,
        victimLng: lng,
        status: 'active',
        source: 'report',
        priority: String(priority),
        anonymous: anonymous === true,
        notes: desc,
        attachments: attachmentData.length
          ? { create: attachmentData }
          : undefined,
      },
      include: { attachments: true },
    });

    // Match institutions whose coverage polygon contains the incident.
    const institutions = await prisma.institution.findMany({
      select: {
        id: true,
        name: true,
        responseNumbers: true,
        responseEmails: true,
        coveragePolygon: true,
      },
    });
    const matched = institutions.filter((inst) =>
      pointInPolygon({ lat, lng }, inst.coveragePolygon || [])
    );

    // Broadcast shape used by socket fan-out — mirrors what /active returns
    // so dispatcher dashboards can render the row without refetching.
    const broadcastable = await prisma.emergency.findUnique({
      where: { id: emergency.id },
      include: {
        citizen: {
          select: {
            spaersId: true,
            firstName: true,
            lastName: true,
            dob: true,
            email: true,
            phone: true,
            country: true,
            bloodGroup: true,
            allergies: true,
            chronicCondition: true,
            implantDevice: true,
          },
        },
        dispatches: { take: 0 },
        attachments: true,
      },
    });

    // Anonymous reports get their citizen block redacted before broadcast so
    // socket subscribers never see identifying info even by accident.
    const broadcastForInstitutions = sanitizeAnonymous(broadcastable);
    for (const inst of matched) {
      const token = await issueToken(prisma, {
        emergencyId: emergency.id,
        audience: 'institution',
        audienceId: inst.id,
      });
      // notifyInstitution covers SMS + email; voice is reserved for panic SOS.
      notifyInstitution({ emergency, institution: inst, token }).catch((err) =>
        console.error('notifyInstitution(report) error:', err)
      );
      realtime.emitInstitutionEmergencyCreated(
        inst.id,
        broadcastForInstitutions
      );
    }

    addressPromise
      .then((address) => {
        if (!address) return;
        return prisma.emergency.update({
          where: { id: emergency.id },
          data: { address },
        });
      })
      .catch((e) =>
        console.warn('Geocode patch failed (report):', e?.message || e)
      );

    res.status(201).json({
      emergency,
      notifiedInstitutions: matched.length,
    });
  } catch (err) {
    console.error('Create report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/emergencies/:id/cancel — authed citizen cancels their own report.
//
// Only allowed while status='active'. Once a dispatcher has picked it up
// (status='dispatched') we don't allow cancellation; same rule as the
// existing anonymous flow.
router.post('/:id/cancel', session.requireAuth('citizen'), async (req, res) => {
  try {
    const citizenId = req.session.userId;
    const emergency = await prisma.emergency.findUnique({
      where: { id: req.params.id },
      select: { id: true, citizenId: true, status: true },
    });
    if (!emergency) return res.status(404).json({ error: 'Not found' });
    if (emergency.citizenId !== citizenId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (emergency.status !== 'active') {
      return res.status(409).json({
        error: emergency.status === 'dispatched'
          ? 'A dispatcher is already on the way — cannot cancel.'
          : `Cannot cancel a ${emergency.status} report.`,
      });
    }
    const updated = await prisma.emergency.update({
      where: { id: emergency.id },
      data: { status: 'cancelled', resolvedAt: new Date() },
    });

    // Drop pin from any institution feeds that picked it up via socket.
    const dispatchInstitutions = await prisma.emergencyDispatch.findMany({
      where: { emergencyId: emergency.id },
      select: { institutionId: true },
    });
    const institutionIds = [
      ...new Set(dispatchInstitutions.map((d) => d.institutionId)),
    ];
    realtime.emitEmergencyResolved(emergency.id, institutionIds);
    redis.del(`emergency_pos:${emergency.id}`).catch(() => {});

    res.json({ ok: true, status: updated.status });
  } catch (err) {
    console.error('Cancel emergency error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/emergencies/:id/attachments — register a media key after the
// citizen finishes uploading the file to S3. Used as a fallback when the
// /report call didn't include the key (e.g. user adds a photo after the
// report is already filed). Cap at 5 attachments per emergency.
router.post(
  '/:id/attachments',
  session.requireAuth('citizen'),
  async (req, res) => {
    try {
      const citizenId = req.session.userId;
      const { mediaKey, mediaType, sizeBytes, originalName } = req.body || {};
      if (typeof mediaKey !== 'string' || !mediaKey.startsWith('report-media/')) {
        return res.status(400).json({ error: 'Invalid mediaKey' });
      }
      const allowed = new Set(['image', 'video', 'audio']);
      if (!allowed.has(String(mediaType))) {
        return res.status(400).json({ error: 'Invalid mediaType' });
      }
      const emergency = await prisma.emergency.findUnique({
        where: { id: req.params.id },
        select: { id: true, citizenId: true, source: true },
      });
      if (!emergency) return res.status(404).json({ error: 'Not found' });
      if (emergency.citizenId !== citizenId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (emergency.source !== 'report') {
        return res.status(400).json({
          error: 'Attachments are only allowed on report-source emergencies',
        });
      }
      const existing = await prisma.emergencyAttachment.count({
        where: { emergencyId: emergency.id },
      });
      if (existing >= 5) {
        return res.status(409).json({ error: 'Attachment limit reached (5)' });
      }
      const attachment = await prisma.emergencyAttachment.create({
        data: {
          emergencyId: emergency.id,
          mediaKey,
          mediaType: String(mediaType),
          sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : null,
          originalName: originalName ? String(originalName).slice(0, 200) : null,
        },
      });
      res.status(201).json({ attachment });
    } catch (err) {
      console.error('Add attachment error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/emergencies/mine — citizen's own report history.
//
// Powers the "My Reports" screen on web + mobile. Returns the citizen's full
// emergency history (every SOS press, every slow-path report) ordered newest
// first. Capped at 100 rows to keep payload tight; pagination can come later
// if it ever matters.
router.get('/mine', session.requireAuth('citizen'), async (req, res) => {
  try {
    const citizenId = req.session.userId;
    const rows = await prisma.emergency.findMany({
      where: { citizenId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        status: true,
        source: true,
        priority: true,
        anonymous: true,
        notes: true,
        address: true,
        victimLat: true,
        victimLng: true,
        createdAt: true,
        resolvedAt: true,
        attachments: {
          select: {
            id: true,
            mediaKey: true,
            mediaType: true,
            sizeBytes: true,
            originalName: true,
            createdAt: true,
          },
        },
      },
    });
    res.json({ emergencies: rows });
  } catch (err) {
    console.error('My emergencies error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/emergencies/:id — current state of a single emergency
router.get('/:id', session.requireAuth('citizen'), async (req, res) => {
  try {
    const citizenId = req.session.userId;
    const emergency = await prisma.emergency.findUnique({
      where: { id: req.params.id },
      include: {
        dispatches: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            dispatcher: { select: { name: true, dispatcherId: true } },
          },
        },
      },
    });
    if (!emergency) return res.status(404).json({ error: 'Not found' });
    if (emergency.citizenId && emergency.citizenId !== citizenId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json({ emergency });
  } catch (err) {
    console.error('Get emergency error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/emergencies/:id/admin-token — mint a fresh institution token
router.post('/:id/admin-token', session.requireAuth('institution'), async (req, res) => {
  try {
    const inst = await prisma.institution.findUnique({
      where: { id: req.session.userId },
      select: { id: true, coveragePolygon: true },
    });
    if (!inst) return res.status(404).json({ error: 'Institution not found' });

    const emergency = await prisma.emergency.findUnique({
      where: { id: req.params.id },
    });
    if (!emergency) return res.status(404).json({ error: 'Emergency not found' });
    if (
      !pointInPolygon(
        { lat: emergency.victimLat, lng: emergency.victimLng },
        inst.coveragePolygon || []
      )
    ) {
      return res.status(403).json({ error: 'Out of coverage' });
    }

    const token = await issueToken(prisma, {
      emergencyId: emergency.id,
      audience: 'institution',
      audienceId: inst.id,
      ttlMs: 30 * 60 * 1000,
    });
    res.json({ token });
  } catch (err) {
    console.error('Admin token error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

const express = require('express');
const prisma = require('../lib/prisma');
const session = require('../lib/session');

const router = express.Router();
router.use(session.requireAuth('citizen'));

// POST /api/volunteers/apply
// Body: { citizenId, field, idFileName }
// Creates or updates the volunteer application for a citizen. Status starts
// 'pending' on first apply and resets to 'pending' if they re-apply after a
// revocation (admin must re-approve).
router.post('/apply', async (req, res) => {
  try {
    const citizenId = req.session.userId;
    const { field, idFileName, idFileKey } = req.body || {};
    if (!field) {
      return res.status(400).json({ error: 'field required' });
    }
    const citizen = await prisma.citizen.findUnique({ where: { id: citizenId } });
    if (!citizen) return res.status(404).json({ error: 'Citizen not found' });

    const existing = await prisma.volunteer.findUnique({ where: { citizenId } });
    let volunteer;
    if (existing) {
      volunteer = await prisma.volunteer.update({
        where: { citizenId },
        data: {
          field: String(field).trim(),
          idFileName: idFileName ? String(idFileName).slice(0, 200) : existing.idFileName,
          idFileKey: idFileKey ? String(idFileKey).slice(0, 500) : existing.idFileKey,
          status: 'pending',
          decisionNote: null,
          decidedAt: null,
        },
      });
    } else {
      volunteer = await prisma.volunteer.create({
        data: {
          citizenId,
          field: String(field).trim(),
          idFileName: idFileName ? String(idFileName).slice(0, 200) : null,
          idFileKey: idFileKey ? String(idFileKey).slice(0, 500) : null,
          status: 'pending',
        },
      });
    }
    res.status(201).json({ volunteer });
  } catch (err) {
    console.error('Volunteer apply error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/volunteers/me
router.get('/me', async (req, res) => {
  try {
    const volunteer = await prisma.volunteer.findUnique({
      where: { citizenId: req.session.userId },
    });
    res.json({ volunteer: volunteer || null });
  } catch (err) {
    console.error('Volunteer me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Small helper that returns the current volunteer row for the caller. Used
// by every self-service state-transition endpoint below.
async function findMe(req) {
  return prisma.volunteer.findUnique({
    where: { citizenId: req.session.userId },
  });
}

// POST /api/volunteers/me/pause
// Approved volunteers can pause themselves. Responders stop being routed
// to them until they resume. Idempotent — pausing an already-paused row
// just returns it.
router.post('/me/pause', async (req, res) => {
  try {
    const existing = await findMe(req);
    if (!existing) return res.status(404).json({ error: 'No volunteer application on file' });
    if (existing.status === 'paused') return res.json({ volunteer: existing });
    if (existing.status !== 'approved') {
      return res
        .status(409)
        .json({ error: 'Only approved volunteers can pause' });
    }
    const volunteer = await prisma.volunteer.update({
      where: { citizenId: req.session.userId },
      data: { status: 'paused' },
    });
    res.json({ volunteer });
  } catch (err) {
    console.error('Volunteer pause error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/volunteers/me/resume
// Move a paused row back to approved. Idempotent — already-approved rows
// are returned as-is.
router.post('/me/resume', async (req, res) => {
  try {
    const existing = await findMe(req);
    if (!existing) return res.status(404).json({ error: 'No volunteer application on file' });
    if (existing.status === 'approved') return res.json({ volunteer: existing });
    if (existing.status !== 'paused') {
      return res
        .status(409)
        .json({ error: 'Only paused volunteers can resume' });
    }
    const volunteer = await prisma.volunteer.update({
      where: { citizenId: req.session.userId },
      data: { status: 'approved' },
    });
    res.json({ volunteer });
  } catch (err) {
    console.error('Volunteer resume error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/volunteers/me/stop
// Permanently exit the volunteer program. Row moves to `revoked` with a
// user-authored note. To come back the citizen has to reapply and be
// re-approved by an admin, same as any other revoked row.
router.post('/me/stop', async (req, res) => {
  try {
    const existing = await findMe(req);
    if (!existing) return res.status(404).json({ error: 'No volunteer application on file' });
    if (existing.status === 'revoked') return res.json({ volunteer: existing });
    const volunteer = await prisma.volunteer.update({
      where: { citizenId: req.session.userId },
      data: {
        status: 'revoked',
        decisionNote: 'User stopped volunteering',
        decidedAt: new Date(),
      },
    });
    res.json({ volunteer });
  } catch (err) {
    console.error('Volunteer stop error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

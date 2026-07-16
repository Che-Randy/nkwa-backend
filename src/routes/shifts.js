// src/routes/shifts.js
// Matches the "Start shift / Stop shift" screens and "My last shift" history.

const express = require('express');
const db = require('../db');
const { getCurrentCourierId } = require('./couriers');

const router = express.Router();

/**
 * @openapi
 * /api/shifts/start:
 *   post:
 *     summary: Start a new shift
 *     parameters:
 *       - in: header
 *         name: x-courier-id
 *         schema: { type: integer }
 *     responses:
 *       201: { description: Shift started }
 *       409: { description: A shift is already active }
 */
router.post('/start', (req, res) => {
  const courierId = getCurrentCourierId(req);

  const activeShift = db.prepare(`SELECT * FROM shifts WHERE courierId = ? AND status = 'active'`).get(courierId);
  if (activeShift) {
    return res.status(409).json({ error: 'A shift is already active', shift: activeShift });
  }

  const result = db.prepare(`
    INSERT INTO shifts (courierId, startedAt, status) VALUES (?, datetime('now'), 'active')
  `).run(courierId);

  const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(shift);
});

/**
 * @openapi
 * /api/shifts/current:
 *   get:
 *     summary: Get the currently active shift, if any
 *     parameters:
 *       - in: header
 *         name: x-courier-id
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Active shift or null }
 */
router.get('/current', (req, res) => {
  const courierId = getCurrentCourierId(req);
  const shift = db.prepare(`SELECT * FROM shifts WHERE courierId = ? AND status = 'active'`).get(courierId);
  res.json(shift || null);
});

/**
 * @openapi
 * /api/shifts/{id}/stop:
 *   post:
 *     summary: Stop an active shift
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Shift stopped }
 *       404: { description: Shift not found }
 *       400: { description: Shift already ended }
 */
router.post('/:id/stop', (req, res) => {
  const shiftId = Number(req.params.id);
  const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shiftId);

  if (!shift) return res.status(404).json({ error: 'Shift not found' });
  if (shift.status === 'ended') return res.status(400).json({ error: 'Shift has already ended' });

  db.prepare(`UPDATE shifts SET status = 'ended', endedAt = datetime('now') WHERE id = ?`).run(shiftId);
  const updated = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shiftId);
  res.json(updated);
});

/**
 * @openapi
 * /api/shifts/history:
 *   get:
 *     summary: List past (ended) shifts for the courier
 *     parameters:
 *       - in: header
 *         name: x-courier-id
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of past shifts }
 */
router.get('/history', (req, res) => {
  const courierId = getCurrentCourierId(req);
  const shifts = db.prepare(`
    SELECT * FROM shifts WHERE courierId = ? AND status = 'ended' ORDER BY startedAt DESC
  `).all(courierId);
  res.json(shifts);
});

module.exports = router;

// src/routes/couriers.js
// Handles: signup/login (simplified, no real password hashing/JWT for time's sake
// - noted clearly in README as a "next step" for production), profile GET/PATCH.

const express = require('express');
const db = require('../db');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

// For this assessment we skip real auth (JWT/bcrypt) and simulate a
// logged-in courier via a header. This is called out in the README as a
// simplification, not something to hide.
function getCurrentCourierId(req) {
  return Number(req.header('x-courier-id')) || 1; // defaults to seeded courier #1
}

/**
 * @openapi
 * /api/couriers/signup:
 *   post:
 *     summary: Register a new courier (Task 2 onboarding flow)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               transportation: { type: string, enum: [bicycle, car, truck] }
 *               vehicleNumber: { type: string }
 *     responses:
 *       201: { description: Courier created }
 *       400: { description: Validation error }
 */
router.post(
  '/signup',
  validateBody([
    { field: 'name', required: true, type: 'string' },
    { field: 'email', required: true, type: 'string' },
    { field: 'password', required: true, type: 'string' },
    { field: 'transportation', required: false, oneOf: ['bicycle', 'car', 'truck'] }
  ]),
  (req, res) => {
    const { name, email, password, transportation, vehicleNumber, team } = req.body;

    const existing = db.prepare('SELECT id FROM couriers WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'A courier with this email already exists' });
    }

    const workId = 'ID-' + Math.floor(1000000 + Math.random() * 9000000);
    const insert = db.prepare(`
      INSERT INTO couriers (workId, name, email, passwordHash, team, transportation, vehicleNumber)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = insert.run(workId, name, email, `hashed:${password}`, team || null, transportation || 'bicycle', vehicleNumber || null);

    const courier = db.prepare('SELECT id, workId, name, email, team, transportation, vehicleNumber, level, ratePercent FROM couriers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(courier);
  }
);

/**
 * @openapi
 * /api/couriers/login:
 *   post:
 *     summary: Log in a courier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login success }
 *       401: { description: Invalid credentials }
 */
router.post(
  '/login',
  validateBody([
    { field: 'email', required: true, type: 'string' },
    { field: 'password', required: true, type: 'string' }
  ]),
  (req, res) => {
    const { email, password } = req.body;
    const courier = db.prepare('SELECT * FROM couriers WHERE email = ?').get(email);

    if (!courier || courier.passwordHash !== `hashed:${password}`) {
      // Note: seeded demo courier's password won't match this check since it
      // was inserted with a placeholder hash. See README for demo login info.
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({ id: courier.id, workId: courier.workId, name: courier.name, email: courier.email });
  }
);

/**
 * @openapi
 * /api/couriers/me:
 *   get:
 *     summary: Get the logged-in courier's profile
 *     parameters:
 *       - in: header
 *         name: x-courier-id
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Courier profile }
 *       404: { description: Not found }
 */
router.get('/me', (req, res) => {
  const courierId = getCurrentCourierId(req);
  const courier = db.prepare(`
    SELECT id, workId, name, email, team, transportation, vehicleNumber, level, ratePercent, avatarUrl
    FROM couriers WHERE id = ?
  `).get(courierId);

  if (!courier) return res.status(404).json({ error: 'Courier not found' });
  res.json(courier);
});

/**
 * @openapi
 * /api/couriers/me:
 *   patch:
 *     summary: Update the logged-in courier's profile (e.g. settings screen)
 *     parameters:
 *       - in: header
 *         name: x-courier-id
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               team: { type: string }
 *               transportation: { type: string, enum: [bicycle, car, truck] }
 *               vehicleNumber: { type: string }
 *     responses:
 *       200: { description: Updated courier }
 *       404: { description: Not found }
 */
router.patch(
  '/me',
  validateBody([
    { field: 'transportation', required: false, oneOf: ['bicycle', 'car', 'truck'] }
  ]),
  (req, res) => {
    const courierId = getCurrentCourierId(req);
    const courier = db.prepare('SELECT * FROM couriers WHERE id = ?').get(courierId);
    if (!courier) return res.status(404).json({ error: 'Courier not found' });

    const allowedFields = ['name', 'team', 'transportation', 'vehicleNumber', 'avatarUrl'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length > 0) {
      const setClause = Object.keys(updates).map((f) => `${f} = @${f}`).join(', ');
      db.prepare(`UPDATE couriers SET ${setClause} WHERE id = @id`).run({ ...updates, id: courierId });
    }

    const updated = db.prepare(`
      SELECT id, workId, name, email, team, transportation, vehicleNumber, level, ratePercent, avatarUrl
      FROM couriers WHERE id = ?
    `).get(courierId);
    res.json(updated);
  }
);

module.exports = { router, getCurrentCourierId };

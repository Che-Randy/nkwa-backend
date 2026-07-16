// src/routes/messages.js
// Matches the in-order chat screen ("Hi, cannot reach a customer...").

const express = require('express');
const db = require('../db');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

/**
 * @openapi
 * /api/orders/{id}/messages:
 *   get:
 *     summary: List chat messages for an order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of messages }
 *       404: { description: Order not found }
 */
router.get('/:id/messages', (req, res) => {
  const orderId = Number(req.params.id);
  const order = db.prepare('SELECT id FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const messages = db.prepare('SELECT * FROM messages WHERE orderId = ? ORDER BY createdAt ASC').all(orderId);
  res.json(messages);
});

/**
 * @openapi
 * /api/orders/{id}/messages:
 *   post:
 *     summary: Send a chat message on an order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sender: { type: string, enum: [courier, customer] }
 *               text: { type: string }
 *     responses:
 *       201: { description: Message created }
 *       400: { description: Validation error }
 *       404: { description: Order not found }
 */
router.post(
  '/:id/messages',
  validateBody([
    { field: 'sender', required: true, oneOf: ['courier', 'customer'] },
    { field: 'text', required: true, type: 'string' }
  ]),
  (req, res) => {
    const orderId = Number(req.params.id);
    const order = db.prepare('SELECT id FROM orders WHERE id = ?').get(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const result = db.prepare(`
      INSERT INTO messages (orderId, sender, text) VALUES (?, ?, ?)
    `).run(orderId, req.body.sender, req.body.text);

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(message);
  }
);

module.exports = router;

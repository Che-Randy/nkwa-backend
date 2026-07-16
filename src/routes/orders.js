// src/routes/orders.js
// Matches the order list/detail/tracking screens ("#403-540", pickup/destination,
// items, total, "Show route on map", status changes).

const express = require('express');
const db = require('../db');
const { validateBody } = require('../middleware/validate');
const { getCurrentCourierId } = require('./couriers');

const router = express.Router();

function attachItems(order) {
  const items = db.prepare('SELECT id, name, price, notes FROM order_items WHERE orderId = ?').all(order.id);
  return { ...order, items };
}

/**
 * @openapi
 * /api/orders:
 *   get:
 *     summary: List orders for the courier, optionally filtered by status
 *     parameters:
 *       - in: header
 *         name: x-courier-id
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, delivering, delivered, cancelled] }
 *     responses:
 *       200: { description: List of orders }
 */
router.get('/', (req, res) => {
  const courierId = getCurrentCourierId(req);
  const { status } = req.query;

  let orders;
  if (status) {
    orders = db.prepare('SELECT * FROM orders WHERE courierId = ? AND status = ? ORDER BY createdAt DESC').all(courierId, status);
  } else {
    orders = db.prepare('SELECT * FROM orders WHERE courierId = ? ORDER BY createdAt DESC').all(courierId);
  }

  res.json(orders.map(attachItems));
});

/**
 * @openapi
 * /api/orders/current:
 *   get:
 *     summary: Get the order currently being delivered
 *     parameters:
 *       - in: header
 *         name: x-courier-id
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Current order or null }
 */
router.get('/current', (req, res) => {
  const courierId = getCurrentCourierId(req);
  const order = db.prepare(`SELECT * FROM orders WHERE courierId = ? AND status = 'delivering' ORDER BY createdAt DESC LIMIT 1`).get(courierId);
  res.json(order ? attachItems(order) : null);
});

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     summary: Get a single order's full detail
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Order detail }
 *       404: { description: Order not found }
 */
router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(attachItems(order));
});

/**
 * @openapi
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update an order's status (e.g. mark delivered)
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
 *               status: { type: string, enum: [pending, delivering, delivered, cancelled] }
 *     responses:
 *       200: { description: Updated order }
 *       400: { description: Invalid status }
 *       404: { description: Order not found }
 */
router.patch(
  '/:id/status',
  validateBody([{ field: 'status', required: true, oneOf: ['pending', 'delivering', 'delivered', 'cancelled'] }]),
  (req, res) => {
    const orderId = Number(req.params.id);
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, orderId);

    // If it's now delivered, credit the courier's wallet for the order + tip.
    if (req.body.status === 'delivered') {
      const insertTx = db.prepare(`INSERT INTO transactions (courierId, orderId, type, amount) VALUES (?, ?, ?, ?)`);
      if (order.courierEarning > 0) insertTx.run(order.courierId, orderId, 'earning', order.courierEarning);
      if (order.tip > 0) insertTx.run(order.courierId, orderId, 'tip', order.tip);
      db.prepare(`UPDATE shifts SET deliveriesCompleted = deliveriesCompleted + 1 WHERE id = ?`).run(order.shiftId);
    }

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    res.json(attachItems(updated));
  }
);

module.exports = router;

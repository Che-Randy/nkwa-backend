// src/routes/wallet.js
// Matches the Wallet tab: balance, tips, transaction history, withdraw.

const express = require('express');
const db = require('../db');
const { validateBody } = require('../middleware/validate');
const { getCurrentCourierId } = require('./couriers');

const router = express.Router();

function computeBalance(courierId) {
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type IN ('earning') THEN amount ELSE 0 END), 0) AS earnings,
      COALESCE(SUM(CASE WHEN type = 'tip' THEN amount ELSE 0 END), 0) AS tips,
      COALESCE(SUM(amount), 0) AS balance
    FROM transactions WHERE courierId = ?
  `).get(courierId);
  return row;
}

/**
 * @openapi
 * /api/wallet:
 *   get:
 *     summary: Get wallet balance and tips summary
 *     parameters:
 *       - in: header
 *         name: x-courier-id
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Wallet summary }
 */
router.get('/', (req, res) => {
  const courierId = getCurrentCourierId(req);
  const summary = computeBalance(courierId);
  res.json(summary);
});

/**
 * @openapi
 * /api/wallet/transactions:
 *   get:
 *     summary: List transactions for the courier
 *     parameters:
 *       - in: header
 *         name: x-courier-id
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of transactions }
 */
router.get('/transactions', (req, res) => {
  const courierId = getCurrentCourierId(req);
  const transactions = db.prepare(`
    SELECT * FROM transactions WHERE courierId = ? ORDER BY createdAt DESC
  `).all(courierId);
  res.json(transactions);
});

/**
 * @openapi
 * /api/wallet/withdraw:
 *   post:
 *     summary: Withdraw funds from the wallet
 *     parameters:
 *       - in: header
 *         name: x-courier-id
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number }
 *     responses:
 *       201: { description: Withdrawal recorded }
 *       400: { description: Invalid amount or insufficient balance }
 */
router.post(
  '/withdraw',
  validateBody([{ field: 'amount', required: true, type: 'number' }]),
  (req, res) => {
    const courierId = getCurrentCourierId(req);
    const { amount } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ error: 'Withdrawal amount must be greater than 0' });
    }

    const { balance } = computeBalance(courierId);
    if (amount > balance) {
      return res.status(400).json({ error: 'Insufficient balance', balance });
    }

    db.prepare(`
      INSERT INTO transactions (courierId, type, amount) VALUES (?, 'withdrawal', ?)
    `).run(courierId, -Math.abs(amount));

    const summary = computeBalance(courierId);
    res.status(201).json(summary);
  }
);

module.exports = router;

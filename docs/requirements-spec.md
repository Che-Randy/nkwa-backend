# Requirements Specification — Nkwa Delivery Buddy API

This document lists every endpoint implemented for the Delivery Buddy courier app,
derived directly from the provided UI mockups (onboarding, shift, wallet, order
tracking, and chat screens).

Full interactive docs (try-it-out) are available at **`/api-docs`** once the server
is running (Swagger/OpenAPI, generated from JSDoc comments in `src/routes/*.js`).

Auth note: to keep scope realistic for the timeframe, the courier is identified via
an `x-courier-id` header instead of full JWT sessions. This is called out explicitly
rather than hidden — see README "Design decisions & trade-offs".

---

## Couriers

| Method | URL | Purpose |
|---|---|---|
| POST | `/api/couriers/signup` | Register a new courier (onboarding "Step 2: personal info" screen) |
| POST | `/api/couriers/login` | Log in a courier |
| GET | `/api/couriers/me` | Get the logged-in courier's profile |
| PATCH | `/api/couriers/me` | Update profile (settings screen: team, transportation, vehicle) |

**Example — `GET /api/couriers/me`**
```json
{
  "id": 1,
  "workId": "ID-4873697",
  "name": "Tyler Teeler",
  "email": "tyler@example.com",
  "team": "Downtown",
  "transportation": "bicycle",
  "vehicleNumber": "RE 345 6",
  "level": 3,
  "ratePercent": 25
}
```

## Shifts

| Method | URL | Purpose |
|---|---|---|
| POST | `/api/shifts/start` | Start a shift ("Start shift" button) |
| GET | `/api/shifts/current` | Get the currently active shift |
| POST | `/api/shifts/:id/stop` | End a shift ("Stop shift" button) |
| GET | `/api/shifts/history` | List past shifts ("My last shift" section) |

**Example — `POST /api/shifts/start`** → `201 Created`
```json
{ "id": 4, "courierId": 1, "startedAt": "2026-07-14 10:00:00", "status": "active", "earned": 0, "tips": 0, "deliveriesCompleted": 0 }
```

## Wallet

| Method | URL | Purpose |
|---|---|---|
| GET | `/api/wallet` | Get balance/tips summary (Wallet tab) |
| GET | `/api/wallet/transactions` | List transaction history |
| POST | `/api/wallet/withdraw` | Withdraw funds ("Withdraw" button) |

**Example — `GET /api/wallet`**
```json
{ "earnings": 45.05, "tips": 0, "balance": -624.95 }
```

**Example — `POST /api/wallet/withdraw`** request body
```json
{ "amount": 100 }
```
Errors: `400` if `amount` isn't a positive number, or exceeds current balance.

## Orders

| Method | URL | Purpose |
|---|---|---|
| GET | `/api/orders` | List orders, optional `?status=` filter |
| GET | `/api/orders/current` | Get the order currently being delivered (tracking screen) |
| GET | `/api/orders/:id` | Get one order's full detail (order detail screen) |
| PATCH | `/api/orders/:id/status` | Update order status, e.g. mark delivered |

**Example — `GET /api/orders/:id`**
```json
{
  "id": 1,
  "orderNumber": "#403-540",
  "status": "delivering",
  "pickupName": "Lazzy Pizza",
  "destinationAddress": "1142 Madison Ave, apt 34",
  "total": 42,
  "tip": 8,
  "items": [
    { "id": 1, "name": "Ham and Cheese Pizza 11 inch", "price": 12 }
  ]
}
```
Marking an order `delivered` automatically credits the courier's wallet
(earning + tip transactions) — this models the "Your earn / Tip" summary shown
on the order-detail screen.

## Order Messages (chat)

| Method | URL | Purpose |
|---|---|---|
| GET | `/api/orders/:id/messages` | List chat messages for an order |
| POST | `/api/orders/:id/messages` | Send a message |

**Example — `POST /api/orders/:id/messages`** request body
```json
{ "sender": "courier", "text": "On my way!" }
```

---

## Error format

All validation and not-found errors follow a consistent shape:
```json
{ "error": "Validation failed", "details": ["\"email\" is required"] }
```
```json
{ "error": "Order not found" }
```

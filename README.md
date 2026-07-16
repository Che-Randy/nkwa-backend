# Nkwa Delivery Buddy — Backend API

Backend service for the "Delivery Buddy" courier app (Nkwa Backend Engineering
Internship Assessment). Built with **Express.js** + **SQLite**.

- 📄 Requirements spec: [`docs/requirements-spec.md`](docs/requirements-spec.md)
- 🗺️ Data model / ERD: [`docs/erd.md`](docs/erd.md)
- 📑 Live interactive API docs: `/api-docs` (Swagger UI, once running)
- 🌐 Live deployed API: **`<PASTE YOUR RENDER/RAILWAY URL HERE>`**

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Express.js | Minimal, well-documented, fast to build a REST API with |
| Storage | SQLite (`better-sqlite3`) | Relational data (orders → couriers → transactions) with zero server setup — file-based, ships with the repo |
| Docs | `swagger-jsdoc` + `swagger-ui-express` | Generates OpenAPI spec straight from JSDoc comments in the routes, plus a try-it-out UI |
| Testing | Jest + Supertest | Standard, well-supported combo for testing Express APIs |
| Deployment | Render (free tier) | Zero-config Node deploys straight from GitHub |

## Getting started

```bash
git clone <your-repo-url>
cd nkwa-backend
npm install
cp .env.example .env
npm run dev      # starts on http://localhost:3000 with auto-reload
```

The database (`data.sqlite`) is created and seeded automatically on first run —
no manual setup needed. It comes with:
- One seeded courier (`Tyler Teeler`, id `1`) matching the profile screen in the mockups
- One seeded in-progress order (`#403-540`) matching the tracking/detail screens
- A couple of seeded chat messages and transactions

Since there's no full auth flow yet (see trade-offs below), most endpoints identify
"the logged-in courier" via an `x-courier-id` header. If omitted, it defaults to `1`
(the seeded courier), so you can try every endpoint immediately with no setup.

## Running tests

```bash
npm test
```

This runs 19 Jest/Supertest tests covering:
- Request validation (missing/invalid fields → `400`)
- Correct data returned for valid requests
- Proper error responses for invalid ones (`404`s, `409` on double-starting a shift, `400` on over-withdrawing)

All 19 currently pass:

```
Test Suites: 1 passed, 1 total
Tests:       19 passed, 19 total
```

## API docs

Once running, open **`http://localhost:3000/api-docs`** for the full interactive
OpenAPI/Swagger spec — you can try every endpoint from the browser. A written
version with example payloads is also in [`docs/requirements-spec.md`](docs/requirements-spec.md).

## Project structure

```
src/
  app.js            # Express app + route mounting (exported for tests)
  server.js          # actual entry point (starts the HTTP server)
  db.js              # SQLite schema + seed data
  swagger.js         # OpenAPI spec generation
  middleware/
    validate.js      # small reusable request-body validator
  routes/
    couriers.js       # signup/login/profile
    shifts.js         # start/stop/history
    wallet.js          # balance/transactions/withdraw
    orders.js          # list/detail/status update
    messages.js        # order chat
tests/
  api.test.js        # Jest + Supertest suite
docs/
  requirements-spec.md
  erd.md
```

## Deploying (Render, free tier)

1. Push this repo to GitHub.
2. Go to [render.com](https://render.com) → New → Web Service → connect the repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Render auto-detects the port from `process.env.PORT` (already wired up in `server.js`).
5. Once deployed, copy the live URL into this README's top section and into your
   submission email.

*(Railway works the same way — connect repo, it auto-detects Node, deploys.)*

## Design decisions & trade-offs (given the 5-day/short timeframe)

- **Auth is simplified.** Signup/login exist, but there's no JWT/session
  middleware — the courier is identified via `x-courier-id` header. In a real
  build this would be `bcrypt` password hashing + JWT access tokens with an
  `authenticate` middleware guarding every route.
- **SQLite instead of Postgres/MongoDB.** Chosen so the reviewer can clone and
  run the repo with zero infra setup. The schema (see ERD) maps directly onto
  Postgres if this were to scale.
- **No caching layer (e.g. Redis) added.** The assessment mentions caching a
  "coin list" as an example — this app doesn't call a slow third-party API, so
  there's nothing expensive to cache yet. If it did (e.g. a live map/ETA
  provider), the same `db.js` pattern would be extended with a `cache` table
  or a Redis client, with a TTL on entries.
- **Order → wallet crediting** happens automatically when an order's status is
  set to `delivered`, mirroring the "Your earn / Tip" summary shown on the
  order-detail mockup.

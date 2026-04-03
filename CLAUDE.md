# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`cd backend`)
```bash
npm run dev       # start with hot reload (tsx watch)
npm run build     # compile TypeScript → dist/
npm start         # run compiled output
npm run migrate   # run DB migrations (creates tables if not exist)
```

### Frontend (`cd frontend`)
```bash
npm run dev       # Next.js dev server on :3000
npm run build     # production build
npm start         # serve production build
npm run lint      # ESLint
```

### Full stack via Docker
```bash
docker compose up --build   # starts postgres + backend + frontend
```
Postgres starts first (healthcheck), backend auto-migrates then starts, frontend starts last.

### Running a manual price check (without waiting for the 6h cron)
```bash
cd backend && npx tsx src/index.ts   # starts server which fires checkAllAlerts() immediately on boot
```

## Architecture

The app has two independent services and a shared Postgres database.

### Backend (`backend/src/`)
- **`index.ts`** — Express server entry point; mounts routes, calls `startScheduler()` on boot
- **`scheduler/index.ts`** — `node-cron` job that calls `checkAllAlerts()` every `POLL_INTERVAL_HOURS` (default 6), and also once immediately on startup
- **`services/priceChecker.ts`** — core logic: loads all active alerts, generates `(departure, return)` date pairs by sliding a window of `trip_duration_days` across `[window_start, window_end]`, calls Duffel for each pair, saves best price to `price_history`, sends notification if `price <= max_price_usd`
- **`services/duffel.ts`** — wraps Duffel API; filters results to `AIRLINE_IATA` (env var, set `LY` for El Al in production, unset in sandbox). Has a 15s `Promise.race` timeout per request to prevent hangs.
- **`services/notifications.ts`** — sends email via SendGrid
- **`api/alerts.ts`** — REST routes: `POST /alerts`, `GET /alerts?email=`, `GET /alerts/:id/prices`, `PATCH /alerts/:id`, `DELETE /alerts/:id`
- **`db/migrate.ts`** — idempotent migration; creates `users`, `alerts`, `price_history` tables
- **`db/pool.ts`** — shared `pg.Pool` instance

### Frontend (`frontend/app/`)
- **`page.tsx`** — home page (server component) with `CreateAlertForm` client component
- **`alerts/page.tsx`** — server component; fetches alerts + price history server-side, renders `AlertCard` list
- **`components/CreateAlertForm.tsx`** — client component; `POST /alerts`, redirects to `/alerts?email=`
- **`components/AlertCard.tsx`** — client component; shows stats, pause/resume toggle, renders `PriceChart`
- **`components/PriceChart.tsx`** — Recharts `LineChart` with a red dashed reference line at the price threshold

### Key data flow
1. User creates alert via form → `POST /alerts` → stored in DB
2. Scheduler ticks → `priceChecker` slides date window → calls Duffel for each pair → saves to `price_history` → emails if under threshold
3. Alerts page fetches from backend server-side (`API_URL=http://backend:3001` in Docker, `http://localhost:3001` locally)
4. Browser client components call `NEXT_PUBLIC_API_URL=http://localhost:3001` (always the public address)

### Environment variables
Backend `.env`:
- `DUFFEL_API_KEY` — `duffel_test_*` for sandbox, `duffel_live_*` for production
- `AIRLINE_IATA` — set to `LY` in production to filter El Al only; unset in sandbox (Duffel Airways returns all)
- `DATABASE_URL` — locally: `postgresql://avitalfine@localhost:5432/elal_finder` (no password, macOS Homebrew Postgres)
- `SENDGRID_API_KEY` / `FROM_EMAIL`
- `POLL_INTERVAL_HOURS` (default 6)

Frontend `.env.local`:
- `NEXT_PUBLIC_API_URL` — used by browser (always `http://localhost:3001`)
- `API_URL` — used by Next.js server-side (`http://backend:3001` in Docker)

### Sandbox vs production
Duffel sandbox only serves fictional "Duffel Airways" flights — real El Al (IATA: `LY`) data requires a production key. The `AIRLINE_IATA` env var controls the filter; leave it unset to accept all airlines in sandbox.

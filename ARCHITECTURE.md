# El Al Flight Price Tracker — Architecture

## Overview

A flight price monitoring app that watches El Al routes over a configurable date window, tracks price history, and sends notifications when prices drop below a user-defined threshold.

---

## APIs & External Services

### Flight Data — Duffel API (Recommended)
- **Why Duffel**: Explicitly supports El Al via Travelport GDS. Developer-friendly, has a free sandbox, and charges only when searches significantly exceed bookings.
- **Pricing**: Free sandbox; production at $0.005 per excess search beyond the booking ratio.
- **Key endpoints**:
  - `POST /air/offer_requests` — search available flights for a given route + date range
  - `GET /air/offers/{id}` — get current price for a specific offer
  - `GET /air/offers` — list offers from a request
- **Auth**: API key in `Authorization: Bearer duffel_live_xxx` header
- **SDKs**: JavaScript (`@duffel/api`), Python
- **Sign up**: https://app.duffel.com/join

### Alternative: Amadeus Self-Service API
- Supports 400+ airlines including El Al
- Free sandbox; production pricing on request
- OAuth 2.0 (token expires every 30 min)
- Endpoint: `GET /v2/shopping/flight-offers`
- Docs: https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search

### Notifications
| Channel | Service | Notes |
|---------|---------|-------|
| Email | SendGrid | Free tier: 100 emails/day |
| SMS | Twilio | ~$0.01–0.05 per SMS |
| Push (optional) | Firebase FCM | Free for mobile/web push |

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                 │
│  - Search form: origin, destination, date window,   │
│    trip duration, max price threshold               │
│  - Price history chart (per search alert)           │
│  - Manage active alerts                             │
└───────────────────┬─────────────────────────────────┘
                    │ REST API
┌───────────────────▼─────────────────────────────────┐
│                 Backend (Node.js / Express)          │
│                                                     │
│  POST /alerts       — create a new price alert      │
│  GET  /alerts       — list user's alerts            │
│  DELETE /alerts/:id — remove an alert               │
│  GET  /alerts/:id/prices — price history            │
└──────┬────────────────────────┬───────────────────-─┘
       │                        │
┌──────▼──────┐        ┌────────▼────────┐
│  PostgreSQL  │        │   Scheduler     │
│             │        │  (node-cron)    │
│  - users    │        │                 │
│  - alerts   │        │  Every 6 hours: │
│  - price_   │        │  for each alert │
│    history  │        │  → query Duffel │
└─────────────┘        │  → save price   │
                       │  → check thresh │
                       │  → notify if ↓  │
                       └────────┬────────┘
                                │
                  ┌─────────────▼────────────┐
                  │   Notification Service   │
                  │  SendGrid (email)        │
                  │  Twilio (SMS, optional)  │
                  └──────────────────────────┘
```

---

## Data Model

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| email | text | for email alerts |
| phone | text | optional, for SMS |
| created_at | timestamptz | |

### `alerts`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| origin | char(3) | IATA code (e.g. `TLV`) |
| destination | char(3) | IATA code (e.g. `JFK`) |
| window_start | date | earliest departure date |
| window_end | date | latest departure date |
| trip_duration_days | int | e.g. 10 |
| max_price_usd | numeric | alert threshold |
| is_active | boolean | |
| created_at | timestamptz | |

### `price_history`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| alert_id | UUID | FK → alerts |
| checked_at | timestamptz | when the poll ran |
| departure_date | date | best departure found |
| return_date | date | best return found |
| price_usd | numeric | lowest price found |
| offer_id | text | Duffel offer ID |

---

## Core Algorithm: Price Polling

For each active alert, the scheduler does:

1. **Generate date windows**: slide a `trip_duration_days` window across `[window_start, window_end]` to produce candidate `(departure, return)` pairs.
2. **Query Duffel**: call `POST /air/offer_requests` for each candidate pair, filtering `airline_iata_code = "LY"` (El Al IATA code).
3. **Find lowest price**: extract the minimum priced offer from results.
4. **Save to `price_history`**.
5. **Check threshold**: if `price_usd <= alert.max_price_usd` AND this is a new low (or first hit), send notification.
6. **Rate limiting**: batch requests, add delays between calls to respect Duffel's rate limits.

---

## Folder Structure

```
el-al-finder/
├── backend/
│   ├── src/
│   │   ├── api/          # Express route handlers
│   │   ├── scheduler/    # node-cron jobs
│   │   ├── services/
│   │   │   ├── duffel.ts       # Duffel API client
│   │   │   ├── notifications.ts # SendGrid + Twilio
│   │   │   └── priceChecker.ts  # polling logic
│   │   ├── db/           # migrations + query helpers
│   │   └── index.ts
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── app/              # Next.js app router
│   │   ├── page.tsx      # home: create alert
│   │   └── alerts/       # manage alerts + price charts
│   └── package.json
├── docker-compose.yml    # postgres + backend + frontend
└── ARCHITECTURE.md
```

---

## Environment Variables

```env
# Duffel
DUFFEL_API_KEY=duffel_live_xxx

# SendGrid
SENDGRID_API_KEY=SG.xxx
FROM_EMAIL=alerts@yourdomain.com

# Twilio (optional)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+1xxxxxxxxxx

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/elal_finder

# App
POLL_INTERVAL_HOURS=6
```

---

## Implementation Phases

### Phase 1 — Core (MVP)
- [ ] Set up Postgres schema + migrations
- [ ] Duffel API client wrapper (search El Al offers)
- [ ] `POST /alerts` endpoint
- [ ] Scheduler: poll every 6 hours, save price history
- [ ] Email notification via SendGrid when threshold crossed

### Phase 2 — Frontend
- [ ] Next.js form to create alerts (origin, destination, dates, duration, max price)
- [ ] Dashboard: list active alerts + price history chart
- [ ] Alert management (pause / delete)

### Phase 3 — Enhancements
- [ ] SMS notifications via Twilio
- [ ] Price trend visualization
- [ ] Multi-passenger support
- [ ] Flexible destination (e.g., "anywhere in Europe")
- [ ] Auth (email magic link or Google OAuth)

---

## Key Notes

- El Al's IATA code is **LY**. Filter Duffel results by this to surface only El Al flights.
- Duffel's sandbox uses fictional "Duffel Airways" — real El Al data only appears in production mode.
- El Al primarily flies out of **TLV** (Ben Gurion). Supported routes cover North America, Europe, and Asia.
- Duffel charges per *excess* search — polling 6-hourly for ~10 alerts is within normal usage; scale mindfully.
- For Shabbat/Jewish holidays, El Al does not operate flights — the scheduler should not treat missing results as errors.

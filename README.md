# El Al Flight Price Tracker

Monitors El Al flight prices over a configurable date window and emails you when prices drop below your threshold.

## How it works

1. Create an alert with origin, destination, date window, trip duration, and max price
2. The backend polls Duffel every 6 hours, sliding the date window to find the cheapest available El Al flight
3. Price history is saved to Postgres and charted in the UI
4. You get an email when a price at or below your threshold is found

## Stack

- **Backend**: Node.js + Express + TypeScript, `node-cron` scheduler, Duffel API, SendGrid
- **Frontend**: Next.js (App Router), Recharts
- **Database**: PostgreSQL
- **Infrastructure**: Docker Compose

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL (local) or Docker

### Local setup

1. **Clone and install dependencies**

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configure environment**

   Create `backend/.env`:
   ```env
   DUFFEL_API_KEY=duffel_test_xxx
   DATABASE_URL=postgresql://username@localhost:5432/elal_finder
   SENDGRID_API_KEY=SG.xxx
   FROM_EMAIL=alerts@yourdomain.com
   POLL_INTERVAL_HOURS=6
   # Leave AIRLINE_IATA unset for sandbox (Duffel Airways); set to LY for production
   ```

   Create `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   API_URL=http://localhost:3001
   ```

3. **Run migrations and start**

   ```bash
   cd backend && npm run migrate && npm run dev
   cd frontend && npm run dev
   ```

   Frontend: http://localhost:3000  
   Backend: http://localhost:3001

### Docker (full stack)

```bash
docker compose up --build
```

Starts Postgres, backend (auto-migrates on boot), and frontend.

## Sandbox vs production

Duffel's sandbox only returns fictional "Duffel Airways" flights. To see real El Al data, use a production Duffel API key and set `AIRLINE_IATA=LY` in `backend/.env`.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/alerts` | Create a price alert |
| `GET` | `/alerts?email=` | List alerts for an email |
| `GET` | `/alerts/:id/prices` | Price history for an alert |
| `PATCH` | `/alerts/:id` | Update an alert (e.g. pause/resume) |
| `DELETE` | `/alerts/:id` | Delete an alert |

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pool_1 = require("./pool");
async function migrate() {
    const client = await pool_1.pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email       TEXT NOT NULL UNIQUE,
        phone       TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        await client.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        origin              CHAR(3) NOT NULL,
        destination         CHAR(3) NOT NULL,
        window_start        DATE NOT NULL,
        window_end          DATE NOT NULL,
        trip_duration_days  INT NOT NULL,
        max_price_usd       NUMERIC(10,2) NOT NULL,
        is_active           BOOLEAN NOT NULL DEFAULT TRUE,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        await client.query(`
      CREATE TABLE IF NOT EXISTS price_history (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_id        UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
        checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        departure_date  DATE NOT NULL,
        return_date     DATE NOT NULL,
        price_usd       NUMERIC(10,2) NOT NULL,
        offer_id        TEXT NOT NULL
      )
    `);
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_price_history_alert_id ON price_history(alert_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active) WHERE is_active = TRUE;
    `);
        await client.query('COMMIT');
        console.log('Migration complete.');
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
        await pool_1.pool.end();
    }
}
migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});

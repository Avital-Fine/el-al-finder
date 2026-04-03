import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';

const router = Router();

// POST /alerts — create a new alert (also creates user if needed)
router.post('/', async (req: Request, res: Response) => {
  const { email, phone, origin, destination, window_start, window_end, trip_duration_days, max_price_usd } = req.body;

  if (!email || !origin || !destination || !window_start || !window_end || !trip_duration_days || !max_price_usd) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  if (new Date(window_start) >= new Date(window_end)) {
    res.status(400).json({ error: 'window_start must be before window_end' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert user by email
    const userResult = await client.query(
      `INSERT INTO users (email, phone)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET phone = EXCLUDED.phone
       RETURNING id`,
      [email, phone ?? null],
    );
    const userId = userResult.rows[0].id;

    const alertResult = await client.query(
      `INSERT INTO alerts (user_id, origin, destination, window_start, window_end, trip_duration_days, max_price_usd)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, origin.toUpperCase(), destination.toUpperCase(), window_start, window_end, trip_duration_days, max_price_usd],
    );

    await client.query('COMMIT');
    res.status(201).json(alertResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[api] Failed to create alert:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /alerts?email=xxx — list all alerts for a user
router.get('/', async (req: Request, res: Response) => {
  const { email } = req.query;
  if (!email) {
    res.status(400).json({ error: 'email query param is required' });
    return;
  }

  const { rows } = await pool.query(
    `SELECT a.*
     FROM alerts a
     JOIN users u ON u.id = a.user_id
     WHERE u.email = $1
     ORDER BY a.created_at DESC`,
    [email],
  );
  res.json(rows);
});

// GET /alerts/:id/prices — price history for an alert
router.get('/:id/prices', async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT * FROM price_history WHERE alert_id = $1 ORDER BY checked_at DESC`,
    [req.params.id],
  );
  res.json(rows);
});

// PATCH /alerts/:id — toggle is_active
router.patch('/:id', async (req: Request, res: Response) => {
  const { is_active } = req.body;
  if (typeof is_active !== 'boolean') {
    res.status(400).json({ error: 'is_active must be a boolean' });
    return;
  }

  const { rows } = await pool.query(
    `UPDATE alerts SET is_active = $1 WHERE id = $2 RETURNING *`,
    [is_active, req.params.id],
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }
  res.json(rows[0]);
});

// DELETE /alerts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  await pool.query('DELETE FROM alerts WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

export default router;

import { pool } from '../db/pool';
import { searchCheapestOffer } from './duffel';
import { sendPriceAlert } from './notifications';

interface Alert {
  id: string;
  user_id: string;
  origin: string;
  destination: string;
  window_start: Date;
  window_end: Date;
  trip_duration_days: number;
  flexible_duration: boolean;
  max_price_usd: number;
  email: string;
}

/**
 * Generate all (departure, return) date pairs by sliding a window
 * of `durationDays` across [windowStart, windowEnd].
 */
function generateDatePairs(
  windowStart: Date,
  windowEnd: Date,
  durationDays: number,
): Array<{ departure: string; return: string }> {
  const pairs: Array<{ departure: string; return: string }> = [];
  const current = new Date(windowStart);

  while (current <= windowEnd) {
    const returnDate = new Date(current);
    returnDate.setDate(returnDate.getDate() + durationDays);

    if (returnDate <= windowEnd) {
      pairs.push({
        departure: current.toISOString().split('T')[0],
        return: returnDate.toISOString().split('T')[0],
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return pairs;
}

/** Sleep helper to avoid hammering the Duffel API */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Check all active alerts once. Called by the scheduler. */
export async function checkAllAlerts(): Promise<void> {
  const { rows: alerts } = await pool.query<Alert>(`
    SELECT a.*, u.email
    FROM alerts a
    JOIN users u ON u.id = a.user_id
    WHERE a.is_active = TRUE
  `);

  console.log(`[checker] Running price check for ${alerts.length} active alert(s)`);

  for (const alert of alerts) {
    await checkAlert(alert);
    await sleep(1000); // 1 s between alerts to respect rate limits
  }
}

async function checkAlert(alert: Alert): Promise<void> {
  const maxDuration = alert.flexible_duration
    ? alert.trip_duration_days + 3
    : alert.trip_duration_days;

  const pairs: Array<{ departure: string; return: string }> = [];
  for (let d = alert.trip_duration_days; d <= maxDuration; d++) {
    pairs.push(...generateDatePairs(new Date(alert.window_start), new Date(alert.window_end), d));
  }

  let bestResult: { departure: string; return: string; price: number; offerId: string } | null = null;

  for (const pair of pairs) {
    try {
      const result = await searchCheapestOffer(
        alert.origin,
        alert.destination,
        pair.departure,
        pair.return,
      );

      if (result && (bestResult === null || result.priceUsd < bestResult.price)) {
        bestResult = {
          departure: result.departureDate,
          return: result.returnDate,
          price: result.priceUsd,
          offerId: result.offerId,
        };
      }
    } catch (err) {
      // Log but don't abort — one failed date pair shouldn't stop the rest
      console.error(`[checker] Failed to fetch ${pair.departure}→${pair.return} for alert ${alert.id}:`, err);
    }

    await sleep(300); // 300 ms between Duffel calls
  }

  if (!bestResult) {
    console.log(`[checker] No El Al flights found for alert ${alert.id}`);
    return;
  }

  // Persist price history
  await pool.query(
    `INSERT INTO price_history (alert_id, departure_date, return_date, price_usd, offer_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [alert.id, bestResult.departure, bestResult.return, bestResult.price, bestResult.offerId],
  );

  console.log(`[checker] Alert ${alert.id}: best price $${bestResult.price} (threshold $${alert.max_price_usd})`);

  // Notify only if price is at or below threshold
  if (bestResult.price <= Number(alert.max_price_usd)) {
    await sendPriceAlert({
      toEmail: alert.email,
      origin: alert.origin,
      destination: alert.destination,
      departureDate: bestResult.departure,
      returnDate: bestResult.return,
      priceUsd: bestResult.price,
      maxPriceUsd: Number(alert.max_price_usd),
    });
  }
}

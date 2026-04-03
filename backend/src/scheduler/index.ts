import cron from 'node-cron';
import { checkAllAlerts } from '../services/priceChecker';

const HOURS = parseInt(process.env.POLL_INTERVAL_HOURS ?? '6', 10);

// Build a cron expression like "0 */6 * * *"
const cronExpression = `0 */${HOURS} * * *`;

export function startScheduler(): void {
  console.log(`[scheduler] Starting — will poll every ${HOURS} hour(s) (${cronExpression})`);

  cron.schedule(cronExpression, async () => {
    console.log(`[scheduler] Tick at ${new Date().toISOString()}`);
    try {
      await checkAllAlerts();
    } catch (err) {
      console.error('[scheduler] Unhandled error during price check:', err);
    }
  });

  // Run once immediately on startup so you don't wait for the first tick
  checkAllAlerts().catch((err) =>
    console.error('[scheduler] Initial check failed:', err),
  );
}

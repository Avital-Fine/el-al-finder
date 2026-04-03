"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduler = startScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const priceChecker_1 = require("../services/priceChecker");
const HOURS = parseInt(process.env.POLL_INTERVAL_HOURS ?? '6', 10);
// Build a cron expression like "0 */6 * * *"
const cronExpression = `0 */${HOURS} * * *`;
function startScheduler() {
    console.log(`[scheduler] Starting — will poll every ${HOURS} hour(s) (${cronExpression})`);
    node_cron_1.default.schedule(cronExpression, async () => {
        console.log(`[scheduler] Tick at ${new Date().toISOString()}`);
        try {
            await (0, priceChecker_1.checkAllAlerts)();
        }
        catch (err) {
            console.error('[scheduler] Unhandled error during price check:', err);
        }
    });
    // Run once immediately on startup so you don't wait for the first tick
    (0, priceChecker_1.checkAllAlerts)().catch((err) => console.error('[scheduler] Initial check failed:', err));
}

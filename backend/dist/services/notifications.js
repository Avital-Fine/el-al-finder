"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPriceAlert = sendPriceAlert;
const mail_1 = __importDefault(require("@sendgrid/mail"));
require("dotenv/config");
mail_1.default.setApiKey(process.env.SENDGRID_API_KEY);
async function sendPriceAlert(payload) {
    const { toEmail, origin, destination, departureDate, returnDate, priceUsd, maxPriceUsd, } = payload;
    const subject = `Price alert: ${origin} → ${destination} at $${priceUsd}`;
    const body = `
Good news! An El Al flight matching your alert was found below your threshold.

Route:       ${origin} → ${destination} (round trip)
Departure:   ${departureDate}
Return:      ${returnDate}
Price:       $${priceUsd.toFixed(2)}
Your limit:  $${maxPriceUsd.toFixed(2)}

Search on El Al: https://www.elal.com
  `.trim();
    await mail_1.default.send({
        to: toEmail,
        from: process.env.FROM_EMAIL,
        subject,
        text: body,
    });
    console.log(`[notify] Alert sent to ${toEmail} — $${priceUsd} for ${origin}→${destination}`);
}

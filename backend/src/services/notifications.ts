import sgMail from '@sendgrid/mail';
import 'dotenv/config';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export interface PriceAlertPayload {
  toEmail: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  priceUsd: number;
  maxPriceUsd: number;
}

export async function sendPriceAlert(payload: PriceAlertPayload): Promise<void> {
  const {
    toEmail, origin, destination,
    departureDate, returnDate, priceUsd, maxPriceUsd,
  } = payload;

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

  await sgMail.send({
    to: toEmail,
    from: process.env.FROM_EMAIL!,
    subject,
    text: body,
  });

  console.log(`[notify] Alert sent to ${toEmail} — $${priceUsd} for ${origin}→${destination}`);
}

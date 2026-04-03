import { Duffel } from '@duffel/api';
import 'dotenv/config';

const duffel = new Duffel({ token: process.env.DUFFEL_API_KEY! });

// In Duffel sandbox, real airlines aren't available — they use fictional "Duffel Airways" (ZZ).
// Set AIRLINE_IATA=LY in production, ZZ in sandbox (or leave unset to accept all airlines).
const AIRLINE_IATA = process.env.AIRLINE_IATA ?? null;

export interface FlightResult {
  offerId: string;
  departureDate: string;       // YYYY-MM-DD
  returnDate: string;          // YYYY-MM-DD
  priceUsd: number;
  outboundDepartingAt: string; // ISO 8601
  outboundArrivingAt: string;
  inboundDepartingAt: string;
  inboundArrivingAt: string;
}

/**
 * Search for the cheapest El Al round-trip offer between two dates.
 * Returns null if no El Al flights are found (e.g. Shabbat).
 */
export async function searchCheapestOffer(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate: string,
): Promise<FlightResult | null> {
  const TIMEOUT_MS = 15_000;
  const offerRequest = await Promise.race([
    duffel.offerRequests.create({
    slices: [
      {
        origin,
        destination,
        departure_date: departureDate,
        arrival_time: null,
        departure_time: null,
      },
      {
        origin: destination,
        destination: origin,
        departure_date: returnDate,
        arrival_time: null,
        departure_time: null,
      },
    ],
    passengers: [{ type: 'adult' }],
    cabin_class: 'economy',
    return_offers: true,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Duffel request timed out')), TIMEOUT_MS)
    ),
  ]);

  const offers = offerRequest.data.offers ?? [];

  const elAlOffers = AIRLINE_IATA
    ? offers.filter((offer) =>
        offer.slices.every((slice) =>
          slice.segments.every((seg) => seg.operating_carrier.iata_code === AIRLINE_IATA),
        ),
      )
    : offers;

  if (elAlOffers.length === 0) return null;

  // Find cheapest
  const cheapest = elAlOffers.reduce((min, offer) =>
    parseFloat(offer.total_amount) < parseFloat(min.total_amount) ? offer : min,
  );

  const outboundSlice = cheapest.slices[0];
  const inboundSlice = cheapest.slices[1];
  const outboundSegs = outboundSlice.segments;
  const inboundSegs = inboundSlice.segments;

  return {
    offerId: cheapest.id,
    departureDate,
    returnDate,
    priceUsd: parseFloat(cheapest.total_amount),
    outboundDepartingAt: outboundSegs[0].departing_at,
    outboundArrivingAt:  outboundSegs[outboundSegs.length - 1].arriving_at,
    inboundDepartingAt:  inboundSegs[0].departing_at,
    inboundArrivingAt:   inboundSegs[inboundSegs.length - 1].arriving_at,
  };
}

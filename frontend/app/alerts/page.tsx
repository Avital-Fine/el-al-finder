import Link from "next/link";
import AlertCard from "../components/AlertCard";

const API = process.env.API_URL ?? "http://localhost:3001";

interface Alert {
  id: string;
  origin: string;
  destination: string;
  window_start: string;
  window_end: string;
  trip_duration_days: number;
  max_price_usd: string;
  is_active: boolean;
  flexible_duration: boolean;
  created_at: string;
}

interface PriceRecord {
  id: string;
  alert_id: string;
  checked_at: string;
  departure_date: string;
  return_date: string;
  price_usd: string;
}

async function getAlerts(email: string): Promise<Alert[]> {
  const res = await fetch(`${API}/alerts?email=${encodeURIComponent(email)}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

async function getPrices(alertId: string): Promise<PriceRecord[]> {
  const res = await fetch(`${API}/alerts/${alertId}/prices`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  if (!email) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <div>
            <p className="text-gray-500 mb-4">Enter your email to view your alerts.</p>
            <EmailForm />
          </div>
        </div>
      </div>
    );
  }

  const alerts = await getAlerts(email);
  const alertsWithPrices = await Promise.all(
    alerts.map(async (alert) => ({
      alert,
      prices: await getPrices(alert.id),
    }))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">My Alerts</h2>
            <p className="text-sm text-gray-500">{email}</p>
          </div>
          <Link
            href="/"
            className="text-sm bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors"
          >
            + New Alert
          </Link>
        </div>

        {alertsWithPrices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
            No alerts yet.{" "}
            <Link href="/" className="text-blue-700 hover:underline">
              Create one
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-4">
            {alertsWithPrices.map(({ alert, prices }) => (
              <AlertCard key={alert.id} alert={alert} prices={prices} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight">✈ El Al Flight Finder</h1>
        <p className="text-blue-200 text-sm">Monitor prices and get alerted when they drop</p>
      </div>
      <Link href="/" className="text-sm bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors">
        ← Home
      </Link>
    </header>
  );
}

function EmailForm() {
  return (
    <form action="/alerts" className="flex gap-2 max-w-sm mx-auto">
      <input
        name="email"
        type="email"
        required
        placeholder="your@email.com"
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm transition-colors"
      >
        View
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const POPULAR_ROUTES = [
  { label: "TLV → NYC", origin: "TLV", destination: "JFK" },
  { label: "TLV → London", origin: "TLV", destination: "LHR" },
  { label: "TLV → Tokyo", origin: "TLV", destination: "TYO" },
  { label: "TLV → Paris", origin: "TLV", destination: "CDG" },
  { label: "TLV → Miami", origin: "TLV", destination: "MIA" },
];

export default function CreateAlertForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    origin: "TLV",
    destination: "",
    window_start: "",
    window_end: "",
    trip_duration_days: "10",
    max_price_usd: "",
    flexible_duration: false,
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          trip_duration_days: parseInt(form.trip_duration_days),
          max_price_usd: parseFloat(form.max_price_usd),
          flexible_duration: form.flexible_duration,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to create alert");
      }
      router.push(`/alerts?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="you@example.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Route */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Route</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {POPULAR_ROUTES.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => { set("origin", r.origin); set("destination", r.destination); }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                form.origin === r.origin && form.destination === r.destination
                  ? "bg-blue-900 text-white border-blue-900"
                  : "border-gray-300 text-gray-600 hover:border-blue-400"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              required
              maxLength={3}
              value={form.origin}
              onChange={(e) => set("origin", e.target.value.toUpperCase())}
              placeholder="From (e.g. TLV)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>
          <span className="self-center text-gray-400">→</span>
          <div className="flex-1">
            <input
              type="text"
              required
              maxLength={3}
              value={form.destination}
              onChange={(e) => set("destination", e.target.value.toUpperCase())}
              placeholder="To (e.g. JFK)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>
        </div>
      </div>

      {/* Date window */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Travel window</label>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            required
            value={form.window_start}
            onChange={(e) => set("window_start", e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            required
            value={form.window_end}
            onChange={(e) => set("window_end", e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Trip duration + max price */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Trip length (days)</label>
          <input
            type="number"
            required
            min={1}
            max={90}
            value={form.trip_duration_days}
            onChange={(e) => set("trip_duration_days", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-1.5 mt-2">
            <input
              type="checkbox"
              id="flexible_duration"
              checked={form.flexible_duration}
              onChange={(e) => setForm((prev) => ({ ...prev, flexible_duration: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="flexible_duration" className="text-xs text-gray-600 flex items-center gap-1">
              Flexible
              <span
                title="We'll also search trips up to 3 days longer to find better prices"
                className="cursor-help text-gray-400 border border-gray-300 rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px] leading-none"
              >?</span>
            </label>
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Max price (USD)</label>
          <input
            type="number"
            required
            min={1}
            value={form.max_price_usd}
            onChange={(e) => set("max_price_usd", e.target.value)}
            placeholder="e.g. 800"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
      >
        {loading ? "Creating…" : "Create Alert"}
      </button>
    </form>
  );
}

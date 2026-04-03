"use client";

import { useState } from "react";
import PriceChart from "./PriceChart";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Alert {
  id: string;
  origin: string;
  destination: string;
  window_start: string;
  window_end: string;
  trip_duration_days: number;
  max_price_usd: string;
  is_active: boolean;
}

interface PriceRecord {
  checked_at: string;
  departure_date: string;
  return_date: string;
  price_usd: string;
}

export default function AlertCard({
  alert,
  prices,
}: {
  alert: Alert;
  prices: PriceRecord[];
}) {
  const [isActive, setIsActive] = useState(alert.is_active);
  const [toggling, setToggling] = useState(false);

  const lowestPrice = prices.length
    ? Math.min(...prices.map((p) => parseFloat(p.price_usd)))
    : null;

  const latestPrice = prices.length
    ? parseFloat(prices[0].price_usd)
    : null;

  const underThreshold = latestPrice !== null && latestPrice <= parseFloat(alert.max_price_usd);

  async function toggleActive() {
    setToggling(true);
    try {
      const res = await fetch(`${API}/alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (res.ok) setIsActive((v) => !v);
    } finally {
      setToggling(false);
    }
  }

  const windowStart = new Date(alert.window_start).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const windowEnd = new Date(alert.window_end).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className={`bg-white rounded-2xl border ${isActive ? "border-gray-200" : "border-gray-100 opacity-60"} shadow-sm overflow-hidden`}>
      {/* Header row */}
      <div className="flex items-start justify-between px-6 pt-5 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold text-gray-900">
              {alert.origin} → {alert.destination}
            </span>
            {!isActive && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Paused</span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {windowStart} – {windowEnd} · {alert.trip_duration_days} days
          </p>
        </div>

        <div className="text-right">
          {latestPrice !== null ? (
            <div>
              <p className={`text-2xl font-bold ${underThreshold ? "text-green-600" : "text-gray-800"}`}>
                ${latestPrice.toFixed(0)}
              </p>
              <p className="text-xs text-gray-400">threshold ${parseFloat(alert.max_price_usd).toFixed(0)}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No data yet</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      {prices.length > 0 && (
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 text-center text-sm">
          <div className="py-3">
            <p className="text-xs text-gray-400 mb-0.5">Lowest found</p>
            <p className="font-semibold text-gray-700">${lowestPrice?.toFixed(0)}</p>
          </div>
          <div className="py-3">
            <p className="text-xs text-gray-400 mb-0.5">Best departure</p>
            <p className="font-semibold text-gray-700">
              {new Date(prices[0].departure_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </p>
          </div>
          <div className="py-3">
            <p className="text-xs text-gray-400 mb-0.5">Checks done</p>
            <p className="font-semibold text-gray-700">{prices.length}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {prices.length > 1 && (
        <div className="px-4 pt-2 pb-4 border-t border-gray-100">
          <PriceChart prices={prices} threshold={parseFloat(alert.max_price_usd)} />
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
        <button
          onClick={toggleActive}
          disabled={toggling}
          className="text-xs text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
        >
          {isActive ? "Pause alert" : "Resume alert"}
        </button>
      </div>
    </div>
  );
}

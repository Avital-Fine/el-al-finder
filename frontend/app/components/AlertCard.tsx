"use client";

import { useState } from "react";
import { Pencil, Pause, Play, X, Check } from "lucide-react";
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
  flexible_duration: boolean;
}

interface PriceRecord {
  checked_at: string;
  departure_date: string;
  return_date: string;
  price_usd: string;
  outbound_departing_at: string | null;
  outbound_arriving_at: string | null;
  inbound_departing_at: string | null;
  inbound_arriving_at: string | null;
}

function fmt(iso: string | null, fallback: string, type: "date" | "time") {
  const d = iso ? new Date(iso) : new Date(fallback + "T00:00:00");
  if (type === "date") return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return iso ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : null;
}

function FlightLeg({ label, origin, destination, departingAt, arrivingAt, fallbackDate }: {
  label: string;
  origin: string;
  destination: string;
  departingAt: string | null;
  arrivingAt: string | null;
  fallbackDate: string;
}) {
  const date = fmt(departingAt, fallbackDate, "date");
  const depTime = fmt(departingAt, fallbackDate, "time");
  const arrTime = fmt(arrivingAt, fallbackDate, "time");

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-xs text-gray-400 w-14">{label}</span>
      <div className="flex items-center gap-1 text-gray-700 font-medium">
        <span>{origin}</span>
        {depTime && <span className="text-xs text-gray-400 font-normal">{depTime}</span>}
        <span className="text-gray-300">→</span>
        <span>{destination}</span>
        {arrTime && <span className="text-xs text-gray-400 font-normal">{arrTime}</span>}
      </div>
      <span className="text-xs text-gray-400">{date}</span>
    </div>
  );
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentAlert, setCurrentAlert] = useState(alert);
  const [editValues, setEditValues] = useState({
    window_start: alert.window_start.slice(0, 10),
    window_end: alert.window_end.slice(0, 10),
    trip_duration_days: String(alert.trip_duration_days),
    max_price_usd: String(parseFloat(alert.max_price_usd)),
    flexible_duration: alert.flexible_duration ?? false,
  });

  const lowestPrice = prices.length
    ? Math.min(...prices.map((p) => parseFloat(p.price_usd)))
    : null;

  const latestPrice = prices.length
    ? parseFloat(prices[0].price_usd)
    : null;

  const underThreshold = latestPrice !== null && latestPrice <= parseFloat(currentAlert.max_price_usd);

  async function toggleActive() {
    setToggling(true);
    try {
      const res = await fetch(`${API}/alerts/${currentAlert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (res.ok) setIsActive((v) => !v);
    } finally {
      setToggling(false);
    }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`${API}/alerts/${currentAlert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          window_start: editValues.window_start,
          window_end: editValues.window_end,
          trip_duration_days: parseInt(editValues.trip_duration_days, 10),
          max_price_usd: parseFloat(editValues.max_price_usd),
          flexible_duration: editValues.flexible_duration,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCurrentAlert(updated);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditValues({
      window_start: currentAlert.window_start.slice(0, 10),
      window_end: currentAlert.window_end.slice(0, 10),
      trip_duration_days: String(currentAlert.trip_duration_days),
      max_price_usd: String(parseFloat(currentAlert.max_price_usd)),
      flexible_duration: currentAlert.flexible_duration,
    });
    setEditing(false);
  }

  const windowStart = new Date(currentAlert.window_start).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const windowEnd = new Date(currentAlert.window_end).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className={`bg-white rounded-2xl border ${isActive ? "border-gray-200" : "border-gray-100 opacity-60"} shadow-sm overflow-hidden`}>
      {/* Header row */}
      <div className="flex items-start justify-between px-6 pt-5 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold text-gray-900">
              {currentAlert.origin} → {currentAlert.destination}
            </span>
            {!isActive && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Paused</span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {windowStart} – {windowEnd} · {currentAlert.trip_duration_days} days{currentAlert.flexible_duration && " (flexible)"}
          </p>
        </div>

        <div className="text-right">
          {latestPrice !== null ? (
            <div>
              <p className={`text-2xl font-bold ${underThreshold ? "text-green-600" : "text-gray-800"}`}>
                ${latestPrice.toFixed(0)}
              </p>
              <p className="text-xs text-gray-400">threshold ${parseFloat(currentAlert.max_price_usd).toFixed(0)}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No data yet</p>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="px-6 pb-4 border-t border-gray-100 pt-4 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-500">
            From
            <input
              type="date"
              value={editValues.window_start}
              onChange={(e) => setEditValues((v) => ({ ...v, window_start: e.target.value }))}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-500">
            To
            <input
              type="date"
              value={editValues.window_end}
              onChange={(e) => setEditValues((v) => ({ ...v, window_end: e.target.value }))}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-500">
            Trip duration (days)
            <input
              type="number"
              min={1}
              value={editValues.trip_duration_days}
              onChange={(e) => setEditValues((v) => ({ ...v, trip_duration_days: e.target.value }))}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="checkbox"
                id="edit_flexible_duration"
                checked={editValues.flexible_duration}
                onChange={(e) => setEditValues((v) => ({ ...v, flexible_duration: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="edit_flexible_duration" className="text-xs text-gray-600 flex items-center gap-1">
                Flexible
                <span
                  title="We'll also search trips up to 3 days longer to find better prices"
                  className="cursor-help text-gray-400 border border-gray-300 rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px] leading-none"
                >?</span>
              </label>
            </div>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-500">
            Max price (USD)
            <input
              type="number"
              min={1}
              value={editValues.max_price_usd}
              onChange={(e) => setEditValues((v) => ({ ...v, max_price_usd: e.target.value }))}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>
          <div className="col-span-2 flex gap-2 justify-end pt-1">
            <button
              onClick={cancelEdit}
              title="Cancel"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={15} />
            </button>
            <button
              onClick={saveEdit}
              disabled={saving}
              title="Save"
              className="p-1.5 rounded-lg text-white bg-gray-900 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <Check size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Stats + flight details */}
      {prices.length > 0 && (
        <>
          <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100 text-center text-sm">
            <div className="py-3">
              <p className="text-xs text-gray-400 mb-0.5">Lowest found</p>
              <p className="font-semibold text-gray-700">${lowestPrice?.toFixed(0)}</p>
            </div>
            <div className="py-3">
              <p className="text-xs text-gray-400 mb-0.5">Checks done</p>
              <p className="font-semibold text-gray-700">{prices.length}</p>
            </div>
          </div>
          <div className="border-t border-gray-100 px-6 py-3 space-y-2">
            <FlightLeg
              label="Outbound"
              origin={currentAlert.origin}
              destination={currentAlert.destination}
              departingAt={prices[0].outbound_departing_at}
              arrivingAt={prices[0].outbound_arriving_at}
              fallbackDate={prices[0].departure_date}
            />
            <FlightLeg
              label="Return"
              origin={currentAlert.destination}
              destination={currentAlert.origin}
              departingAt={prices[0].inbound_departing_at}
              arrivingAt={prices[0].inbound_arriving_at}
              fallbackDate={prices[0].return_date}
            />
          </div>
        </>
      )}

      {/* Chart */}
      {prices.length > 1 && (
        <div className="px-4 pt-2 pb-4 border-t border-gray-100">
          <PriceChart prices={prices} threshold={parseFloat(currentAlert.max_price_usd)} />
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center">
        <button
          onClick={() => setEditing((v) => !v)}
          title={editing ? "Cancel edit" : "Edit alert"}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          {editing ? <X size={15} /> : <Pencil size={15} />}
        </button>
        <button
          onClick={toggleActive}
          disabled={toggling}
          title={isActive ? "Pause alert" : "Resume alert"}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          {isActive ? <Pause size={15} /> : <Play size={15} />}
        </button>
      </div>
    </div>
  );
}

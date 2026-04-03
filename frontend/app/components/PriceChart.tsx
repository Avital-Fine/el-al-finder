"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PriceRecord {
  checked_at: string;
  price_usd: string;
}

export default function PriceChart({
  prices,
  threshold,
}: {
  prices: PriceRecord[];
  threshold: number;
}) {
  const data = [...prices]
    .reverse()
    .map((p) => ({
      date: new Date(p.checked_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      price: parseFloat(p.price_usd),
    }));

  const min = Math.min(...data.map((d) => d.price));
  const max = Math.max(...data.map((d) => d.price), threshold);

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis
          domain={[Math.floor(min * 0.95), Math.ceil(max * 1.05)]}
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(0)}`, "Price"]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <ReferenceLine
          y={threshold}
          stroke="#ef4444"
          strokeDasharray="4 2"
          label={{ value: `Limit $${threshold}`, fontSize: 10, fill: "#ef4444", position: "right" }}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#1e40af"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

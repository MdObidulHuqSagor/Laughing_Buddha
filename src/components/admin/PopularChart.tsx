"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PopularItem } from "@/lib/queries";

const COLORS = ["#8a1622", "#a11d2b", "#b93342", "#c8a24a", "#d8b45c", "#6d101b", "#a8853a", "#3b070e"];

export default function PopularChart({ data }: { data: PopularItem[] }) {
  const chartData = data.map((item) => ({
    name: item.name.length > 16 ? `${item.name.slice(0, 15)}…` : item.name,
    fullName: item.name,
    quantity: item.quantity,
  }));

  if (chartData.length === 0) {
    return (
      <div className="grid h-72 place-items-center text-sm text-ink/45">
        No orders in the last 7 days yet.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 40, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" vertical={false} />
          <XAxis
            dataKey="name"
            angle={-30}
            textAnchor="end"
            interval={0}
            tick={{ fontSize: 11, fill: "#5c4a4c" }}
            stroke="rgba(0,0,0,0.15)"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#5c4a4c" }}
            stroke="rgba(0,0,0,0.15)"
          />
          <Tooltip
            formatter={(value) => [`${String(value)} sold`, "This week"] as [string, string]}
            labelFormatter={(_label, payload) =>
              (payload?.[0]?.payload as { fullName?: string } | undefined)?.fullName ?? ""
            }
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.08)",
              fontSize: 12,
            }}
          />
          <Bar dataKey="quantity" radius={[6, 6, 0, 0]} maxBarSize={46}>
            {chartData.map((entry, index) => (
              <Cell key={entry.fullName} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

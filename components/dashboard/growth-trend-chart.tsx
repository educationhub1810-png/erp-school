"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { label: string; count: number }[];
}

export function GrowthTrendChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} allowDecimals={false} />
        <Tooltip
          formatter={(value) => [value, "Schools added"]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#8b5cf6"
          strokeWidth={2.5}
          fill="url(#growthFill)"
          dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

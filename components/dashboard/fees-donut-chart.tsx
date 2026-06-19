"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Props {
  collected: number;
  pending: number;
}

const COLORS = { collected: "#22c55e", pending: "#f97316" };

export function FeesDonutChart({ collected, pending }: Props) {
  const total = collected + pending;
  const pct = total > 0 ? Math.round((collected / total) * 100) : 0;
  const data = total > 0
    ? [
        { name: "Collected", value: collected, color: COLORS.collected },
        { name: "Pending", value: pending, color: COLORS.pending },
      ]
    : [{ name: "No data", value: 1, color: "#e5e7eb" }];

  return (
    <div className="relative w-full h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={80} paddingAngle={total > 0 ? 3 : 0} strokeWidth={0}>
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold text-gray-900">{pct}%</span>
      </div>
    </div>
  );
}

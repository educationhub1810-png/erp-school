"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  primary: Segment;
  secondary: Segment;
}

export function TwoValueDonutChart({ primary, secondary }: Props) {
  const total = primary.value + secondary.value;
  const pct = total > 0 ? Math.round((primary.value / total) * 100) : 0;
  const data = total > 0
    ? [
        { name: primary.label, value: primary.value, color: primary.color },
        { name: secondary.label, value: secondary.value, color: secondary.color },
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

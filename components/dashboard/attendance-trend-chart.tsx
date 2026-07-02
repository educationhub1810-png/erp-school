"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { day: string; percent: number }[];
}

export function AttendanceTrendChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          tickFormatter={(v) => `${v}%`}
          domain={[0, 100]}
        />
        <Tooltip
          formatter={(value) => [`${value}%`, "Attendance"]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="percent"
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="url(#attendanceFill)"
          dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

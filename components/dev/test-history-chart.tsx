"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export interface HistoryPoint {
  label: string;
  passed: number;
  failed: number;
}

// Passed vs failed across the last few runs (oldest → newest).
export function TestHistoryChart({ data }: { data: HistoryPoint[] }) {
  if (data.length === 0) {
    return <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No runs yet</div>;
  }
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="passed" stackId="a" fill="#22c55e" name="Passed" radius={[0, 0, 0, 0]} />
          <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

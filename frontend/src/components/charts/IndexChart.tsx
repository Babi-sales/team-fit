"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { categorical, ink } from "@/lib/colors";
import { IndexPoint } from "@/lib/types";

export default function IndexChart({ data, unit = "" }: { data: IndexPoint[]; unit?: string }) {
  const points = data.map((d) => ({ date: d.date.slice(5), value: d.value }));

  if (points.length < 2) {
    return <p className="text-xs text-[var(--ink-muted)]">Registre pelo menos duas medições para ver a evolução.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={points} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid stroke={ink.grid} vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: ink.muted }} axisLine={{ stroke: ink.baseline }} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: ink.muted }} axisLine={false} tickLine={false} domain={["auto", "auto"]} width={30} />
        <Tooltip
          contentStyle={{ background: "var(--surface)", border: `1px solid ${ink.grid}`, borderRadius: 8, fontSize: 12 }}
          formatter={(value) => [`${value}${unit}`, ""]}
        />
        <Line type="monotone" dataKey="value" stroke={categorical.violet} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

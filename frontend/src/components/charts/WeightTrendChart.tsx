"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { categorical, ink } from "@/lib/colors";
import { WeightLog } from "@/lib/types";

export default function WeightTrendChart({ data, metaKg }: { data: WeightLog[]; metaKg: number | null }) {
  const points = data.map((d) => ({ data: d.data.slice(5), peso: Number(d.peso_kg) }));

  if (points.length === 0) {
    return <p className="text-sm text-[var(--ink-muted)]">Sem pesagens registradas ainda.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={ink.grid} vertical={false} />
        <XAxis dataKey="data" tick={{ fontSize: 11, fill: ink.muted }} axisLine={{ stroke: ink.baseline }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: ink.muted }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{ background: "var(--surface)", border: `1px solid ${ink.grid}`, borderRadius: 8, fontSize: 12 }}
          formatter={(value) => [`${value} kg`, "Peso"]}
        />
        {metaKg && (
          <ReferenceLine
            y={metaKg}
            stroke={ink.muted}
            strokeDasharray="4 4"
            label={{ value: `meta ${metaKg}kg`, position: "insideTopRight", fontSize: 10, fill: ink.muted }}
          />
        )}
        <Line type="monotone" dataKey="peso" stroke={categorical.blue} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ink, status } from "@/lib/colors";
import { DailyKcalPoint } from "@/lib/types";

function barColor(kcal: number, target: number | null): string {
  if (!target || kcal === 0) return ink.baseline;
  const diff = (kcal - target) / target;
  if (diff <= 0.05) return status.good;
  if (diff <= 0.15) return status.warning;
  return status.critical;
}

export default function DailyKcalChart({ data }: { data: DailyKcalPoint[] }) {
  const target = data.find((d) => d.target_kcal != null)?.target_kcal ?? null;
  const points = data.map((d) => ({ date: d.date.slice(5), kcal: d.total_kcal }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={points} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={ink.grid} vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: ink.muted }} axisLine={{ stroke: ink.baseline }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: ink.muted }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "var(--surface)", border: `1px solid ${ink.grid}`, borderRadius: 8, fontSize: 12 }}
          formatter={(value) => [`${value} kcal`, "Consumido"]}
        />
        {target && (
          <ReferenceLine
            y={target}
            stroke={ink.muted}
            strokeDasharray="4 4"
            label={{ value: `meta ${target}kcal`, position: "insideTopRight", fontSize: 10, fill: ink.muted }}
          />
        )}
        <Bar dataKey="kcal" radius={[4, 4, 0, 0]}>
          {points.map((p, i) => (
            <Cell key={i} fill={barColor(p.kcal, target)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

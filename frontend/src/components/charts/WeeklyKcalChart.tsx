"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ink, status } from "@/lib/colors";
import { DailyTotals } from "@/lib/types";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function barColor(kcal: number, meta: number | null): string {
  if (!meta || kcal === 0) return ink.baseline;
  const diff = (kcal - meta) / meta;
  if (diff <= 0.05) return status.good;
  if (diff <= 0.15) return status.warning;
  return status.critical;
}

export default function WeeklyKcalChart({ dias, metaKcal }: { dias: DailyTotals[]; metaKcal: number | null }) {
  const points = dias.map((d) => ({
    dia: DIAS_SEMANA[new Date(`${d.data}T12:00:00`).getDay()],
    kcal: d.kcal_total,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={points} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={ink.grid} vertical={false} />
        <XAxis dataKey="dia" tick={{ fontSize: 11, fill: ink.muted }} axisLine={{ stroke: ink.baseline }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: ink.muted }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "var(--surface)", border: `1px solid ${ink.grid}`, borderRadius: 8, fontSize: 12 }}
          formatter={(value) => [`${value} kcal`, "Consumido"]}
        />
        {metaKcal && (
          <ReferenceLine
            y={metaKcal}
            stroke={ink.muted}
            strokeDasharray="4 4"
            label={{ value: `meta ${metaKcal}kcal`, position: "insideTopRight", fontSize: 10, fill: ink.muted }}
          />
        )}
        <Bar dataKey="kcal" radius={[4, 4, 0, 0]}>
          {points.map((p, i) => (
            <Cell key={i} fill={barColor(p.kcal, metaKcal)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

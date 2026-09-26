"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { categorical, ink } from "@/lib/colors";
import { IndicePonto } from "@/lib/types";

export default function IndiceChart({ data, unidade = "" }: { data: IndicePonto[]; unidade?: string }) {
  const points = data.map((d) => ({ data: d.data.slice(5), valor: d.valor }));

  if (points.length < 2) {
    return <p className="text-xs text-[var(--ink-muted)]">Registre pelo menos duas medições para ver a evolução.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={points} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid stroke={ink.grid} vertical={false} />
        <XAxis dataKey="data" tick={{ fontSize: 10, fill: ink.muted }} axisLine={{ stroke: ink.baseline }} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: ink.muted }} axisLine={false} tickLine={false} domain={["auto", "auto"]} width={30} />
        <Tooltip
          contentStyle={{ background: "var(--surface)", border: `1px solid ${ink.grid}`, borderRadius: 8, fontSize: 12 }}
          formatter={(value) => [`${value}${unidade}`, ""]}
        />
        <Line type="monotone" dataKey="valor" stroke={categorical.violet} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

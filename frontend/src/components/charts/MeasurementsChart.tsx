"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { categorical, ink } from "@/lib/colors";
import { BodyMeasurement } from "@/lib/types";

export default function MeasurementsChart({ data }: { data: BodyMeasurement[] }) {
  const points = data.map((d) => ({
    data: d.data.slice(5),
    cintura: d.cintura_cm ? Number(d.cintura_cm) : null,
    quadril: d.quadril_cm ? Number(d.quadril_cm) : null,
  }));

  if (points.length === 0) {
    return <p className="text-sm text-[var(--ink-muted)]">Sem medidas registradas ainda.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={ink.grid} vertical={false} />
        <XAxis dataKey="data" tick={{ fontSize: 11, fill: ink.muted }} axisLine={{ stroke: ink.baseline }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: ink.muted }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
        <Tooltip contentStyle={{ background: "var(--surface)", border: `1px solid ${ink.grid}`, borderRadius: 8, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" name="Abdômen (cm)" dataKey="cintura" stroke={categorical.blue} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" name="Quadril (cm)" dataKey="quadril" stroke={categorical.green} strokeWidth={2} dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

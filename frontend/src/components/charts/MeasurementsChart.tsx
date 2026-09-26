"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { categorical, ink } from "@/lib/colors";
import { BodyMeasurement } from "@/lib/types";

export default function MeasurementsChart({ data }: { data: BodyMeasurement[] }) {
  const points = data.map((d) => ({
    date: d.date.slice(5),
    waist: d.waist_cm ? Number(d.waist_cm) : null,
    hip: d.hip_cm ? Number(d.hip_cm) : null,
  }));

  if (points.length === 0) {
    return <p className="text-sm text-[var(--ink-muted)]">Sem medidas registradas ainda.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={ink.grid} vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: ink.muted }} axisLine={{ stroke: ink.baseline }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: ink.muted }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
        <Tooltip contentStyle={{ background: "var(--surface)", border: `1px solid ${ink.grid}`, borderRadius: 8, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" name="Abdômen (cm)" dataKey="waist" stroke={categorical.blue} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" name="Quadril (cm)" dataKey="hip" stroke={categorical.green} strokeWidth={2} dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

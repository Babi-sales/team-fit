"use client";

import { useEffect, useState } from "react";

import DailyKcalChart from "@/components/charts/DailyKcalChart";
import IndexChart from "@/components/charts/IndexChart";
import MeasurementsChart from "@/components/charts/MeasurementsChart";
import WeightTrendChart from "@/components/charts/WeightTrendChart";
import { Card, PageHeader, StatTile } from "@/components/ui";
import WeighInReminder from "@/components/WeighInReminder";
import { useApp } from "@/context/AppContext";
import { apiFetch, withPerson } from "@/lib/api";
import { classificationColor } from "@/lib/colors";
import { DashboardSummary, IndexPoint } from "@/lib/types";

function IndexCard({
  title,
  description,
  value,
  classification,
  history,
  unit,
}: {
  title: string;
  description: string;
  value: number | null;
  classification: string | null;
  history: IndexPoint[];
  unit: string;
}) {
  return (
    <Card>
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {classification && (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
            style={{ backgroundColor: classificationColor(classification) }}
          >
            {classification}
          </span>
        )}
      </div>
      <p className="mb-2 text-xs text-[var(--ink-muted)]">{description}</p>
      <div className="mb-2 text-2xl font-semibold">{value != null ? `${value}${unit}` : "—"}</div>
      <IndexChart data={history} unit={unit} />
    </Card>
  );
}

const RANGE_OPTIONS = [7, 14, 30];

export default function DashboardPage() {
  const { person } = useApp();
  const [days, setDays] = useState(14);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    apiFetch<DashboardSummary>(withPerson(`/dashboard?days=${days}`, person))
      .then(setSummary)
      .finally(() => setLoading(false));
  }, [person, days]);

  if (loading || !summary) {
    return <p className="text-sm text-[var(--ink-muted)]">Carregando painel…</p>;
  }

  const changeLabel =
    summary.weight_change_kg == null
      ? "—"
      : `${summary.weight_change_kg > 0 ? "+" : ""}${summary.weight_change_kg} kg desde o início`;

  return (
    <div className="space-y-4">
      <PageHeader title="Painel" subtitle="Evolução de peso, medidas e adesão à meta" />

      <WeighInReminder weightHistory={summary.weight_history} measurementHistory={summary.measurement_history} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Peso atual" value={summary.current_weight_kg ? `${summary.current_weight_kg} kg` : "—"} sub={changeLabel} />
        <StatTile label="Meta de peso" value={summary.target_weight_kg ? `${summary.target_weight_kg} kg` : "—"} />
        <StatTile label="Meta de calorias" value={summary.target_kcal ? `${summary.target_kcal} kcal` : "—"} />
        <StatTile label="Meta de proteína" value={summary.target_protein ? `${summary.target_protein} g` : "—"} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Índices de saúde</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <IndexCard
            title="IMC"
            description="Índice de massa corporal"
            value={summary.indices.bmi_current}
            classification={summary.indices.bmi_classification}
            history={summary.indices.bmi_history}
            unit=""
          />
          <IndexCard
            title="RCQ"
            description="Relação cintura-quadril"
            value={summary.indices.whr_current}
            classification={summary.indices.whr_classification}
            history={summary.indices.whr_history}
            unit=""
          />
          <IndexCard
            title="RCA"
            description="Relação cintura-altura"
            value={summary.indices.whtr_current}
            classification={summary.indices.whtr_classification}
            history={summary.indices.whtr_history}
            unit=""
          />
        </div>
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Calorias por dia vs. meta</h2>
          <div className="flex gap-1">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setDays(option)}
                className={`rounded-lg px-2 py-1 text-xs ${
                  days === option ? "bg-[var(--accent)] text-white" : "text-[var(--ink-muted)] hover:bg-[var(--page)]"
                }`}
              >
                {option}d
              </button>
            ))}
          </div>
        </div>
        <DailyKcalChart data={summary.daily_kcal_series} />
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold">Evolução do peso</h2>
        <WeightTrendChart data={summary.weight_history} targetKg={summary.target_weight_kg} />
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold">Medidas corporais</h2>
        <MeasurementsChart data={summary.measurement_history} />
      </Card>
    </div>
  );
}

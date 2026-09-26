"use client";

import { useEffect, useState } from "react";

import IndiceChart from "@/components/charts/IndiceChart";
import MeasurementsChart from "@/components/charts/MeasurementsChart";
import WeightTrendChart from "@/components/charts/WeightTrendChart";
import { Card, PageHeader, StatTile } from "@/components/ui";
import { apiFetch, withUser } from "@/lib/api";
import { classificationColor } from "@/lib/colors";
import { useTargetUserId } from "@/lib/useTargetUserId";
import { DashboardSummary, IndicePonto } from "@/lib/types";

function IndiceCard({
  titulo,
  descricao,
  valor,
  classificacao,
  historico,
  unidade,
}: {
  titulo: string;
  descricao: string;
  valor: number | null;
  classificacao: string | null;
  historico: IndicePonto[];
  unidade: string;
}) {
  return (
    <Card>
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {classificacao && (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
            style={{ backgroundColor: classificationColor(classificacao) }}
          >
            {classificacao}
          </span>
        )}
      </div>
      <p className="mb-2 text-xs text-[var(--ink-muted)]">{descricao}</p>
      <div className="mb-2 text-2xl font-semibold">{valor != null ? `${valor}${unidade}` : "—"}</div>
      <IndiceChart data={historico} unidade={unidade} />
    </Card>
  );
}

export default function DashboardPage() {
  const userId = useTargetUserId();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    apiFetch<DashboardSummary>(withUser("/dashboard", userId))
      .then(setSummary)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading || !summary) {
    return <p className="text-sm text-[var(--ink-muted)]">Carregando painel…</p>;
  }

  const variacaoLabel =
    summary.variacao_peso_kg == null
      ? "—"
      : `${summary.variacao_peso_kg > 0 ? "+" : ""}${summary.variacao_peso_kg} kg desde o início`;

  return (
    <div className="space-y-4">
      <PageHeader title="Painel" subtitle="Evolução de peso, medidas e adesão à meta" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Peso atual" value={summary.peso_atual_kg ? `${summary.peso_atual_kg} kg` : "—"} sub={variacaoLabel} />
        <StatTile label="Meta de peso" value={summary.peso_meta_kg ? `${summary.peso_meta_kg} kg` : "—"} />
        <StatTile label="Treinos na semana" value={`${summary.frequencia_exercicio_semana}x`} />
        <StatTile label="Kcal queimadas (estim.)" value={`${summary.kcal_estimado_queimado_semana} kcal`} sub="nesta semana" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Média kcal/dia"
          value={`${Math.round(summary.media_kcal_dia_semana)}`}
          sub={summary.meta_kcal ? `meta ${summary.meta_kcal} kcal` : "sem meta definida"}
        />
        <StatTile
          label="Média proteína/dia"
          value={`${Math.round(summary.media_proteina_dia_semana)}g`}
          sub={summary.meta_proteina ? `meta ${summary.meta_proteina}g` : "sem meta definida"}
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Índices de saúde</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <IndiceCard
            titulo="IMC"
            descricao="Índice de massa corporal"
            valor={summary.indices.imc_atual}
            classificacao={summary.indices.imc_classificacao}
            historico={summary.indices.imc_historico}
            unidade=""
          />
          <IndiceCard
            titulo="RCQ"
            descricao="Relação cintura-quadril"
            valor={summary.indices.rcq_atual}
            classificacao={summary.indices.rcq_classificacao}
            historico={summary.indices.rcq_historico}
            unidade=""
          />
          <IndiceCard
            titulo="RCA"
            descricao="Relação cintura-altura"
            valor={summary.indices.rca_atual}
            classificacao={summary.indices.rca_classificacao}
            historico={summary.indices.rca_historico}
            unidade=""
          />
        </div>
      </div>

      <Card>
        <h2 className="mb-2 text-sm font-semibold">Evolução do peso</h2>
        <WeightTrendChart data={summary.historico_peso} metaKg={summary.peso_meta_kg} />
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold">Medidas corporais</h2>
        <MeasurementsChart data={summary.historico_medidas} />
      </Card>
    </div>
  );
}

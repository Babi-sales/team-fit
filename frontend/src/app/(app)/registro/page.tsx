"use client";

import { useEffect, useState } from "react";

import WeeklyKcalChart from "@/components/charts/WeeklyKcalChart";
import { Button, Card, Input, PageHeader, Select, StatTile } from "@/components/ui";
import { apiFetch, withUser } from "@/lib/api";
import { DailyTotals, ExerciseLog, WeeklyConsolidated } from "@/lib/types";
import { useTargetUserId } from "@/lib/useTargetUserId";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

const REFEICOES = [
  { value: "cafe_da_manha", label: "Café da manhã" },
  { value: "lanche_manha", label: "Lanche da manhã" },
  { value: "almoco", label: "Almoço" },
  { value: "lanche_tarde", label: "Lanche da tarde" },
  { value: "jantar", label: "Jantar" },
  { value: "ceia", label: "Ceia" },
];

export default function RegistroPage() {
  const userId = useTargetUserId();
  const [dia, setDia] = useState(todayISO());
  const [daily, setDaily] = useState<DailyTotals | null>(null);
  const [mealForm, setMealForm] = useState({ refeicao: "almoco", descricao: "" });

  const [addingMeal, setAddingMeal] = useState(false);
  const [mealError, setMealError] = useState<string | null>(null);

  const [semanaInicio, setSemanaInicio] = useState(currentMonday());
  const [weekly, setWeekly] = useState<WeeklyConsolidated | null>(null);

  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [exerciseForm, setExerciseForm] = useState({ data: todayISO(), tipo_exercicio: "musculacao", duracao_min: "45", intensidade: "moderada" });

  async function loadDaily() {
    if (!userId) return;
    try {
      const d = await apiFetch<DailyTotals>(withUser(`/meal-logs/daily?data=${dia}`, userId));
      setDaily(d);
    } catch {
      setDaily(null);
    }
  }

  async function loadWeekly() {
    if (!userId) return;
    try {
      const w = await apiFetch<WeeklyConsolidated>(withUser(`/meal-logs/weekly?semana_inicio=${semanaInicio}`, userId));
      setWeekly(w);
    } catch {
      setWeekly(null);
    }
  }

  async function loadExercise() {
    if (!userId) return;
    try {
      const list = await apiFetch<ExerciseLog[]>(withUser("/exercise-logs", userId));
      setExerciseLogs(list.slice().reverse().slice(0, 10));
    } catch {
      setExerciseLogs([]);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDaily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dia]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWeekly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, semanaInicio]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadExercise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function addMeal(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !mealForm.descricao.trim()) return;
    setAddingMeal(true);
    setMealError(null);
    try {
      await apiFetch(withUser("/meal-logs", userId), {
        method: "POST",
        body: JSON.stringify({
          data: dia,
          refeicao: mealForm.refeicao,
          descricao: mealForm.descricao,
        }),
      });
      setMealForm({ refeicao: "almoco", descricao: "" });
      await Promise.all([loadDaily(), loadWeekly()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setMealError(
        message.toLowerCase().includes("failed to fetch")
          ? "Não consegui falar com o servidor. Confira se o backend está rodando (ou se uma extensão do navegador está bloqueando a chamada) e tente de novo."
          : message
      );
    } finally {
      setAddingMeal(false);
    }
  }

  async function deleteMeal(id: string) {
    if (!userId) return;
    await apiFetch(withUser(`/meal-logs/${id}`, userId), { method: "DELETE" });
    await Promise.all([loadDaily(), loadWeekly()]);
  }

  async function addExercise(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    await apiFetch(withUser("/exercise-logs", userId), {
      method: "POST",
      body: JSON.stringify({
        data: exerciseForm.data,
        tipo_exercicio: exerciseForm.tipo_exercicio,
        duracao_min: Number(exerciseForm.duracao_min),
        intensidade: exerciseForm.intensidade,
      }),
    });
    await loadExercise();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Registro de refeições e treinos" subtitle="Acompanhe o dia e a semana em relação à meta" />

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Refeições do dia</h2>
          <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className="w-auto" />
        </div>

        {daily && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            <StatTile
              label="Calorias"
              value={`${Math.round(daily.kcal_total)} kcal`}
              sub={daily.meta_kcal ? `meta ${daily.meta_kcal} · ${daily.diferenca_kcal! >= 0 ? "+" : ""}${Math.round(daily.diferenca_kcal ?? 0)}` : "sem meta"}
            />
            <StatTile
              label="Proteína"
              value={`${Math.round(daily.proteina_total)} g`}
              sub={daily.meta_proteina ? `meta ${daily.meta_proteina}g` : "sem meta"}
            />
          </div>
        )}

        <form onSubmit={addMeal} className="mb-1 grid grid-cols-1 gap-2 sm:grid-cols-6">
          <Select
            value={mealForm.refeicao}
            onChange={(e) => setMealForm({ ...mealForm, refeicao: e.target.value })}
            className="sm:col-span-1"
          >
            {REFEICOES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          <Input
            placeholder="ex: 2 col de sopa de cuscuz, 2 ovos mexidos, copo de 200ml de leite desnatado"
            value={mealForm.descricao}
            onChange={(e) => setMealForm({ ...mealForm, descricao: e.target.value })}
            className="sm:col-span-4"
          />
          <Button type="submit" disabled={addingMeal} className="sm:col-span-1">
            {addingMeal ? "Calculando…" : "Adicionar"}
          </Button>
        </form>
        {mealError && <p className="mb-2 text-xs text-[#d03b3b]">{mealError}</p>}
        <p className="mb-3 text-xs text-[var(--ink-muted)]">
          Descreva a refeição com as porções (colher, copo, unidade…) — as calorias e a proteína são calculadas automaticamente.
        </p>

        <ul className="space-y-1 text-sm">
          {daily?.refeicoes.map((r) => (
            <li key={r.id} className="flex items-center justify-between border-b border-[var(--border)] py-1">
              <span>
                <span className="text-[var(--ink-muted)]">{REFEICOES.find((x) => x.value === r.refeicao)?.label ?? r.refeicao}:</span>{" "}
                {r.descricao}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-[var(--ink-secondary)]">
                  {r.kcal}kcal · {r.proteina_g}g
                </span>
                <button onClick={() => deleteMeal(r.id)} className="text-xs text-[#d03b3b]">
                  remover
                </button>
              </span>
            </li>
          ))}
          {(!daily || daily.refeicoes.length === 0) && <li className="text-[var(--ink-muted)]">Nenhuma refeição registrada neste dia.</li>}
        </ul>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Consolidado semanal</h2>
          <Input type="date" value={semanaInicio} onChange={(e) => setSemanaInicio(e.target.value)} className="w-auto" />
        </div>
        {weekly && (
          <>
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Média kcal/dia" value={`${Math.round(weekly.media_kcal_dia)}`} sub={weekly.meta_kcal ? `meta ${weekly.meta_kcal}` : undefined} />
              <StatTile label="Média proteína/dia" value={`${Math.round(weekly.media_proteina_dia)}g`} />
              <StatTile label="Treinos" value={`${weekly.treinos_realizados}x`} />
              <StatTile label="Kcal queimadas" value={`${Math.round(weekly.kcal_estimado_queimado_total)}`} />
            </div>
            <WeeklyKcalChart dias={weekly.dias} metaKcal={weekly.meta_kcal} />
            <p className="mt-2 text-xs text-[var(--ink-muted)]">
              Verde = dentro da meta, amarelo = levemente acima, vermelho = bem acima. Use isso para ajustar os próximos dias da semana.
            </p>
          </>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Registrar exercício</h2>
        <form onSubmit={addExercise} className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Input type="date" value={exerciseForm.data} onChange={(e) => setExerciseForm({ ...exerciseForm, data: e.target.value })} />
          <Select value={exerciseForm.tipo_exercicio} onChange={(e) => setExerciseForm({ ...exerciseForm, tipo_exercicio: e.target.value })}>
            <option value="musculacao">Musculação</option>
            <option value="caminhada">Caminhada</option>
            <option value="corrida">Corrida</option>
            <option value="outro">Outro</option>
          </Select>
          <Input
            type="number"
            placeholder="min"
            value={exerciseForm.duracao_min}
            onChange={(e) => setExerciseForm({ ...exerciseForm, duracao_min: e.target.value })}
          />
          <Select value={exerciseForm.intensidade} onChange={(e) => setExerciseForm({ ...exerciseForm, intensidade: e.target.value })}>
            <option value="leve">Leve</option>
            <option value="moderada">Moderada</option>
            <option value="intensa">Intensa</option>
          </Select>
          <Button type="submit">Adicionar</Button>
        </form>
        <ul className="space-y-1 text-sm">
          {exerciseLogs.map((ex) => (
            <li key={ex.id} className="flex justify-between border-b border-[var(--border)] py-1">
              <span>
                {ex.data} — {ex.tipo_exercicio} ({ex.intensidade}), {ex.duracao_min}min
              </span>
              <span className="text-[var(--ink-secondary)]">{ex.kcal_estimado ? `${Math.round(ex.kcal_estimado)} kcal` : "—"}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

import { Button, Card, Input, Label, PageHeader, Select, Textarea } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { apiFetch, withPerson } from "@/lib/api";
import { BodyMeasurement, Goal, GoalType, Person, WeightLog } from "@/lib/types";

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  lose_weight: "Perder peso",
  gain_weight: "Ganhar peso",
  maintain_weight: "Manter peso",
};

async function safeGet<T>(path: string): Promise<T | null> {
  try {
    return await apiFetch<T>(path);
  } catch {
    return null;
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function calculateAge(birthDate: string): number | null {
  const born = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const hasNotHadBirthdayYet = today.getMonth() < born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() < born.getDate());
  if (hasNotHadBirthdayYet) age -= 1;
  return age;
}

const EMPTY_PERSON_FIELDS: Partial<Person> = {
  sex: "",
  birth_date: "",
  height_cm: undefined,
  activity_level: "",
  dietary_restrictions: [],
  health_conditions: [],
  medications: "",
  notes: "",
};

const EMPTY_GOAL: Partial<Goal> = { goal_type: "lose_weight" };

export default function ProfilePage() {
  const { person } = useApp();

  const [personData, setPersonData] = useState<Partial<Person>>(EMPTY_PERSON_FIELDS);
  const [restrictionsText, setRestrictionsText] = useState("");
  const [conditionsText, setConditionsText] = useState("");

  const [goal, setGoal] = useState<Partial<Goal>>(EMPTY_GOAL);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);

  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [newWeight, setNewWeight] = useState({ date: todayISO(), weight_kg: "" });

  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [newMeasurement, setNewMeasurement] = useState({ date: todayISO(), waist_cm: "", hip_cm: "" });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);

  async function loadAll() {
    const [p, g, w, m] = await Promise.all([
      safeGet<Person>(`/people/${person}`),
      safeGet<Goal>(withPerson("/goals/active", person)),
      safeGet<WeightLog[]>(withPerson("/weight-logs", person)),
      safeGet<BodyMeasurement[]>(withPerson("/measurements", person)),
    ]);
    if (p) {
      setPersonData(p);
      setRestrictionsText((p.dietary_restrictions ?? []).join(", "));
      setConditionsText((p.health_conditions ?? []).join(", "));
    } else {
      setPersonData(EMPTY_PERSON_FIELDS);
      setRestrictionsText("");
      setConditionsText("");
    }
    if (g) {
      setActiveGoal(g);
      setGoal(g);
    } else {
      setActiveGoal(null);
      setGoal(EMPTY_GOAL);
    }
    setWeightLogs((w ?? []).slice().reverse());
    setMeasurements((m ?? []).slice().reverse());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiFetch(`/people/${person}`, {
        method: "PUT",
        body: JSON.stringify({
          ...personData,
          birth_date: personData.birth_date || null,
          height_cm: personData.height_cm != null ? Number(personData.height_cm) : null,
          dietary_restrictions: restrictionsText.split(",").map((s) => s.trim()).filter(Boolean),
          health_conditions: conditionsText.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      await loadAll();
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    setSavingGoal(true);
    try {
      await apiFetch(withPerson("/goals", person), {
        method: "POST",
        body: JSON.stringify({
          goal_type: goal.goal_type,
          target_weight_kg: goal.target_weight_kg != null ? Number(goal.target_weight_kg) : null,
          target_kcal_day: goal.target_kcal_day != null ? Number(goal.target_kcal_day) : null,
          target_protein_g_day: goal.target_protein_g_day != null ? Number(goal.target_protein_g_day) : null,
          target_date: goal.target_date || null,
        }),
      });
      await loadAll();
    } finally {
      setSavingGoal(false);
    }
  }

  async function addWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!newWeight.weight_kg) return;
    await apiFetch(withPerson("/weight-logs", person), {
      method: "POST",
      body: JSON.stringify({ date: newWeight.date, weight_kg: Number(newWeight.weight_kg) }),
    });
    setNewWeight({ date: todayISO(), weight_kg: "" });
    await loadAll();
  }

  async function addMeasurement(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch(withPerson("/measurements", person), {
      method: "POST",
      body: JSON.stringify({
        date: newMeasurement.date,
        waist_cm: newMeasurement.waist_cm ? Number(newMeasurement.waist_cm) : null,
        hip_cm: newMeasurement.hip_cm ? Number(newMeasurement.hip_cm) : null,
      }),
    });
    setNewMeasurement({ date: todayISO(), waist_cm: "", hip_cm: "" });
    await loadAll();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Perfil e metas" subtitle="Dados de saúde, objetivo e evolução" />

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Dados do perfil</h2>
        <form onSubmit={saveProfile} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Sexo</Label>
            <Select value={personData.sex ?? ""} onChange={(e) => setPersonData({ ...personData, sex: e.target.value })}>
              <option value="">Selecione</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </Select>
          </div>
          <div>
            <Label>
              Data de nascimento
              {personData.birth_date && calculateAge(personData.birth_date) != null && (
                <span className="ml-1 font-normal text-[var(--ink-muted)]">({calculateAge(personData.birth_date)} anos)</span>
              )}
            </Label>
            <Input
              type="date"
              value={personData.birth_date ?? ""}
              onChange={(e) => setPersonData({ ...personData, birth_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Altura (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={personData.height_cm ?? ""}
              onChange={(e) => setPersonData({ ...personData, height_cm: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Nível de atividade</Label>
            <Select value={personData.activity_level ?? ""} onChange={(e) => setPersonData({ ...personData, activity_level: e.target.value })}>
              <option value="">Selecione</option>
              <option value="sedentary">Sedentário</option>
              <option value="light">Leve (1-3x/semana)</option>
              <option value="moderate">Moderado (3-5x/semana)</option>
              <option value="intense">Intenso (6-7x/semana)</option>
              <option value="very_intense">Muito intenso (atleta)</option>
            </Select>
          </div>
          <div>
            <Label>Medicamentos</Label>
            <Input value={personData.medications ?? ""} onChange={(e) => setPersonData({ ...personData, medications: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Restrições alimentares (separadas por vírgula)</Label>
            <Input value={restrictionsText} onChange={(e) => setRestrictionsText(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Condições de saúde (separadas por vírgula)</Label>
            <Input value={conditionsText} onChange={(e) => setConditionsText(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={personData.notes ?? ""} onChange={(e) => setPersonData({ ...personData, notes: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "Salvando…" : "Salvar perfil"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold">Meta</h2>
        {activeGoal && (
          <p className="mb-3 text-xs text-[var(--ink-muted)]">
            Meta ativa desde {activeGoal.start_date}: {GOAL_TYPE_LABELS[activeGoal.goal_type]}
          </p>
        )}
        <form onSubmit={saveGoal} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Objetivo</Label>
            <Select value={goal.goal_type} onChange={(e) => setGoal({ ...goal, goal_type: e.target.value as GoalType })}>
              <option value="lose_weight">Perder peso</option>
              <option value="gain_weight">Ganhar peso</option>
              <option value="maintain_weight">Manter peso</option>
            </Select>
          </div>
          <div>
            <Label>Peso meta (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={goal.target_weight_kg ?? ""}
              onChange={(e) => setGoal({ ...goal, target_weight_kg: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Meta de calorias/dia</Label>
            <Input
              type="number"
              value={goal.target_kcal_day ?? ""}
              onChange={(e) => setGoal({ ...goal, target_kcal_day: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Meta de proteína/dia (g)</Label>
            <Input
              type="number"
              value={goal.target_protein_g_day ?? ""}
              onChange={(e) => setGoal({ ...goal, target_protein_g_day: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Data alvo (opcional)</Label>
            <Input type="date" value={goal.target_date ?? ""} onChange={(e) => setGoal({ ...goal, target_date: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={savingGoal}>
              {savingGoal ? "Salvando…" : "Definir nova meta"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Registrar peso</h2>
          <form onSubmit={addWeight} className="mb-3 flex gap-2">
            <Input type="date" value={newWeight.date} onChange={(e) => setNewWeight({ ...newWeight, date: e.target.value })} />
            <Input
              type="number"
              step="0.1"
              placeholder="kg"
              value={newWeight.weight_kg}
              onChange={(e) => setNewWeight({ ...newWeight, weight_kg: e.target.value })}
            />
            <Button type="submit">+</Button>
          </form>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {weightLogs.map((w) => (
              <li key={w.id} className="flex justify-between border-b border-[var(--border)] py-1">
                <span className="text-[var(--ink-secondary)]">{w.date}</span>
                <span className="font-medium">{w.weight_kg} kg</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Registrar medidas</h2>
          <form onSubmit={addMeasurement} className="mb-3 grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={newMeasurement.date}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, date: e.target.value })}
              className="col-span-2"
            />
            <Input
              type="number"
              step="0.1"
              placeholder="abdômen cm"
              value={newMeasurement.waist_cm}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, waist_cm: e.target.value })}
            />
            <Input
              type="number"
              step="0.1"
              placeholder="quadril cm"
              value={newMeasurement.hip_cm}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, hip_cm: e.target.value })}
            />
            <Button type="submit" className="col-span-2">
              Adicionar
            </Button>
          </form>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {measurements.map((m) => (
              <li key={m.id} className="flex justify-between border-b border-[var(--border)] py-1">
                <span className="text-[var(--ink-secondary)]">{m.date}</span>
                <span className="font-medium">
                  {m.waist_cm ?? "—"}cm / {m.hip_cm ?? "—"}cm
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

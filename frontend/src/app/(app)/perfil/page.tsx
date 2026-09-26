"use client";

import { useEffect, useState } from "react";

import { Button, Card, Input, Label, PageHeader, Select, Textarea } from "@/components/ui";
import { apiFetch, withUser } from "@/lib/api";
import { AdherenceNote, BodyMeasurement, Goal, Profile, WeightLog } from "@/lib/types";
import { useTargetUserId } from "@/lib/useTargetUserId";

const AGENTE_LABEL: Record<string, string> = {
  nutricionista: "Nutricionista",
  personal: "Personal trainer",
  chef: "Chef",
  orquestrador: "Assistente",
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

function calcularIdade(dataNascimento: string): number | null {
  const nascimento = new Date(`${dataNascimento}T00:00:00`);
  if (Number.isNaN(nascimento.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

const EMPTY_PROFILE: Partial<Profile> = {
  sexo: "",
  data_nascimento: "",
  altura_cm: undefined,
  nivel_atividade: "",
  restricoes_alimentares: [],
  condicoes_saude: [],
  medicamentos: "",
  observacoes: "",
};

const EMPTY_GOAL: Partial<Goal> = { tipo: "perder_peso" };

export default function PerfilPage() {
  const userId = useTargetUserId();

  const [profile, setProfile] = useState<Partial<Profile>>(EMPTY_PROFILE);
  const [restricoesText, setRestricoesText] = useState("");
  const [condicoesText, setCondicoesText] = useState("");

  const [goal, setGoal] = useState<Partial<Goal>>(EMPTY_GOAL);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);

  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [newWeight, setNewWeight] = useState({ data: todayISO(), peso_kg: "" });

  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [newMeasurement, setNewMeasurement] = useState({ data: todayISO(), cintura_cm: "", quadril_cm: "" });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);

  const [notes, setNotes] = useState<AdherenceNote[]>([]);

  async function loadAll() {
    if (!userId) return;
    const [p, g, w, m, n] = await Promise.all([
      safeGet<Profile>(withUser("/profile", userId)),
      safeGet<Goal>(withUser("/goals/active", userId)),
      safeGet<WeightLog[]>(withUser("/weight-logs", userId)),
      safeGet<BodyMeasurement[]>(withUser("/measurements", userId)),
      safeGet<AdherenceNote[]>(withUser("/adherence-notes", userId)),
    ]);
    setNotes(n ?? []);
    if (p) {
      setProfile(p);
      setRestricoesText((p.restricoes_alimentares ?? []).join(", "));
      setCondicoesText((p.condicoes_saude ?? []).join(", "));
    } else {
      // Sem perfil salvo para este usuário — não deixa os dados do usuário
      // visto anteriormente (ex: o Chefe da Família) grudados na tela.
      setProfile(EMPTY_PROFILE);
      setRestricoesText("");
      setCondicoesText("");
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
  }, [userId]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSavingProfile(true);
    try {
      await apiFetch(withUser("/profile", userId), {
        method: "PUT",
        body: JSON.stringify({
          ...profile,
          data_nascimento: profile.data_nascimento || null,
          altura_cm: profile.altura_cm != null ? Number(profile.altura_cm) : null,
          restricoes_alimentares: restricoesText.split(",").map((s) => s.trim()).filter(Boolean),
          condicoes_saude: condicoesText.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      await loadAll();
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSavingGoal(true);
    try {
      await apiFetch(withUser("/goals", userId), {
        method: "POST",
        body: JSON.stringify({
          tipo: goal.tipo,
          peso_meta_kg: goal.peso_meta_kg != null ? Number(goal.peso_meta_kg) : null,
          meta_kcal_dia: goal.meta_kcal_dia != null ? Number(goal.meta_kcal_dia) : null,
          meta_proteina_g_dia: goal.meta_proteina_g_dia != null ? Number(goal.meta_proteina_g_dia) : null,
          data_alvo: goal.data_alvo || null,
        }),
      });
      await loadAll();
    } finally {
      setSavingGoal(false);
    }
  }

  async function addWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !newWeight.peso_kg) return;
    await apiFetch(withUser("/weight-logs", userId), {
      method: "POST",
      body: JSON.stringify({ data: newWeight.data, peso_kg: Number(newWeight.peso_kg) }),
    });
    setNewWeight({ data: todayISO(), peso_kg: "" });
    await loadAll();
  }

  async function addMeasurement(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    await apiFetch(withUser("/measurements", userId), {
      method: "POST",
      body: JSON.stringify({
        data: newMeasurement.data,
        cintura_cm: newMeasurement.cintura_cm ? Number(newMeasurement.cintura_cm) : null,
        quadril_cm: newMeasurement.quadril_cm ? Number(newMeasurement.quadril_cm) : null,
      }),
    });
    setNewMeasurement({ data: todayISO(), cintura_cm: "", quadril_cm: "" });
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
            <Select value={profile.sexo ?? ""} onChange={(e) => setProfile({ ...profile, sexo: e.target.value })}>
              <option value="">Selecione</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </Select>
          </div>
          <div>
            <Label>
              Data de nascimento
              {profile.data_nascimento && calcularIdade(profile.data_nascimento) != null && (
                <span className="ml-1 font-normal text-[var(--ink-muted)]">
                  ({calcularIdade(profile.data_nascimento)} anos)
                </span>
              )}
            </Label>
            <Input
              type="date"
              value={profile.data_nascimento ?? ""}
              onChange={(e) => setProfile({ ...profile, data_nascimento: e.target.value })}
            />
          </div>
          <div>
            <Label>Altura (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={profile.altura_cm ?? ""}
              onChange={(e) => setProfile({ ...profile, altura_cm: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Nível de atividade</Label>
            <Select
              value={profile.nivel_atividade ?? ""}
              onChange={(e) => setProfile({ ...profile, nivel_atividade: e.target.value })}
            >
              <option value="">Selecione</option>
              <option value="sedentario">Sedentário</option>
              <option value="leve">Leve (1-3x/semana)</option>
              <option value="moderado">Moderado (3-5x/semana)</option>
              <option value="intenso">Intenso (6-7x/semana)</option>
              <option value="muito_intenso">Muito intenso (atleta)</option>
            </Select>
          </div>
          <div>
            <Label>Medicamentos</Label>
            <Input value={profile.medicamentos ?? ""} onChange={(e) => setProfile({ ...profile, medicamentos: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Restrições alimentares (separadas por vírgula)</Label>
            <Input value={restricoesText} onChange={(e) => setRestricoesText(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Condições de saúde (separadas por vírgula)</Label>
            <Input value={condicoesText} onChange={(e) => setCondicoesText(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={profile.observacoes ?? ""} onChange={(e) => setProfile({ ...profile, observacoes: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "Salvando…" : "Salvar perfil"}
            </Button>
          </div>
        </form>
      </Card>

      {notes.length > 0 && (
        <Card>
          <h2 className="mb-1 text-sm font-semibold">Anotações</h2>
          <p className="mb-3 text-xs text-[var(--ink-muted)]">
            Dificuldades e observações registradas pelos agentes durante as conversas no chat.
          </p>
          <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
            {notes.map((n) => (
              <li key={n.id} className="border-b border-[var(--border)] pb-2">
                <div className="mb-0.5 flex justify-between text-xs text-[var(--ink-muted)]">
                  <span>{AGENTE_LABEL[n.agente] ?? n.agente}</span>
                  <span>{n.criado_em.slice(0, 10)}</span>
                </div>
                <p>{n.nota}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-1 text-sm font-semibold">Meta</h2>
        <p className="mb-3 text-xs text-[var(--ink-muted)]">
          O normal é a nutricionista definir sua meta durante a avaliação no <strong>Chat</strong>, com base no seu
          perfil. Use o formulário abaixo só se quiser ajustar manualmente.
        </p>
        {activeGoal && (
          <p className="mb-3 text-xs text-[var(--ink-muted)]">
            Meta ativa desde {activeGoal.data_inicio}: {activeGoal.tipo.replace("_", " ")}
          </p>
        )}
        <form onSubmit={saveGoal} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Objetivo</Label>
            <Select value={goal.tipo} onChange={(e) => setGoal({ ...goal, tipo: e.target.value as Goal["tipo"] })}>
              <option value="perder_peso">Perder peso</option>
              <option value="ganhar_peso">Ganhar peso</option>
              <option value="manter_peso">Manter peso</option>
            </Select>
          </div>
          <div>
            <Label>Peso meta (kg)</Label>
            <Input type="number" step="0.1" value={goal.peso_meta_kg ?? ""} onChange={(e) => setGoal({ ...goal, peso_meta_kg: e.target.value === "" ? undefined : Number(e.target.value) })} />
          </div>
          <div>
            <Label>Meta de calorias/dia</Label>
            <Input type="number" value={goal.meta_kcal_dia ?? ""} onChange={(e) => setGoal({ ...goal, meta_kcal_dia: e.target.value === "" ? undefined : Number(e.target.value) })} />
          </div>
          <div>
            <Label>Meta de proteína/dia (g)</Label>
            <Input type="number" value={goal.meta_proteina_g_dia ?? ""} onChange={(e) => setGoal({ ...goal, meta_proteina_g_dia: e.target.value === "" ? undefined : Number(e.target.value) })} />
          </div>
          <div>
            <Label>Data alvo (opcional)</Label>
            <Input type="date" value={goal.data_alvo ?? ""} onChange={(e) => setGoal({ ...goal, data_alvo: e.target.value })} />
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
            <Input type="date" value={newWeight.data} onChange={(e) => setNewWeight({ ...newWeight, data: e.target.value })} />
            <Input
              type="number"
              step="0.1"
              placeholder="kg"
              value={newWeight.peso_kg}
              onChange={(e) => setNewWeight({ ...newWeight, peso_kg: e.target.value })}
            />
            <Button type="submit">+</Button>
          </form>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {weightLogs.map((w) => (
              <li key={w.id} className="flex justify-between border-b border-[var(--border)] py-1">
                <span className="text-[var(--ink-secondary)]">{w.data}</span>
                <span className="font-medium">{w.peso_kg} kg</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Registrar medidas</h2>
          <form onSubmit={addMeasurement} className="mb-3 grid grid-cols-2 gap-2">
            <Input type="date" value={newMeasurement.data} onChange={(e) => setNewMeasurement({ ...newMeasurement, data: e.target.value })} className="col-span-2" />
            <Input
              type="number"
              step="0.1"
              placeholder="abdômen cm"
              value={newMeasurement.cintura_cm}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, cintura_cm: e.target.value })}
            />
            <Input
              type="number"
              step="0.1"
              placeholder="quadril cm"
              value={newMeasurement.quadril_cm}
              onChange={(e) => setNewMeasurement({ ...newMeasurement, quadril_cm: e.target.value })}
            />
            <Button type="submit" className="col-span-2">
              Adicionar
            </Button>
          </form>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {measurements.map((m) => (
              <li key={m.id} className="flex justify-between border-b border-[var(--border)] py-1">
                <span className="text-[var(--ink-secondary)]">{m.data}</span>
                <span className="font-medium">
                  {m.cintura_cm ?? "—"}cm / {m.quadril_cm ?? "—"}cm
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

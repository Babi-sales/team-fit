"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button, Card, Input, Label, PageHeader, Textarea } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { apiFetch, withPerson } from "@/lib/api";
import { TrainingPlan } from "@/lib/types";

export default function TrainingPage() {
  const { person } = useApp();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const list = await apiFetch<TrainingPlan[]>(withPerson("/training-plans", person));
      setPlans(list);
    } catch {
      setPlans([]);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person]);

  const active = plans.find((p) => p.active);
  const history = plans.filter((p) => !p.active);

  function startEdit() {
    setForm({ title: active?.title ?? "", content: active?.content ?? "" });
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(withPerson("/training-plans", person), {
        method: "POST",
        body: JSON.stringify(form),
      });
      setEditing(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Plano de treino" subtitle="Consulte o treino atual — a edição é manual" />

      <Card>
        {!editing ? (
          <>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">{active?.title ?? "Nenhum plano de treino ainda"}</h2>
              <div className="flex items-center gap-3">
                {active && <span className="text-xs text-[var(--ink-muted)]">versão {active.version}</span>}
                <Button type="button" variant="secondary" onClick={startEdit}>
                  {active ? "Editar" : "Criar plano"}
                </Button>
              </div>
            </div>
            {active ? (
              <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{active.content}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">Cadastre o treino manualmente pelo botão acima.</p>
            )}
          </>
        ) : (
          <form onSubmit={save} className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <Label>Conteúdo (markdown)</Label>
              <Textarea rows={16} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando…" : "Salvar nova versão"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Card>

      {history.length > 0 && (
        <Card>
          <button className="text-sm font-semibold" onClick={() => setShowHistory((v) => !v)}>
            Histórico de versões ({history.length}) {showHistory ? "▲" : "▼"}
          </button>
          {showHistory && (
            <div className="mt-3 space-y-3">
              {history.map((p) => (
                <div key={p.id} className="border-t border-[var(--border)] pt-3">
                  <div className="mb-1 flex items-baseline justify-between text-xs text-[var(--ink-muted)]">
                    <span>
                      versão {p.version} — {p.title}
                    </span>
                    <span>{p.created_at.slice(0, 10)}</span>
                  </div>
                  <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none opacity-90">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

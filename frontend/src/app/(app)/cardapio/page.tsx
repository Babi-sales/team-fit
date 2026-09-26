"use client";

import { useEffect, useState } from "react";

import { Button, Card, Input, Label, PageHeader, Textarea } from "@/components/ui";
import { apiFetch, withUser } from "@/lib/api";
import { WeeklyMenu } from "@/lib/types";
import { useTargetUserId } from "@/lib/useTargetUserId";

function currentMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function CardapioPage() {
  const userId = useTargetUserId();
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const [form, setForm] = useState({ semana_inicio: currentMonday(), conteudo: "" });
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  async function load() {
    if (!userId) return;
    try {
      const list = await apiFetch<WeeklyMenu[]>(withUser("/weekly-menus", userId));
      setMenus(list);
    } catch {
      setMenus([]);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const ativo = menus.find((m) => m.ativo);
  const historico = menus.filter((m) => !m.ativo);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !form.conteudo) return;
    setSaving(true);
    try {
      await apiFetch(withUser("/weekly-menus", userId), {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ semana_inicio: currentMonday(), conteudo: "" });
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cardápio semanal"
        subtitle="Criado pelo chef no Chat a partir do seu plano alimentar — inclui receitas e quantidade em gramas de cada item"
      />

      <Card>
        {ativo ? (
          <>
            <h2 className="mb-2 text-sm font-semibold">Semana de {ativo.semana_inicio}</h2>
            <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--ink-primary)]">{ativo.conteudo}</pre>
          </>
        ) : (
          <p className="text-sm text-[var(--ink-muted)]">
            Nenhum cardápio ainda. Vá até o <strong>Chat</strong>, escolha o chef e peça o cardápio da semana — ele
            usa seu plano alimentar (e o da família, se houver) automaticamente.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold">Novo cardápio manual</h2>
        <p className="mb-3 text-xs text-[var(--ink-muted)]">Use apenas para ajustes manuais — o normal é o cardápio vir do Chat com o chef.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Início da semana</Label>
            <Input type="date" value={form.semana_inicio} onChange={(e) => setForm({ ...form, semana_inicio: e.target.value })} required />
          </div>
          <div>
            <Label>Cardápio (dia a dia) e lista de compras</Label>
            <Textarea rows={10} value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} required />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : "Publicar cardápio"}
          </Button>
        </form>
      </Card>

      {historico.length > 0 && (
        <Card>
          <button className="text-sm font-semibold" onClick={() => setShowHistory((v) => !v)}>
            Cardápios anteriores ({historico.length}) {showHistory ? "▲" : "▼"}
          </button>
          {showHistory && (
            <div className="mt-3 space-y-3">
              {historico.map((m) => (
                <div key={m.id} className="border-t border-[var(--border)] pt-3">
                  <div className="mb-1 text-xs text-[var(--ink-muted)]">Semana de {m.semana_inicio}</div>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--ink-secondary)]">{m.conteudo}</pre>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

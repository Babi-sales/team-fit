"use client";

import { useState } from "react";

import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { apiFetch } from "@/lib/api";

export default function FamiliaPage() {
  const { currentUser, family, isFamilyChief, refreshFamily, refreshUsers } = useApp();
  const [nome, setNome] = useState("");
  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "" });
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await apiFetch("/families", { method: "POST", body: JSON.stringify({ nome }) });
      setNome("");
      await refreshFamily();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar o grupo");
    } finally {
      setCreating(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInviting(true);
    try {
      await apiFetch("/families/members", { method: "POST", body: JSON.stringify(inviteForm) });
      setInviteForm({ email: "", full_name: "" });
      await Promise.all([refreshFamily(), refreshUsers()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao convidar");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(userId: string) {
    setError(null);
    try {
      await apiFetch(`/families/members/${userId}`, { method: "DELETE" });
      await refreshFamily();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover");
    }
  }

  if (!family) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Grupo Familiar"
          subtitle="Crie um grupo para acompanhar e registrar dados de outras pessoas da família"
        />
        <Card className="max-w-md">
          <h2 className="mb-3 text-sm font-semibold">Criar grupo familiar</h2>
          <p className="mb-3 text-xs text-[var(--ink-muted)]">
            Você vira o Chefe da Família — pode convidar os demais membros, registrar refeições, peso, medidas e
            dificuldades deles. Cada pessoa continua com perfil, plano alimentar e registros individuais.
          </p>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label>Nome do grupo</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="ex: Família Sales" />
            </div>
            {error && <p className="text-sm text-[#d03b3b]">{error}</p>}
            <Button type="submit" disabled={creating}>
              {creating ? "Criando…" : "Criar grupo"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={family.nome} subtitle="Membros do grupo familiar" />

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Membros</h2>
        <ul className="space-y-2 text-sm">
          {family.membros.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between border-b border-[var(--border)] py-2">
              <div>
                <div className="font-medium">
                  {m.full_name} {m.user_id === currentUser?.id && <span className="text-[var(--ink-muted)]">(você)</span>}
                </div>
                <div className="text-xs text-[var(--ink-muted)]">{m.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    m.papel === "chefe" ? "bg-[#eda100]/15 text-[#eda100]" : "bg-[var(--page)] text-[var(--ink-secondary)]"
                  }`}
                >
                  {m.papel === "chefe" ? "Chefe da Família" : "Membro"}
                </span>
                {isFamilyChief && m.user_id !== currentUser?.id && (
                  <button onClick={() => handleRemove(m.user_id)} className="text-xs text-[#d03b3b]">
                    remover
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {isFamilyChief && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Convidar membro</h2>
          <form onSubmit={handleInvite} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>Nome</Label>
              <Input value={inviteForm.full_name} required onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={inviteForm.email} required onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={inviting} className="w-full">
                {inviting ? "Convidando…" : "Convidar"}
              </Button>
            </div>
          </form>
          {error && <p className="mt-2 text-sm text-[#d03b3b]">{error}</p>}
          <p className="mt-3 text-xs text-[var(--ink-muted)]">
            Como Chefe da Família, você pode registrar refeições, peso, medidas e dificuldades dos membros — basta
            trocar de usuário no seletor no topo da tela.
          </p>
        </Card>
      )}
    </div>
  );
}

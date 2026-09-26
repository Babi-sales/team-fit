"use client";

import { useState } from "react";

import { Button, Card, Input, Label, PageHeader, Select } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { apiFetch } from "@/lib/api";

export default function AdminPage() {
  const { currentUser, users, refreshUsers } = useApp();
  const [form, setForm] = useState({ email: "", full_name: "", role: "invited" });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (currentUser && currentUser.role !== "admin") {
    return <p className="text-sm text-[var(--ink-muted)]">Apenas administradores têm acesso a esta página.</p>;
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      await apiFetch("/users/invite", { method: "POST", body: JSON.stringify(form) });
      setMessage(`Convite enviado para ${form.email}.`);
      setForm({ email: "", full_name: "", role: "invited" });
      await refreshUsers();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao convidar usuário.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Administração" subtitle="Convide novos usuários e gerencie o acesso" />

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Convidar usuário</h2>
        <form onSubmit={handleInvite} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label>Nome</Label>
            <Input value={form.full_name} required onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Papel</Label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="invited">Convidado</option>
              <option value="admin">Administrador</option>
            </Select>
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={sending}>
              {sending ? "Enviando…" : "Enviar convite"}
            </Button>
            {message && <p className="mt-2 text-sm text-[var(--ink-secondary)]">{message}</p>}
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Usuários</h2>
        <ul className="space-y-1 text-sm">
          {users.map((u) => (
            <li key={u.id} className="flex justify-between border-b border-[var(--border)] py-1">
              <span>{u.full_name} — {u.email}</span>
              <span className="text-xs text-[var(--ink-muted)]">{u.role}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Card, Input, Label } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";

export default function ConvitePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--page)] px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-lg font-semibold">Bem-vindo(a) ao Team Fit</h1>
        <p className="mb-5 text-sm text-[var(--ink-secondary)]">Defina sua senha para continuar</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && <p className="text-sm text-[#d03b3b]">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando…" : "Confirmar e entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

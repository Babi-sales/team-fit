"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Card, Input, Label } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { localLogin, LOCAL_AUTH } from "@/lib/localAuth";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const { refreshAuth } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (LOCAL_AUTH) {
      try {
        await localLogin(email, fullName || email);
        refreshAuth();
        router.replace("/dashboard");
      } catch {
        setError("Não foi possível entrar. Confira se o backend está rodando com LOCAL_AUTH_ENABLED=true.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("E-mail ou senha inválidos.");
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--page)] px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-lg font-semibold">Team Fit</h1>
        <p className="mb-5 text-sm text-[var(--ink-secondary)]">
          {LOCAL_AUTH ? "Modo local — sem senha, para testes" : "Entre com sua conta"}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {LOCAL_AUTH && (
            <div>
              <Label htmlFor="fullName">Nome</Label>
              <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
          )}
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {!LOCAL_AUTH && (
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}
          {error && <p className="text-sm text-[#d03b3b]">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        {!LOCAL_AUTH && (
          <p className="mt-4 text-xs text-[var(--ink-muted)]">
            Recebeu um convite por e-mail? Abra o link do convite para definir sua senha.
          </p>
        )}
        {LOCAL_AUTH && (
          <p className="mt-4 text-xs text-[var(--ink-muted)]">
            O primeiro nome/e-mail que entrar aqui vira administrador automaticamente.
          </p>
        )}
      </Card>
    </div>
  );
}

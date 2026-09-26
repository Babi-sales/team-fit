"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useApp } from "@/context/AppContext";
import { Button, Card, Input } from "@/components/ui";

export default function LoginPage() {
  const { verifyPin } = useApp();
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const ok = await verifyPin(pin);
    setLoading(false);
    if (ok) {
      router.replace("/dashboard");
    } else {
      setError("PIN incorreto.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--page)] px-4">
      <Card className="w-full max-w-xs">
        <h1 className="mb-1 text-lg font-semibold">Team Fit</h1>
        <p className="mb-4 text-sm text-[var(--ink-secondary)]">Digite o PIN para entrar.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            inputMode="numeric"
            autoFocus
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          {error && <p className="text-xs text-[#d03b3b]">{error}</p>}
          <Button type="submit" disabled={loading || !pin} className="w-full">
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

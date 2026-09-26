"use client";

import { useEffect, useState } from "react";

import { Card, PageHeader } from "@/components/ui";
import { apiFetch, withUser } from "@/lib/api";
import { TrainingPlan } from "@/lib/types";
import { useTargetUserId } from "@/lib/useTargetUserId";

export default function PlanoTreinoPage() {
  const userId = useTargetUserId();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  async function load() {
    if (!userId) return;
    try {
      const list = await apiFetch<TrainingPlan[]>(withUser("/training-plans", userId));
      setPlans(list);
    } catch {
      setPlans([]);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const ativo = plans.find((p) => p.ativo);
  const historico = plans.filter((p) => !p.ativo);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Plano de treino"
        subtitle="Criado e ajustado pelo personal trainer durante a avaliação no Chat"
      />

      <Card>
        {ativo ? (
          <>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">{ativo.titulo}</h2>
              <span className="text-xs text-[var(--ink-muted)]">versão {ativo.versao}</span>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--ink-primary)]">{ativo.conteudo}</pre>
          </>
        ) : (
          <p className="text-sm text-[var(--ink-muted)]">
            Nenhum plano de treino ainda. Vá até o <strong>Chat</strong>, escolha o personal trainer e peça para
            montar seu treino — ele cria o plano automaticamente a partir do seu perfil.
          </p>
        )}
      </Card>

      {historico.length > 0 && (
        <Card>
          <button className="text-sm font-semibold" onClick={() => setShowHistory((v) => !v)}>
            Histórico de versões ({historico.length}) {showHistory ? "▲" : "▼"}
          </button>
          {showHistory && (
            <div className="mt-3 space-y-3">
              {historico.map((p) => (
                <div key={p.id} className="border-t border-[var(--border)] pt-3">
                  <div className="mb-1 flex items-baseline justify-between text-xs text-[var(--ink-muted)]">
                    <span>versão {p.versao} — {p.titulo}</span>
                    <span>{p.criado_em.slice(0, 10)}</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--ink-secondary)]">{p.conteudo}</pre>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

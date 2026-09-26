"use client";

import { useEffect, useRef, useState } from "react";

import { Button, Card, PageHeader, Textarea } from "@/components/ui";
import { apiFetch, withUser } from "@/lib/api";
import { ChatMessageOut } from "@/lib/types";
import { useTargetUserId } from "@/lib/useTargetUserId";

const AGENTES = [
  { value: "orquestrador", label: "Assistente" },
  { value: "nutricionista", label: "Nutricionista" },
  { value: "personal", label: "Personal trainer" },
  { value: "chef", label: "Chef" },
];

export default function ChatPage() {
  const userId = useTargetUserId();
  const [agente, setAgente] = useState("orquestrador");
  const [messages, setMessages] = useState<ChatMessageOut[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadHistory() {
    if (!userId) return;
    try {
      const list = await apiFetch<ChatMessageOut[]>(withUser(`/chat/history?agente=${agente}`, userId));
      setMessages(list);
    } catch {
      setMessages([]);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, agente]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !input.trim() || sending) return;
    const conteudo = input.trim();
    setInput("");
    setSending(true);
    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, user_id: userId, agente, role: "user", conteudo, criado_em: new Date().toISOString() },
    ]);
    try {
      const resposta = await apiFetch<ChatMessageOut>(withUser("/chat", userId), {
        method: "POST",
        body: JSON.stringify({ conteudo, agente }),
      });
      setMessages((prev) => [...prev, resposta]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      const friendly = message.toLowerCase().includes("failed to fetch")
        ? "Não consegui falar com o servidor. Confira se o backend está rodando (ou se uma extensão do navegador está bloqueando a chamada) e tente de novo."
        : message;
      setError(friendly);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-2rem)]">
      <PageHeader title="Chat" subtitle="Converse com a nutricionista, personal trainer ou chef" />

      <div className="mb-3 flex gap-2 overflow-x-auto">
        {AGENTES.map((a) => (
          <button
            key={a.value}
            onClick={() => setAgente(a.value)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
              agente === a.value
                ? "border-[#2a78d6] bg-[#2a78d6]/10 font-medium text-[#2a78d6]"
                : "border-[var(--border)] text-[var(--ink-secondary)]"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && <p className="text-sm text-[var(--ink-muted)]">Comece a conversa…</p>}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user" ? "bg-[#2a78d6] text-white" : "bg-[var(--page)] text-[var(--ink-primary)]"
                }`}
              >
                {m.conteudo}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && <p className="mb-2 text-xs text-[#d03b3b]">{error}</p>}
        <form onSubmit={handleSend} className="mt-1 flex gap-2">
          <Textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva sua mensagem…"
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <Button type="submit" disabled={sending}>
            {sending ? "…" : "Enviar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

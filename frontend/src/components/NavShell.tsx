"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useApp } from "@/context/AppContext";
import { apiFetch } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Painel", icon: "📊" },
  { href: "/registro", label: "Refeições", icon: "🍽️" },
  { href: "/plano-alimentar", label: "Plano Alimentar", icon: "📋" },
  { href: "/plano-treino", label: "Plano de Treino", icon: "🏋️" },
  { href: "/cardapio", label: "Cardápio", icon: "🗓️" },
  { href: "/chat", label: "Chat", icon: "💬" },
  { href: "/familia", label: "Família", icon: "👨‍👩‍👧" },
  { href: "/perfil", label: "Perfil", icon: "👤" },
];

export default function NavShell({ children }: { children: React.ReactNode }) {
  const { authed, loading, currentUser, viewableUsers, viewedUserId, setViewedUserId, signOut } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [checkedOwnProfile, setCheckedOwnProfile] = useState(false);

  useEffect(() => {
    if (!loading && !authed) {
      router.replace("/login");
    }
  }, [loading, authed, router]);

  // Primeiro acesso: se o usuário logado ainda não tem perfil cadastrado,
  // manda direto para /perfil em vez do painel.
  useEffect(() => {
    if (!currentUser || checkedOwnProfile) return;
    apiFetch("/profile")
      .then(() => setCheckedOwnProfile(true))
      .catch(() => {
        setCheckedOwnProfile(true);
        if (pathname !== "/perfil") router.replace("/perfil");
      });
  }, [currentUser, checkedOwnProfile, pathname, router]);

  if (loading || !authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page)] text-sm text-[var(--ink-secondary)]">
        Carregando…
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page)] px-6 text-center text-sm text-[var(--ink-secondary)]">
        Sua conta ainda não foi cadastrada no app. Peça a um administrador para te convidar.
      </div>
    );
  }

  const isAdmin = currentUser.role === "admin";
  const items = isAdmin ? [...NAV_ITEMS, { href: "/admin", label: "Administração", icon: "🛠️" }] : NAV_ITEMS;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--page)] md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-56 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-4 md:flex md:flex-col">
        <div className="mb-6 text-base font-semibold">Team Fit</div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm ${
                pathname === item.href
                  ? "bg-[#2a78d6]/10 font-medium text-[#2a78d6]"
                  : "text-[var(--ink-secondary)] hover:bg-[var(--page)]"
              }`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
        <button onClick={() => signOut()} className="mt-4 text-left text-sm text-[var(--ink-muted)] hover:text-[var(--ink-primary)]">
          Sair
        </button>
      </aside>

      {/* Top bar */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <div className="text-sm font-medium">{currentUser.full_name}</div>
          {viewableUsers.length > 1 && (
            <select
              value={viewedUserId ?? currentUser.id}
              onChange={(e) => setViewedUserId(e.target.value === currentUser.id ? null : e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
            >
              {viewableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} {u.id === currentUser.id ? "(você)" : ""}
                </option>
              ))}
            </select>
          )}
          <button onClick={() => signOut()} className="text-xs text-[var(--ink-muted)] md:hidden">
            Sair
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">{children}</main>
      </div>

      {/* Bottom tab bar (mobile) — rolável para caber todos os itens */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex gap-1 overflow-x-auto border-t border-[var(--border)] bg-[var(--surface)] px-1 py-2 md:hidden">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 flex-col items-center gap-0.5 px-3 text-[10px] ${
              pathname === item.href ? "text-[#2a78d6]" : "text-[var(--ink-muted)]"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

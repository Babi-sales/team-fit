"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useApp } from "@/context/AppContext";
import { PersonSlug } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Painel", icon: "📊" },
  { href: "/log", label: "Refeições", icon: "🍽️" },
  { href: "/foods", label: "Alimentos", icon: "🥗" },
  { href: "/training", label: "Treino", icon: "🏋️" },
  { href: "/profile", label: "Perfil", icon: "👤" },
];

const PEOPLE: { slug: PersonSlug; label: string }[] = [
  { slug: "paulo", label: "Paulo" },
  { slug: "barbara", label: "Bárbara" },
];

export default function NavShell({ children }: { children: React.ReactNode }) {
  const { pinOk, pinChecked, logout, person, setPerson } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pinChecked && !pinOk) {
      router.replace("/login");
    }
  }, [pinChecked, pinOk, router]);

  if (!pinChecked || !pinOk) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page)] text-sm text-[var(--ink-secondary)]">
        Carregando…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--page)] md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-56 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-4 md:flex md:flex-col">
        <div className="mb-6 text-base font-semibold">Team Fit</div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
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
        <button onClick={() => logout()} className="mt-4 text-left text-sm text-[var(--ink-muted)] hover:text-[var(--ink-primary)]">
          Bloquear
        </button>
      </aside>

      {/* Top bar */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <div className="text-sm font-medium">Team Fit</div>
          <select
            value={person}
            onChange={(e) => setPerson(e.target.value as PersonSlug)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
          >
            {PEOPLE.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.label}
              </option>
            ))}
          </select>
          <button onClick={() => logout()} className="text-xs text-[var(--ink-muted)] md:hidden">
            Bloquear
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">{children}</main>
      </div>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex gap-1 overflow-x-auto border-t border-[var(--border)] bg-[var(--surface)] px-1 py-2 md:hidden">
        {NAV_ITEMS.map((item) => (
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

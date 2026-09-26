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

function PersonToggle({ person, setPerson }: { person: PersonSlug; setPerson: (p: PersonSlug) => void }) {
  return (
    <div className="flex rounded-xl border border-[var(--border)] bg-[var(--page)] p-1">
      {PEOPLE.map((p) => (
        <button
          key={p.slug}
          onClick={() => setPerson(p.slug)}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
            person === p.slug ? "bg-[var(--surface)] text-[var(--accent)] shadow-sm" : "text-[var(--ink-secondary)]"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

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
    <div className="flex min-h-screen flex-col bg-[var(--page)] lg:flex-row">
      {/* Sidebar — real desktop/laptop only. Tablets (portrait or landscape)
          use the touch-friendly bottom tab bar instead. */}
      <aside className="hidden w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-5 lg:flex lg:flex-col">
        <div className="mb-6 text-lg font-semibold text-[var(--ink-primary)]">Team Fit</div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-3 py-2.5 text-sm transition-colors duration-150 ${
                pathname === item.href
                  ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                  : "text-[var(--ink-secondary)] hover:bg-[var(--page)]"
              }`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => logout()}
          className="mt-4 text-left text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink-primary)]"
        >
          Bloquear
        </button>
      </aside>

      {/* Top bar */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
          <div className="hidden text-sm font-medium text-[var(--ink-primary)] lg:block">Team Fit</div>
          <PersonToggle person={person} setPerson={setPerson} />
          <button
            onClick={() => logout()}
            className="rounded-lg px-2 py-1 text-xs text-[var(--ink-muted)] transition-colors hover:text-[var(--ink-primary)] lg:hidden"
          >
            Bloquear
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 lg:pb-6">{children}</main>
      </div>

      {/* Bottom tab bar — mobile & tablet */}
      <nav
        className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-[var(--border)] bg-[var(--surface)] px-1 pt-2 lg:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-w-16 flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[11px] font-medium transition-colors duration-150 ${
              pathname === item.href ? "text-[var(--accent)]" : "text-[var(--ink-muted)]"
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

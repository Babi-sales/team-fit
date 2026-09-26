"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui";
import { apiFetch, withPerson } from "@/lib/api";
import { MealLog, PersonSlug } from "@/lib/types";

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Café da manhã",
  morning_snack: "Lanche da manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche da tarde",
  dinner: "Jantar",
  supper: "Ceia",
};

const HISTORY_DAYS = 14;

interface DaySummary {
  date: string;
  meals: MealLog[];
  totalKcal: number;
  totalProtein: number;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function MealHistory({ person }: { person: PersonSlug }) {
  const [days, setDays] = useState<DaySummary[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (HISTORY_DAYS - 1));

    apiFetch<MealLog[]>(withPerson(`/meal-logs?date_from=${toISO(start)}&date_to=${toISO(end)}`, person))
      .then((logs) => {
        const byDate = new Map<string, MealLog[]>();
        for (const log of logs) {
          const list = byDate.get(log.date) ?? [];
          list.push(log);
          byDate.set(log.date, list);
        }
        const summaries: DaySummary[] = Array.from(byDate.entries())
          .map(([date, meals]) => ({
            date,
            meals,
            totalKcal: meals.reduce((sum, m) => sum + m.items.reduce((s, it) => s + it.kcal, 0), 0),
            totalProtein: meals.reduce((sum, m) => sum + m.items.reduce((s, it) => s + it.protein_g, 0), 0),
          }))
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        setDays(summaries);
      })
      .catch(() => setDays([]));
  }, [person]);

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold">Histórico ({HISTORY_DAYS} dias)</h2>
      {days.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">Nenhuma refeição registrada nos últimos {HISTORY_DAYS} dias.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)] text-sm">
          {days.map((d) => (
            <li key={d.date} className="py-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setExpandedDate(expandedDate === d.date ? null : d.date)}
              >
                <span>{d.date}</span>
                <span className="flex items-center gap-2 text-xs text-[var(--ink-secondary)]">
                  {Math.round(d.totalKcal)} kcal · {Math.round(d.totalProtein)}g
                  <span className="text-[var(--ink-muted)]">{expandedDate === d.date ? "▲" : "▼"}</span>
                </span>
              </button>
              {expandedDate === d.date && (
                <div className="mt-2 space-y-2 pl-1">
                  {d.meals.map((meal) => (
                    <div key={meal.id}>
                      <div className="text-xs font-medium text-[var(--ink-secondary)]">
                        {MEAL_TYPE_LABELS[meal.meal_type] ?? meal.meal_type}
                      </div>
                      <ul>
                        {meal.items.map((item) => (
                          <li key={item.id} className="flex justify-between text-xs text-[var(--ink-muted)]">
                            <span>{item.food_name ? `${item.quantity_g}g ${item.food_name}` : item.free_text_description}</span>
                            <span>{Math.round(item.kcal)} kcal</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

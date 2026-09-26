"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, Card, Input, PageHeader, Select, StatTile } from "@/components/ui";
import MealHistory from "@/components/MealHistory";
import { useApp } from "@/context/AppContext";
import { apiFetch, withPerson } from "@/lib/api";
import { DailyTotals, Food, MealLog, MealType } from "@/lib/types";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Café da manhã" },
  { value: "morning_snack", label: "Lanche da manhã" },
  { value: "lunch", label: "Almoço" },
  { value: "afternoon_snack", label: "Lanche da tarde" },
  { value: "dinner", label: "Jantar" },
  { value: "supper", label: "Ceia" },
];

function mealTypeLabel(value: string): string {
  return MEAL_TYPES.find((m) => m.value === value)?.label ?? value;
}

interface StagedItem {
  key: string;
  foodId: string | null;
  foodName: string;
  quantityG: number | null;
  description: string;
  kcal: number;
  proteinG: number;
}

export default function LogPage() {
  const { person } = useApp();
  const [date, setDate] = useState(todayISO());
  const [daily, setDaily] = useState<DailyTotals | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);

  const [mealType, setMealType] = useState<MealType>("lunch");
  const [staged, setStaged] = useState<StagedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedFoodId, setSelectedFoodId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [freeDescription, setFreeDescription] = useState("");
  const [freeKcal, setFreeKcal] = useState("");
  const [freeProtein, setFreeProtein] = useState("");

  async function loadDaily() {
    try {
      const d = await apiFetch<DailyTotals>(withPerson(`/meal-logs/daily?date=${date}`, person));
      setDaily(d);
    } catch {
      setDaily(null);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDaily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person, date]);

  useEffect(() => {
    apiFetch<Food[]>("/foods")
      .then(setFoods)
      .catch(() => setFoods([]));
  }, []);

  const filteredFoods = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return foods.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 8);
  }, [foods, search]);

  const selectedFood = foods.find((f) => f.id === selectedFoodId) ?? null;
  const previewKcal = selectedFood && quantity ? Math.round((Number(quantity) * Number(selectedFood.kcal_per_100g)) / 100) : null;

  function addFoodItem() {
    if (!selectedFood || !quantity) return;
    const qty = Number(quantity);
    setStaged((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        foodId: selectedFood.id,
        foodName: selectedFood.name,
        quantityG: qty,
        description: "",
        kcal: Math.round((qty * Number(selectedFood.kcal_per_100g)) / 100),
        proteinG: Math.round((qty * Number(selectedFood.protein_per_100g)) / 100),
      },
    ]);
    setSearch("");
    setSelectedFoodId("");
    setQuantity("");
  }

  function addFreeItem() {
    if (!freeDescription.trim() || !freeKcal) return;
    setStaged((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        foodId: null,
        foodName: freeDescription,
        quantityG: null,
        description: freeDescription,
        kcal: Number(freeKcal),
        proteinG: Number(freeProtein) || 0,
      },
    ]);
    setFreeDescription("");
    setFreeKcal("");
    setFreeProtein("");
  }

  function removeStagedItem(key: string) {
    setStaged((prev) => prev.filter((item) => item.key !== key));
  }

  async function saveMeal() {
    if (staged.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const meal = await apiFetch<MealLog>(withPerson("/meal-logs", person), {
        method: "POST",
        body: JSON.stringify({ date, meal_type: mealType }),
      });
      for (const item of staged) {
        await apiFetch(withPerson(`/meal-logs/${meal.id}/items`, person), {
          method: "POST",
          body: JSON.stringify(
            item.foodId
              ? { food_id: item.foodId, quantity_g: item.quantityG }
              : { free_text_description: item.description, kcal: item.kcal, protein_g: item.proteinG }
          ),
        });
      }
      setStaged([]);
      await loadDaily();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMeal(id: string) {
    await apiFetch(withPerson(`/meal-logs/${id}`, person), { method: "DELETE" });
    await loadDaily();
  }

  async function deleteItem(id: string) {
    await apiFetch(withPerson(`/meal-logs/items/${id}`, person), { method: "DELETE" });
    await loadDaily();
  }

  const stagedTotalKcal = staged.reduce((sum, item) => sum + item.kcal, 0);

  return (
    <div className="space-y-4">
      <PageHeader title="Registro de refeições" subtitle="Escolha o dia e registre o que foi consumido" />

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Refeições do dia</h2>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        </div>

        {daily && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            <StatTile
              label="Calorias"
              value={`${Math.round(daily.total_kcal)} kcal`}
              sub={daily.target_kcal ? `meta ${daily.target_kcal} · ${daily.kcal_diff! >= 0 ? "+" : ""}${Math.round(daily.kcal_diff ?? 0)}` : "sem meta"}
            />
            <StatTile
              label="Proteína"
              value={`${Math.round(daily.total_protein)} g`}
              sub={daily.target_protein ? `meta ${daily.target_protein}g` : "sem meta"}
            />
          </div>
        )}

        <div className="space-y-2 text-sm">
          {daily?.meals.map((meal) => (
            <div key={meal.id} className="border-b border-[var(--border)] pb-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">{mealTypeLabel(meal.meal_type)}</span>
                <button onClick={() => deleteMeal(meal.id)} className="text-xs text-[#d03b3b]">
                  remover refeição
                </button>
              </div>
              <ul className="space-y-0.5">
                {meal.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-[var(--ink-secondary)]">
                    <span>
                      {item.food_name ? `${item.quantity_g}g ${item.food_name}` : item.free_text_description}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs">
                        {Math.round(item.kcal)}kcal · {Math.round(item.protein_g)}g
                      </span>
                      <button onClick={() => deleteItem(item.id)} className="text-xs text-[#d03b3b]">
                        remover
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {(!daily || daily.meals.length === 0) && <p className="text-[var(--ink-muted)]">Nenhuma refeição registrada neste dia.</p>}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Adicionar refeição</h2>

        <div className="mb-3">
          <Select value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
            {MEAL_TYPES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="mb-3 rounded-lg border border-[var(--border)] p-3">
          <p className="mb-2 text-xs font-medium text-[var(--ink-secondary)]">Buscar alimento</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
            <div className="relative sm:col-span-3">
              <Input
                placeholder="ex: arroz, frango, ovo…"
                value={selectedFood ? selectedFood.name : search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedFoodId("");
                }}
              />
              {search && !selectedFood && filteredFoods.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                  {filteredFoods.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--page)]"
                        onClick={() => {
                          setSelectedFoodId(f.id);
                          setSearch(f.name);
                        }}
                      >
                        {f.name} <span className="text-xs text-[var(--ink-muted)]">({f.kcal_per_100g} kcal/100g)</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Input
              type="number"
              placeholder="gramas"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="sm:col-span-1"
            />
            <Button type="button" onClick={addFoodItem} disabled={!selectedFood || !quantity} className="sm:col-span-2">
              Adicionar item
            </Button>
          </div>
          {previewKcal != null && (
            <p className="mt-1 text-xs text-[var(--ink-muted)]">≈ {previewKcal} kcal</p>
          )}
        </div>

        <div className="mb-3 rounded-lg border border-[var(--border)] p-3">
          <p className="mb-2 text-xs font-medium text-[var(--ink-secondary)]">Item sem correspondência (ex: restaurante)</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
            <Input
              placeholder="descrição"
              value={freeDescription}
              onChange={(e) => setFreeDescription(e.target.value)}
              className="sm:col-span-3"
            />
            <Input type="number" placeholder="kcal" value={freeKcal} onChange={(e) => setFreeKcal(e.target.value)} className="sm:col-span-1" />
            <Input
              type="number"
              placeholder="proteína g"
              value={freeProtein}
              onChange={(e) => setFreeProtein(e.target.value)}
              className="sm:col-span-1"
            />
            <Button type="button" variant="secondary" onClick={addFreeItem} disabled={!freeDescription.trim() || !freeKcal} className="sm:col-span-1">
              Adicionar
            </Button>
          </div>
        </div>

        {staged.length > 0 && (
          <ul className="mb-3 space-y-1 text-sm">
            {staged.map((item) => (
              <li key={item.key} className="flex items-center justify-between border-b border-[var(--border)] py-1">
                <span>
                  {item.quantityG ? `${item.quantityG}g ` : ""}
                  {item.foodName}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-[var(--ink-secondary)]">{item.kcal} kcal</span>
                  <button onClick={() => removeStagedItem(item.key)} className="text-xs text-[#d03b3b]">
                    remover
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="mb-2 text-xs text-[#d03b3b]">{error}</p>}

        <Button type="button" onClick={saveMeal} disabled={staged.length === 0 || saving}>
          {saving ? "Salvando…" : `Salvar refeição (${Math.round(stagedTotalKcal)} kcal)`}
        </Button>
      </Card>

      <MealHistory person={person} />
    </div>
  );
}

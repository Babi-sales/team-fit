"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, Card, Input, Label, PageHeader, Select } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { Food } from "@/lib/types";

const EMPTY_FORM = {
  name: "",
  category: "",
  kcal_per_100g: "",
  protein_per_100g: "",
  carbs_per_100g: "",
  fat_per_100g: "",
  default_portion_g: "",
  default_portion_label: "",
};

export default function FoodsPage() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    try {
      const list = await apiFetch<Food[]>("/foods");
      setFoods(list);
    } catch {
      setFoods([]);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const categories = useMemo(() => Array.from(new Set(foods.map((f) => f.category).filter(Boolean))) as string[], [foods]);

  const filtered = foods.filter((f) => {
    const matchesSearch = !search.trim() || f.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = !category || f.category === category;
    return matchesSearch && matchesCategory;
  });

  function startEdit(food: Food) {
    setEditingId(food.id);
    setForm({
      name: food.name,
      category: food.category ?? "",
      kcal_per_100g: String(food.kcal_per_100g),
      protein_per_100g: String(food.protein_per_100g),
      carbs_per_100g: String(food.carbs_per_100g),
      fat_per_100g: String(food.fat_per_100g),
      default_portion_g: food.default_portion_g != null ? String(food.default_portion_g) : "",
      default_portion_label: food.default_portion_label ?? "",
    });
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        category: form.category || null,
        kcal_per_100g: Number(form.kcal_per_100g),
        protein_per_100g: Number(form.protein_per_100g) || 0,
        carbs_per_100g: Number(form.carbs_per_100g) || 0,
        fat_per_100g: Number(form.fat_per_100g) || 0,
        default_portion_g: form.default_portion_g ? Number(form.default_portion_g) : null,
        default_portion_label: form.default_portion_label || null,
      };
      if (editingId) {
        await apiFetch(`/foods/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/foods", { method: "POST", body: JSON.stringify(payload) });
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Tabela de alimentos" subtitle="Valores nutricionais por 100g usados no cálculo das refeições" />

      <Card>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-2">
            <Input placeholder="Buscar alimento…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto">
              <option value="">Todas categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" onClick={startNew}>
            + Novo alimento
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--ink-muted)]">
                <th className="py-2 pr-2">Alimento</th>
                <th className="py-2 pr-2">Categoria</th>
                <th className="py-2 pr-2 text-right">Kcal</th>
                <th className="py-2 pr-2 text-right">Proteína</th>
                <th className="py-2 pr-2 text-right">Carbo</th>
                <th className="py-2 pr-2 text-right">Gordura</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.id} className="border-b border-[var(--border)]">
                  <td className="py-2 pr-2">
                    {f.name}
                    {f.default_portion_label && (
                      <div className="text-xs text-[var(--ink-muted)]">{f.default_portion_label}</div>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-[var(--ink-secondary)]">{f.category ?? "—"}</td>
                  <td className="py-2 pr-2 text-right">{f.kcal_per_100g}</td>
                  <td className="py-2 pr-2 text-right">{f.protein_per_100g}g</td>
                  <td className="py-2 pr-2 text-right">{f.carbs_per_100g}g</td>
                  <td className="py-2 pr-2 text-right">{f.fat_per_100g}g</td>
                  <td className="py-2 text-right">
                    <button onClick={() => startEdit(f)} className="text-xs text-[var(--accent)]">
                      editar
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-[var(--ink-muted)]">
                    Nenhum alimento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showForm && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">{editingId ? "Editar alimento" : "Novo alimento"}</h2>
          <form onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <Label>Kcal por 100g</Label>
              <Input type="number" step="0.1" value={form.kcal_per_100g} onChange={(e) => setForm({ ...form, kcal_per_100g: e.target.value })} required />
            </div>
            <div>
              <Label>Proteína por 100g</Label>
              <Input type="number" step="0.1" value={form.protein_per_100g} onChange={(e) => setForm({ ...form, protein_per_100g: e.target.value })} />
            </div>
            <div>
              <Label>Carboidrato por 100g</Label>
              <Input type="number" step="0.1" value={form.carbs_per_100g} onChange={(e) => setForm({ ...form, carbs_per_100g: e.target.value })} />
            </div>
            <div>
              <Label>Gordura por 100g</Label>
              <Input type="number" step="0.1" value={form.fat_per_100g} onChange={(e) => setForm({ ...form, fat_per_100g: e.target.value })} />
            </div>
            <div>
              <Label>Porção padrão (g, opcional)</Label>
              <Input type="number" step="0.1" value={form.default_portion_g} onChange={(e) => setForm({ ...form, default_portion_g: e.target.value })} />
            </div>
            <div>
              <Label>Descrição da porção (opcional)</Label>
              <Input value={form.default_portion_label} onChange={(e) => setForm({ ...form, default_portion_label: e.target.value })} />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

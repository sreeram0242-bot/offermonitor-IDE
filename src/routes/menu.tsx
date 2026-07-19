import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  loadMenu,
  saveMenu,
  newId,
  loadCategories,
  saveCategories,
  getCategoryOf,
  type MenuItem,
} from "@/lib/loyalty";

export const Route = createFileRoute("/menu")({
  head: () => ({ meta: [{ title: "Menu — CD Billing" }] }),
  component: MenuPage,
});

function MenuPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [filterCat, setFilterCat] = useState<string>("All");

  useEffect(() => {
    setMenu(loadMenu());
    const cats = loadCategories();
    setCategories(cats);
    setNewItemCategory(cats[0] ?? "");
  }, []);

  function persist(next: MenuItem[]) {
    setMenu(next);
    saveMenu(next);
  }
  function persistCats(next: string[]) {
    setCategories(next);
    saveCategories(next);
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    const p = parseInt(price, 10);
    const cp = parseInt(costPrice, 10) || 0;
    if (!name.trim() || !Number.isFinite(p) || p <= 0) {
      alert("Enter a valid name and price.");
      return;
    }
    persist([
      ...menu,
      {
        id: newId(),
        name: name.trim(),
        price: p,
        costPrice: cp,
        category: newItemCategory || undefined,
      },
    ]);
    setName("");
    setPrice("");
    setCostPrice("");
  }

  function updateItem(id: string, patch: Partial<MenuItem>) {
    persist(menu.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function removeItem(id: string) {
    if (!confirm("Remove this item?")) return;
    persist(menu.filter((m) => m.id !== id));
  }

  function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const c = newCategory.trim();
    if (!c) return;
    if (categories.includes(c)) {
      alert("Category already exists.");
      return;
    }
    persistCats([...categories, c]);
    setNewCategory("");
  }

  function renameCategory(oldName: string) {
    const next = prompt("Rename category", oldName)?.trim();
    if (!next || next === oldName) return;
    if (categories.includes(next)) {
      alert("A category with that name already exists.");
      return;
    }
    persistCats(categories.map((c) => (c === oldName ? next : c)));
    // update items using the old category
    persist(menu.map((m) => (getCategoryOf(m) === oldName ? { ...m, category: next } : m)));
  }

  function deleteCategory(name: string) {
    if (!confirm(`Delete category "${name}"? Items will become uncategorized.`)) return;
    persistCats(categories.filter((c) => c !== name));
    persist(menu.map((m) => (m.category === name ? { ...m, category: "" } : m)));
  }

  const filtered = useMemo(
    () =>
      menu.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) &&
          (filterCat === "All" || getCategoryOf(m) === filterCat),
      ),
    [menu, search, filterCat],
  );

  const categoryOptions = categories.length ? categories : [""];

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl text-primary">Menu Items</h1>

      {/* Categories manager */}
      <div className="card-menu p-5 space-y-3">
        <h2 className="font-display text-xl text-primary">Categories</h2>
        <form onSubmit={addCategory} className="flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="New category name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            maxLength={30}
          />
          <button type="submit" className="btn-accent">
            + Add
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <div
              key={c}
              className="flex items-center gap-2 rounded-full border-2 border-primary/20 bg-secondary px-3 py-1 text-sm"
            >
              <span className="font-bold text-primary">{c}</span>
              <button
                onClick={() => renameCategory(c)}
                className="text-xs text-muted-foreground hover:text-primary"
                title="Rename"
              >
                ✎
              </button>
              <button
                onClick={() => deleteCategory(c)}
                className="text-xs text-destructive hover:underline"
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground">No categories yet.</p>
          )}
        </div>
      </div>

      {/* Add item */}
      <form
        onSubmit={addItem}
        className="card-menu flex flex-col md:grid gap-3 p-4 md:p-5 md:grid-cols-[1fr_160px_100px_100px_auto]"
      >
        <input
          className="input-field"
          placeholder="Item name (e.g. Veg burger)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />
        <select
          className="input-field"
          value={newItemCategory}
          onChange={(e) => setNewItemCategory(e.target.value)}
        >
          <option value="">Uncategorized</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c || "Uncategorized"}
            </option>
          ))}
        </select>
        <div className="flex gap-3 md:contents">
          <input
            className="input-field flex-1"
            placeholder="Cost ₹"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            maxLength={5}
          />
          <input
            className="input-field flex-1"
            placeholder="Price ₹"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            maxLength={5}
          />
        </div>
        <button type="submit" className="btn-accent">
          + Add item
        </button>
      </form>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="input-field flex-1 min-w-0"
          placeholder="Search menu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input-field w-full sm:w-48"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="All">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="grid gap-2">
        {filtered.map((m) => (
          <div key={m.id} className="card-soft flex flex-wrap items-center gap-2 md:gap-3 p-3">
            <input
              className="input-field flex-1 min-w-[120px] md:min-w-[200px]"
              value={m.name}
              onChange={(e) => updateItem(m.id, { name: e.target.value })}
            />
            <select
              className="input-field w-full sm:w-40"
              value={getCategoryOf(m)}
              onChange={(e) => updateItem(m.id, { category: e.target.value })}
            >
              {!categories.includes(getCategoryOf(m)) && (
                <option value={getCategoryOf(m)}>{getCategoryOf(m)}</option>
              )}
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="">Uncategorized</option>
            </select>
            <div className="flex flex-1 sm:flex-none items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1">
                <span className="font-display text-muted-foreground text-sm">Cost ₹</span>
                <input
                  className="input-field w-16 md:w-20"
                  value={m.costPrice ?? ""}
                  placeholder="0"
                  onChange={(e) =>
                    updateItem(m.id, {
                      costPrice: parseInt(e.target.value.replace(/\D/g, "") || "0", 10),
                    })
                  }
                  inputMode="numeric"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="font-display text-accent">₹</span>
                <input
                  className="input-field w-20 md:w-24"
                  value={m.price}
                  onChange={(e) =>
                    updateItem(m.id, {
                      price: parseInt(e.target.value.replace(/\D/g, "") || "0", 10),
                    })
                  }
                  inputMode="numeric"
                />
              </div>
            </div>
            <button
              onClick={() => removeItem(m.id)}
              className="text-sm font-bold text-destructive hover:underline w-full sm:w-auto text-right sm:text-left mt-1 sm:mt-0"
            >
              Remove
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card-soft p-6 text-center text-muted-foreground">No items.</div>
        )}
      </div>
    </div>
  );
}

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
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  FolderPlus,
  UtensilsCrossed,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/menu")({
  head: () => ({ meta: [{ title: "Menu Items — CD Billing" }] }),
  component: MenuPage,
});

function MenuPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("All");

  // Add Item state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<string>("");

  // Edit Item modal state
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Category Manager modal state
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");

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

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    const p = parseInt(price, 10);
    const cp = parseInt(costPrice, 10) || 0;
    if (!name.trim() || !Number.isFinite(p) || p <= 0) {
      toast.error("Enter a valid name and price.");
      return;
    }
    const newItem: MenuItem = {
      id: newId(),
      name: name.trim(),
      price: p,
      costPrice: cp,
      category: newItemCategory || undefined,
    };

    persist([...menu, newItem]);
    setName("");
    setPrice("");
    setCostPrice("");
    setIsAddOpen(false);
    toast.success(`"${newItem.name}" added to menu!`);
  }

  function handleUpdateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    if (!editingItem.name.trim() || editingItem.price <= 0) {
      toast.error("Valid name and price required.");
      return;
    }
    persist(menu.map((m) => (m.id === editingItem.id ? editingItem : m)));
    setEditingItem(null);
    toast.success("Item updated!");
  }

  function handleRemoveItem(id: string, itemName: string) {
    if (!confirm(`Delete "${itemName}" from menu?`)) return;
    persist(menu.filter((m) => m.id !== id));
    toast.success("Item removed.");
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const c = newCategory.trim();
    if (!c) return;
    if (categories.includes(c)) {
      toast.error("Category already exists.");
      return;
    }
    persistCats([...categories, c]);
    setNewCategory("");
    toast.success(`Category "${c}" created!`);
  }

  function handleRenameCategory(oldName: string) {
    const next = prompt("Rename category", oldName)?.trim();
    if (!next || next === oldName) return;
    if (categories.includes(next)) {
      toast.error("Category already exists.");
      return;
    }
    persistCats(categories.map((c) => (c === oldName ? next : c)));
    persist(menu.map((m) => (getCategoryOf(m) === oldName ? { ...m, category: next } : m)));
    toast.success(`Renamed to "${next}"`);
  }

  function handleDeleteCategory(name: string) {
    if (!confirm(`Delete category "${name}"? Items will become uncategorized.`)) return;
    persistCats(categories.filter((c) => c !== name));
    persist(menu.map((m) => (m.category === name ? { ...m, category: "" } : m)));
    toast.success("Category deleted.");
  }

  const filtered = useMemo(
    () =>
      menu.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) &&
          (filterCat === "All" || getCategoryOf(m) === filterCat)
      ),
    [menu, search, filterCat]
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-primary font-bold">
            Menu Items
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {menu.length} total dishes & drinks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCategoryManagerOpen(true)}
            className="btn-ghost py-2 px-3 text-xs md:text-sm font-semibold gap-1.5"
          >
            <FolderPlus className="h-4 w-4" />
            <span>Categories</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="btn-accent py-2 px-3 text-xs md:text-sm font-bold gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="card-menu p-3 md:p-4 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            className="input-field pl-9 pr-9 py-2 text-sm"
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Horizontal Category Chips */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {["All", ...categories, "Other"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-all ${
                filterCat === cat
                  ? "border-accent bg-accent text-accent-foreground shadow-xs"
                  : "border-primary/20 bg-card text-muted-foreground hover:border-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Cards Grid */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => {
          const cost = m.costPrice || 0;
          const profit = m.price - cost;
          const profitMargin = m.price > 0 ? Math.round((profit / m.price) * 100) : 0;

          return (
            <div
              key={m.id}
              className="card-menu p-3.5 rounded-xl flex flex-col justify-between hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-base text-foreground leading-tight truncate">
                    {m.name}
                  </h3>
                  <div className="inline-flex items-center gap-1 rounded-md bg-secondary border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground mt-1">
                    <Tag className="h-2.5 w-2.5" />
                    <span>{getCategoryOf(m)}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-display text-xl font-bold text-primary">₹{m.price}</div>
                  {cost > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      Cost: ₹{cost} · Profit: <span className="text-accent font-bold">₹{profit} ({profitMargin}%)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-end gap-2">
                <button
                  onClick={() => setEditingItem(m)}
                  className="btn-ghost py-1 px-2.5 text-xs font-semibold gap-1 text-primary hover:bg-primary/10"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => handleRemoveItem(m.id, m.name)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                  title="Remove Item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full card-soft p-12 text-center text-muted-foreground space-y-2">
            <UtensilsCrossed className="h-10 w-10 mx-auto opacity-30" />
            <p className="font-medium text-sm">No items found.</p>
            <p className="text-xs text-muted-foreground">Tap "+ Add Item" to add new food or drinks.</p>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-card border-2 border-primary/20 shadow-2xl p-5 my-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="font-display text-xl text-primary font-bold">Add Menu Item</h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="mt-4 space-y-3">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">
                  Item Name
                </span>
                <input
                  className="input-field"
                  placeholder="e.g. Veg Cheese Burger"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">
                  Category
                </span>
                <select
                  className="input-field"
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">
                    Cost Price (₹)
                  </span>
                  <input
                    type="tel"
                    className="input-field font-mono"
                    placeholder="e.g. 35"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value.replace(/\D/g, ""))}
                  />
                </div>

                <div>
                  <span className="text-xs font-bold text-primary uppercase block mb-1">
                    Selling Price (₹)*
                  </span>
                  <input
                    type="tel"
                    className="input-field font-mono font-bold"
                    placeholder="e.g. 69"
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </div>
              </div>

              <div className="mt-5 flex gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="btn-ghost flex-1 py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-accent flex-1 py-2 font-bold">
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-card border-2 border-primary/20 shadow-2xl p-5 my-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="font-display text-xl text-primary font-bold">Edit Item</h2>
              <button
                onClick={() => setEditingItem(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="mt-4 space-y-3">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">
                  Item Name
                </span>
                <input
                  className="input-field"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">
                  Category
                </span>
                <select
                  className="input-field"
                  value={editingItem.category || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">
                    Cost Price (₹)
                  </span>
                  <input
                    type="tel"
                    className="input-field font-mono"
                    value={editingItem.costPrice || ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        costPrice: parseInt(e.target.value.replace(/\D/g, "") || "0", 10),
                      })
                    }
                  />
                </div>

                <div>
                  <span className="text-xs font-bold text-primary uppercase block mb-1">
                    Selling Price (₹)*
                  </span>
                  <input
                    type="tel"
                    className="input-field font-mono font-bold"
                    value={editingItem.price}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        price: parseInt(e.target.value.replace(/\D/g, "") || "0", 10),
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="mt-5 flex gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="btn-ghost flex-1 py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-accent flex-1 py-2 font-bold">
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-card border-2 border-primary/20 shadow-2xl p-5 my-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="font-display text-xl text-primary font-bold">Categories Manager</h2>
              <button
                onClick={() => setIsCategoryManagerOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="mt-4 flex gap-2">
              <input
                className="input-field flex-1 text-sm py-1.5"
                placeholder="New Category (e.g. Desserts)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <button type="submit" className="btn-accent px-3 py-1.5 text-xs font-bold">
                + Add
              </button>
            </form>

            <div className="mt-4 space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {categories.map((c) => (
                <div
                  key={c}
                  className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 border border-border text-sm"
                >
                  <span className="font-bold text-foreground">{c}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRenameCategory(c)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(c)}
                      className="text-xs font-medium text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-border">
              <button
                onClick={() => setIsCategoryManagerOpen(false)}
                className="btn-primary w-full py-2 text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  addBill,
  computeLoyalty,
  FREE_ITEM_MAX_PRICE,
  loadBills,
  loadMenu,
  loadCategories,
  getCategoryOf,
  newId,
  todayISO,
  useSettings,
  type Bill,
  type BillItem,
  type MenuItem,
} from "@/lib/loyalty";
import { toast } from "sonner";

export const Route = createFileRoute("/new-bill")({
  head: () => ({
    meta: [{ title: "New Bill — CD Billing" }],
  }),
  component: NewBill,
});

function NewBill() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tableName, setTableName] = useState("");
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState<BillItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [freeItemId, setFreeItemId] = useState<string>("");
  const [isFreeMode, setIsFreeMode] = useState<boolean>(false);
  const settings = useSettings();

  useEffect(() => {
    setMenu(loadMenu());
    setAllCategories(loadCategories());
  }, []);

  // Auto-fill name if phone matches an existing customer
  useEffect(() => {
    if (phone.length >= 4) {
      const existing = loadBills().find((b) => b.phone === phone);
      if (existing && !name) setName(existing.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  const loyalty = useMemo(() => {
    if (!phone || !settings.streakOfferEnabled) return null;
    const allBills = loadBills();
    const custBills = allBills.filter(b => b.phone === phone);
    return computeLoyalty(custBills);
  }, [phone, settings.streakOfferEnabled]);

  const eligibleForFree = loyalty?.eligibleToday && date === todayISO();

  const freeItemOptions = menu.filter((m) => m.price <= FREE_ITEM_MAX_PRICE);

  const filteredMenu = useMemo(() => {
    return menu.filter(
      (m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) &&
        (category === "All" || getCategoryOf(m) === category),
    );
  }, [menu, search, category]);

  const usedCategories = Array.from(new Set(menu.map((m) => getCategoryOf(m))));
  const orderedCats = [
    "Sandwiches",
    "Burgers",
    "Fries",
    "Manchurian",
    "Noodles",
    "Rice",
    "Momos",
    "Mojito",
    ...allCategories.filter(
      (c) =>
        ![
          "Sandwiches",
          "Burgers",
          "Fries",
          "Manchurian",
          "Noodles",
          "Rice",
          "Momos",
          "Mojito",
        ].includes(c)
    ),
  ];
  const categories = ["All", ...orderedCats];

  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const gstAmount = Math.round((subtotal * (settings.gstPercentage || 0)) / 100);
  const total = subtotal + gstAmount;
  const totalQty = items.reduce((s, it) => s + it.qty, 0);

  function addItem(m: MenuItem) {
    setItems((prev) => {
      const existing = prev.find((i) => i.name === m.name && !!i.isFree === isFreeMode);
      if (existing) {
        return prev.map((i) => (i.name === m.name && !!i.isFree === isFreeMode ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { name: m.name, price: isFreeMode ? 0 : m.price, qty: 1, costPrice: m.costPrice, isFree: isFreeMode }];
    });
  }

  function removeItem(name: string, isFree: boolean = false) {
    setItems((prev) => {
      const existing = prev.find((i) => i.name === name && !!i.isFree === isFree);
      if (!existing) return prev;
      if (existing.qty === 1) return prev.filter((i) => !(i.name === name && !!i.isFree === isFree));
      return prev.map((i) => (i.name === name && !!i.isFree === isFree ? { ...i, qty: i.qty - 1 } : i));
    });
  }

  function updateQty(name: string, isFree: boolean, qty: number) {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => !(i.name === name && !!i.isFree === isFree)));
      return;
    }
    setItems((prev) => prev.map((i) => (i.name === name && !!i.isFree === isFree ? { ...i, qty } : i)));
  }

  function save() {
    if (items.length === 0) return toast.error("No items added!");
    if (settings.requireCustomerDetails && phone.length < 10) return toast.error("Enter valid phone number.");
    if (settings.requireCustomerDetails && !name.trim()) return toast.error("Enter customer name.");
    if (settings.tablesEnabled && !tableName) return toast.error("Please select a table.");

    const existingBills = loadBills();
    const todaysBillsCount = existingBills.filter(b => b.date === date).length + 1;
    const [, month, day] = date.split("-");
    const orderNumber = `${todaysBillsCount}${day}${month}`;

    const bill: Bill = {
      id: newId(),
      phone: settings.requireCustomerDetails ? phone : "",
      name: settings.requireCustomerDetails ? name.trim() : "Walk-in",
      date,
      items,
      subtotal,
      gstAmount,
      total,
      freeItem: eligibleForFree && freeItemId ? { name: menu.find(m => m.id === freeItemId)?.name || "Free", price: 0 } : undefined,
      tableName: settings.tablesEnabled ? tableName : undefined,
      orderNumber,
    };

    addBill(bill);
    toast.success(`Bill Saved Successfully! Order #${orderNumber}`);
    navigate({ to: "/" });
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:gap-8">
      <div className="flex-1 space-y-5">
        <h2 className="font-display text-3xl text-primary">New Bill</h2>
        <div className="card-menu space-y-4 p-5">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</span>
            <input type="date" className="input-field mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          {settings.requireCustomerDetails && (
            <>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</span>
                <input type="tel" className="input-field mt-1 font-mono" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer Name</span>
                <input type="text" className="input-field mt-1" placeholder="Rahul" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            </>
          )}
          {settings.tablesEnabled && (
            <div className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                Select Table
              </span>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {settings.tableNames.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTableName(t)}
                    className={`shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-all ${
                      tableName === t
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-primary/20 bg-secondary text-foreground hover:border-primary/40"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Menu Picker (Middle on mobile, Right on PC) */}
      <div className="card-menu min-w-0 p-4 md:p-5 lg:col-start-2 lg:row-start-1 lg:row-span-2 flex flex-col">
        <div className="flex items-center">
          <h2 className="font-display text-2xl text-primary">Menu</h2>
          {totalQty > 0 && (
            <div className="ml-4 flex items-center gap-2 rounded-full border-2 border-accent/20 bg-accent/10 px-3 py-0.5 text-sm font-bold text-accent animate-in fade-in zoom-in duration-300">
              <span>{totalQty} item{totalQty !== 1 ? "s" : ""}</span>
              <span>•</span>
              <span className="font-display text-lg">₹{total}</span>
            </div>
          )}
          <button
            onClick={() => setIsFreeMode(!isFreeMode)}
            className={`ml-auto rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors ${
              isFreeMode
                ? "border-accent bg-accent text-accent-foreground animate-pulse"
                : "border-primary/20 bg-card text-primary hover:border-accent"
            }`}
          >
            {isFreeMode ? "🎁 FREE MODE ON" : "🎁 Free"}
          </button>
        </div>
        <input
          className="input-field mt-3"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors ${
                category === c
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-primary/30 bg-card text-primary hover:border-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-3 grid max-h-[65vh] gap-2 overflow-y-auto pr-1 flex-1">
          {filteredMenu.map((m) => {
            const cartItem = items.find((it) => it.name === m.name && !!it.isFree === isFreeMode);
            const qty = cartItem ? cartItem.qty : 0;
            const isSelected = qty > 0;
            
            return (
              <button
                key={`${m.id}-${isFreeMode}`}
                onClick={() => addItem(m)}
                className={`flex items-center justify-between rounded-md border-2 px-3 py-2 text-left transition-all hover:-translate-y-0.5 ${
                  isSelected
                    ? "border-accent bg-accent/10"
                    : isFreeMode 
                      ? "border-accent/30 bg-accent/5 hover:border-accent"
                      : "border-primary/20 bg-card hover:border-accent"
                }`}
              >
                <div className="flex flex-1 min-w-0 items-center gap-2 md:gap-3">
                  {isSelected && (
                    <span className="flex shrink-0 h-6 w-6 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-xs">
                      {qty}
                    </span>
                  )}
                  <span className="font-bold truncate text-sm md:text-base">
                    {m.name} {isFreeMode && <span className="text-accent text-xs uppercase tracking-wider ml-1">Free</span>}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2 md:gap-4 ml-2">
                  <span className={`font-display text-base md:text-lg ${isSelected ? "text-primary" : "text-accent"}`}>
                    {isFreeMode ? "₹0" : `₹${m.price}`}
                  </span>
                  {isSelected && (
                    <div
                      className="flex shrink-0 h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95 shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(m.name, isFreeMode);
                      }}
                    >
                      −
                    </div>
                  )}
                </div>
              </button>
            );
          })}
          {filteredMenu.length === 0 && (
            <p className="text-sm text-muted-foreground">No items match.</p>
          )}
        </div>
      </div>

      {/* 3. Cart (Bottom on mobile, Bottom-left on PC) */}
      <div className="card-menu min-w-0 p-4 md:p-5 lg:col-start-1 lg:row-start-2 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-primary">Cart</h2>
            <div className="font-display text-2xl text-accent">₹{total}</div>
          </div>
          {items.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Add items from the menu →</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {items.map((it) => (
                <li
                  key={`${it.name}-${!!it.isFree}`}
                  className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 rounded-md border ${it.isFree ? 'border-accent bg-accent/10 text-accent' : 'border-primary/20 bg-secondary'} p-2`}
                >
                  <div className="min-w-0 flex-1 w-full sm:w-auto">
                    <div className="truncate font-bold">
                      {it.isFree ? `🎁 ${it.name} (Free)` : it.name}
                    </div>
                    <div className="text-xs opacity-70">₹{it.price} each</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(it.name, !!it.isFree, it.qty - 1)}
                      className={`h-7 w-7 rounded-full ${it.isFree ? 'bg-accent' : 'bg-primary'} text-primary-foreground`}
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-bold text-foreground">{it.qty}</span>
                    <button
                      onClick={() => updateQty(it.name, !!it.isFree, it.qty + 1)}
                      className={`h-7 w-7 rounded-full ${it.isFree ? 'bg-accent' : 'bg-primary'} text-primary-foreground`}
                    >
                      +
                    </button>
                  </div>
                  <div className="w-16 text-right font-bold shrink-0 text-foreground">₹{it.price * it.qty}</div>
                </li>
              ))}
            </ul>
          )}

          {eligibleForFree && (
            <div className="mt-4 rounded-lg border-2 border-dashed border-accent bg-accent/10 p-3">
              <div className="font-display text-lg text-accent">🎁 Free item</div>
              <select
                className="input-field mt-2"
                value={freeItemId}
                onChange={(e) => setFreeItemId(e.target.value)}
              >
                <option value="">-- Skip / choose later --</option>
                {freeItemOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (₹{m.price})
                  </option>
                ))}
              </select>
            </div>
          )}

          {settings.gstPercentage > 0 && items.length > 0 && (
            <div className="mt-4 space-y-1 text-sm text-muted-foreground text-right border-t border-border pt-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>GST ({settings.gstPercentage}%)</span>
                <span>₹{gstAmount}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground text-base pt-1">
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            </div>
          )}
        </div>

        <button onClick={save} className="btn-accent mt-5 w-full text-lg truncate">
          💾 Save Bill · ₹{total}
        </button>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  addBill,
  computeLoyalty,
  FREE_ITEM_MAX_PRICE,
  loadBills,
  loadMenu,
  loadCategories,
  getCategoryOf,
  getNextTokenNumber,
  newId,
  todayISO,
  useSettings,
  type Bill,
  type BillItem,
  type MenuItem,
  type PaymentMethod,
} from "@/lib/loyalty";
import { renderWhatsAppBill, sendBaileysInvoice, openWhatsAppDirect } from "@/lib/whatsapp";
import { toast } from "sonner";
import {
  Search,
  X,
  Plus,
  Minus,
  ShoppingCart,
  Zap,
  Trash2,
  RotateCcw,
  User,
  Phone,
  Gift,
  ChevronUp,
  ChevronDown,
  Check,
  CreditCard,
  Banknote,
  QrCode,
  Flame,
} from "lucide-react";
import { ReceiptModal } from "@/components/ReceiptModal";

export const Route = createFileRoute("/new-bill")({
  head: () => ({
    meta: [{ title: "New Bill — CD Billing" }],
  }),
  component: NewBill,
});

function NewBill() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tableName, setTableName] = useState("");
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState<BillItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("Popular");
  const [freeItemId, setFreeItemId] = useState<string>("");
  const [isFreeMode, setIsFreeMode] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [savedBillForReceipt, setSavedBillForReceipt] = useState<Bill | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [nextToken, setNextToken] = useState(1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const settings = useSettings();

  useEffect(() => {
    setMenu(loadMenu());
    setAllCategories(loadCategories());
    setNextToken(getNextTokenNumber());
  }, []);

  // Auto-fill customer name & loyalty when phone is entered
  useEffect(() => {
    if (phone.length >= 4) {
      const existing = loadBills().find((b) => b.phone === phone);
      if (existing && !name) setName(existing.name);
    }
  }, [phone, name]);

  const customerLoyalty = useMemo(() => {
    if (!phone || phone.length < 10 || !settings.streakOfferEnabled) return null;
    const custBills = loadBills().filter((b) => b.phone === phone);
    return computeLoyalty(custBills);
  }, [phone, settings.streakOfferEnabled]);

  const eligibleForFree = customerLoyalty?.eligibleToday && date === todayISO();

  // Top 6 popular items across bill history
  const popularItemIds = useMemo(() => {
    const bills = loadBills();
    const countMap = new Map<string, number>();
    for (const b of bills) {
      for (const it of b.items) {
        countMap.set(it.name, (countMap.get(it.name) || 0) + it.qty);
      }
    }
    const sorted = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      return sorted.slice(0, 8).map(([name]) => name);
    }
    return menu.slice(0, 6).map((m) => m.name);
  }, [menu]);

  const orderedCategories = useMemo(() => {
    const defaultCats = [
      "Sandwiches",
      "Burgers",
      "Fries",
      "Manchurian",
      "Noodles",
      "Rice",
      "Momos",
      "Mojito",
    ];
    const rest = allCategories.filter((c) => !defaultCats.includes(c));
    return ["Popular", "All", ...defaultCats, ...rest];
  }, [allCategories]);

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menu.filter((m) => {
      const matchesSearch = !q || m.name.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (category === "Popular") {
        return popularItemIds.includes(m.name);
      }
      if (category === "All") return true;
      return getCategoryOf(m) === category;
    });
  }, [menu, search, category, popularItemIds]);

  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const gstAmount = Math.round((subtotal * (settings.gstPercentage || 0)) / 100);
  const total = subtotal + gstAmount;
  const totalQty = items.reduce((s, it) => s + it.qty, 0);

  // Tactile feedback helper for mobile touch
  function triggerHaptic() {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // ignore
      }
    }
  }

  function addItem(m: MenuItem) {
    triggerHaptic();
    setItems((prev) => {
      const existing = prev.find((i) => i.name === m.name && !!i.isFree === isFreeMode);
      if (existing) {
        return prev.map((i) =>
          i.name === m.name && !!i.isFree === isFreeMode ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          name: m.name,
          price: isFreeMode ? 0 : m.price,
          qty: 1,
          costPrice: m.costPrice,
          isFree: isFreeMode,
        },
      ];
    });
  }

  function removeItem(name: string, isFree: boolean = false) {
    triggerHaptic();
    setItems((prev) => {
      const existing = prev.find((i) => i.name === name && !!i.isFree === isFree);
      if (!existing) return prev;
      if (existing.qty <= 1) {
        return prev.filter((i) => !(i.name === name && !!i.isFree === isFree));
      }
      return prev.map((i) =>
        i.name === name && !!i.isFree === isFree ? { ...i, qty: i.qty - 1 } : i
      );
    });
  }

  function updateQty(name: string, isFree: boolean, qty: number) {
    triggerHaptic();
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => !(i.name === name && !!i.isFree === isFree)));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.name === name && !!i.isFree === isFree ? { ...i, qty } : i))
    );
  }

  function clearCart() {
    if (items.length === 0) return;
    triggerHaptic();
    setItems([]);
    setFreeItemId("");
    toast.info("Cart cleared");
  }

  function resetFormForNextOrder() {
    setItems([]);
    setName("");
    setPhone("");
    setTableName("");
    setFreeItemId("");
    setIsFreeMode(false);
    setSearch("");
    setIsCartDrawerOpen(false);
    setNextToken(getNextTokenNumber());
  }

  function handleSaveBill() {
    if (items.length === 0) {
      toast.error("Cart is empty! Add items to save.");
      return;
    }

    if (settings.requireCustomerDetails && phone.length < 10) {
      toast.error("Please enter a valid 10-digit phone number.");
      setShowCustomerForm(true);
      return;
    }
    if (settings.requireCustomerDetails && !name.trim()) {
      toast.error("Please enter the customer name.");
      setShowCustomerForm(true);
      return;
    }
    if (settings.tablesEnabled && !tableName) {
      toast.error("Please select a table.");
      return;
    }

    triggerHaptic();

    const currentToken = nextToken || getNextTokenNumber(date);
    const orderNumber = `#${currentToken}`;

    const newBill: Bill = {
      id: newId(),
      phone: phone.trim(),
      name: name.trim() || "Walk-in",
      date,
      items,
      subtotal,
      gstAmount,
      total,
      tokenNumber: currentToken,
      orderNumber,
      paymentMethod,
      freeItem:
        eligibleForFree && freeItemId
          ? { name: menu.find((m) => m.id === freeItemId)?.name || "Free Item", price: 0 }
          : undefined,
      tableName: settings.tablesEnabled ? tableName : undefined,
      createdAt: new Date().toISOString(),
    };

    addBill(newBill);
    toast.success(`Bill Saved! Token ${orderNumber} · ₹${total}`);

    // Direct Mobile WhatsApp Invoicing (Works 100% on phone without server or PC)
    if (newBill.phone && newBill.phone.replace(/\D/g, "").length >= 10) {
      const renderedMsg = renderWhatsAppBill(newBill, settings);

      if (settings.autoWhatsAppBaileys) {
        // Option A: Background Baileys send if server is configured
        sendBaileysInvoice(settings.whatsappServerUrl || "https://cd-billing-baileys.onrender.com", newBill.phone, renderedMsg)
          .then((res) => {
            if (res.success) {
              toast.success(`WhatsApp invoice sent in background to ${newBill.phone}!`);
            } else {
              // Fallback directly on phone if gateway fails
              openWhatsAppDirect(newBill.phone, renderedMsg);
            }
          })
          .catch(() => {
            openWhatsAppDirect(newBill.phone, renderedMsg);
          });
      } else if (settings.autoOpenWhatsApp) {
        // Option B: 100% on phone, zero server/PC! Automatically launches customer WhatsApp with pre-filled bill
        setTimeout(() => {
          openWhatsAppDirect(newBill.phone, renderedMsg);
        }, 150);
      }
    }

    // Open receipt modal immediately
    setSavedBillForReceipt(newBill);

    // Auto-print if enabled in settings
    if (settings.autoPrintReceipt) {
      setTimeout(() => {
        window.print();
      }, 300);
    }
  }

  const freeItemOptions = menu.filter((m) => m.price <= FREE_ITEM_MAX_PRICE);

  return (
    <div className="flex flex-col gap-4 pb-28 md:pb-8">
      {/* 1. Fast Action Header */}
      <div className="card-menu p-3 md:p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Token Display Badge */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1 text-primary-foreground font-bold shadow-sm text-sm">
              <Zap className="h-4 w-4 text-accent animate-pulse" />
              <span>TOKEN #{nextToken}</span>
            </span>
            <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
              Quick POS
            </span>
          </div>

          {/* Customer / Walk-in Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCustomerForm(!showCustomerForm)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-all ${
                phone
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-primary/20 bg-secondary text-foreground hover:border-primary/40"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>{phone ? `${name || "Cust"} (${phone.slice(-4)})` : "Walk-in"}</span>
              {showCustomerForm ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {/* Clear Cart Button */}
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                title="Clear Cart"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            {/* Free Mode Toggle */}
            <button
              onClick={() => setIsFreeMode(!isFreeMode)}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition-all ${
                isFreeMode
                  ? "border-accent bg-accent text-accent-foreground shadow-sm"
                  : "border-primary/20 bg-secondary text-muted-foreground hover:text-primary"
              }`}
            >
              <Gift className="h-3.5 w-3.5" />
              <span>{isFreeMode ? "FREE ON" : "Free Mode"}</span>
            </button>
          </div>
        </div>

        {/* Expandable Customer & Date Form */}
        {(showCustomerForm || settings.requireCustomerDetails) && (
          <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-in slide-in-from-top-2 duration-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Phone Number
              </span>
              <div className="relative">
                <input
                  type="tel"
                  className="input-field py-1.5 text-sm font-mono pl-8"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  maxLength={10}
                />
                <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Customer Name
              </span>
              <input
                type="text"
                className="input-field py-1.5 text-sm"
                placeholder="Rahul"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Bill Date
              </span>
              <input
                type="date"
                className="input-field py-1.5 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Loyalty Streak notification if phone entered */}
            {customerLoyalty && (
              <div className="sm:col-span-3 flex items-center justify-between rounded-lg bg-accent/10 border border-accent/20 px-3 py-1.5 text-xs text-accent font-semibold">
                <span className="flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
                  <span>Streak: {customerLoyalty.streak}/6 visits</span>
                  {eligibleForFree && <span className="font-bold"> · Free reward item unlocked!</span>}
                </span>
                <span className="text-muted-foreground">
                  {customerLoyalty.visitDates.length} total visits
                </span>
              </div>
            )}
          </div>
        )}

        {/* Table Selector (if enabled in settings) */}
        {settings.tablesEnabled && (
          <div className="pt-2 border-t border-border flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-xs font-bold text-muted-foreground shrink-0">Table:</span>
            {settings.tableNames.map((t) => (
              <button
                key={t}
                onClick={() => setTableName(t)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-all ${
                  tableName === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-primary/20 bg-secondary text-foreground hover:border-primary/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Layout: Menu + Cart Sidebar (on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT / CENTER: Menu & Categories (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-3">
          {/* Search bar & quick category chips */}
          <div className="sticky top-0 z-30 space-y-2 bg-background/95 backdrop-blur-sm pt-1 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                className="input-field pl-9 pr-9 py-2 text-sm shadow-sm"
                placeholder="Search food, drinks (e.g. Burger, Fries)..."
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

            {/* Category horizontal scroll bar */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {orderedCategories.map((c) => {
                const isActive = category === c;
                return (
                  <button
                    key={c}
                    onClick={() => {
                      triggerHaptic();
                      setCategory(c);
                    }}
                    className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                      isActive
                        ? "border-accent bg-accent text-accent-foreground shadow-sm"
                        : "border-primary/20 bg-card text-muted-foreground hover:border-primary hover:text-foreground"
                    }`}
                  >
                    {c === "Popular" && <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />}
                    <span>{c}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {filteredMenu.map((m) => {
              const cartItem = items.find((it) => it.name === m.name && !!it.isFree === isFreeMode);
              const qty = cartItem ? cartItem.qty : 0;
              const isSelected = qty > 0;

              return (
                <div
                  key={`${m.id}-${isFreeMode}`}
                  className={`card-soft p-3 flex flex-col justify-between rounded-xl transition-all duration-150 border-2 ${
                    isSelected
                      ? "border-accent bg-accent/10 shadow-sm"
                      : isFreeMode
                        ? "border-accent/40 bg-accent/5"
                        : "border-border/80 bg-card hover:border-primary/40 hover:shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm leading-tight text-foreground truncate">
                        {m.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                        {getCategoryOf(m)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-display text-base font-bold text-primary block leading-none">
                        {isFreeMode ? "₹0" : `₹${m.price}`}
                      </span>
                      {isFreeMode && (
                        <span className="text-[9px] uppercase font-bold text-accent">FREE</span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper or Add Button */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {isSelected ? `${qty} in cart` : "Ready"}
                    </span>

                    {isSelected ? (
                      <div className="flex items-center gap-1.5 bg-background rounded-full border border-primary/30 p-0.5 shadow-xs">
                        <button
                          type="button"
                          onClick={() => removeItem(m.name, isFreeMode)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-destructive/20 hover:text-destructive active:scale-90 transition-transform font-bold"
                          title="Decrease"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-5 text-center font-bold text-sm font-mono text-foreground">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => addItem(m)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 active:scale-90 transition-transform font-bold"
                          title="Increase"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addItem(m)}
                        className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredMenu.length === 0 && (
              <div className="col-span-full card-soft p-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No items found matching "{search}"</p>
                <button
                  onClick={() => setSearch("")}
                  className="btn-ghost mt-3 text-xs"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Desktop Cart Sidebar (lg:col-span-4) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-4">
          <div className="card-menu p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl text-primary font-bold">Cart Summary</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {totalQty} items
              </span>
            </div>

            {/* Cart Items List */}
            {items.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <ShoppingCart className="h-10 w-10 mx-auto opacity-30" />
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs text-muted-foreground">Tap + on any item to add to bill</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-1">
                {items.map((it) => (
                  <div
                    key={`${it.name}-${!!it.isFree}`}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${
                      it.isFree
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-secondary/50"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-bold truncate text-foreground flex items-center gap-1">
                        {it.isFree && <Gift className="h-3.5 w-3.5 text-accent shrink-0" />}
                        <span className="truncate">{it.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">₹{it.price} each</div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateQty(it.name, !!it.isFree, it.qty - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border text-foreground hover:bg-destructive/20 hover:text-destructive active:scale-95"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-xs font-mono">{it.qty}</span>
                      <button
                        onClick={() => updateQty(it.name, !!it.isFree, it.qty + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="w-14 text-right font-display font-bold text-sm shrink-0 ml-1">
                      ₹{it.price * it.qty}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Free Item Selector (if customer unlocked 6-day streak) */}
            {eligibleForFree && (
              <div className="rounded-lg border-2 border-dashed border-accent bg-accent/10 p-3">
                <div className="flex items-center gap-1.5 font-display text-sm text-accent font-bold">
                  <Gift className="h-4 w-4" />
                  <span>Free Reward Item</span>
                </div>
                <select
                  className="input-field mt-1.5 py-1 text-xs"
                  value={freeItemId}
                  onChange={(e) => setFreeItemId(e.target.value)}
                >
                  <option value="">-- Choose Free Item --</option>
                  {freeItemOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Value: ₹{m.price})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Payment Mode
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(["Cash", "UPI", "Card"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setPaymentMethod(mode);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-bold transition-all ${
                      paymentMethod === mode
                        ? "border-accent bg-accent text-accent-foreground shadow-sm"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode === "Cash" && <Banknote className="h-3.5 w-3.5" />}
                    {mode === "UPI" && <QrCode className="h-3.5 w-3.5" />}
                    {mode === "Card" && <CreditCard className="h-3.5 w-3.5" />}
                    <span>{mode}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bill Totals Summary */}
            <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              {settings.gstPercentage > 0 && (
                <div className="flex justify-between">
                  <span>GST ({settings.gstPercentage}%)</span>
                  <span>₹{gstAmount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-foreground text-lg pt-1 border-t border-border/60">
                <span>Grand Total</span>
                <span className="font-display text-2xl text-primary font-black">₹{total}</span>
              </div>
            </div>

            {/* Punch Bill Button */}
            <button
              onClick={handleSaveBill}
              disabled={items.length === 0}
              className="btn-accent w-full py-3 text-base font-bold gap-2 shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Zap className="h-5 w-5" />
              <span>PUNCH BILL · ₹{total}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Floating Sticky Checkout Bar on Mobile (< lg) */}
      <div className="lg:hidden fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 px-3 py-2 bg-card/95 backdrop-blur-md border-t border-border shadow-lg">
        <div className="max-w-md mx-auto flex items-center gap-2">
          {/* Cart View Pill */}
          <button
            onClick={() => setIsCartDrawerOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-secondary border border-border px-3 py-2 text-foreground font-bold active:scale-95 transition-transform"
          >
            <div className="relative">
              <ShoppingCart className="h-5 w-5 text-primary" />
              {totalQty > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-black">
                  {totalQty}
                </span>
              )}
            </div>
            <div className="text-left leading-tight">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total</div>
              <div className="font-display text-base font-bold text-primary">₹{total}</div>
            </div>
          </button>

          {/* Quick Payment Mode Selector Pill */}
          <div className="flex rounded-xl bg-secondary border border-border p-0.5 text-xs font-bold">
            {(["Cash", "UPI"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setPaymentMethod(m);
                }}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  paymentMethod === m
                    ? "bg-accent text-accent-foreground shadow-xs"
                    : "text-muted-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Big Punch Bill Button */}
          <button
            onClick={handleSaveBill}
            disabled={items.length === 0}
            className="btn-accent flex-1 py-2.5 text-sm font-bold gap-1.5 shadow-md active:scale-95 disabled:opacity-50 transition-all truncate"
          >
            <Zap className="h-4 w-4 shrink-0" />
            <span className="truncate">PUNCH #{nextToken} · ₹{total}</span>
          </button>
        </div>
      </div>

      {/* 3. Mobile Cart Drawer / Bottom Sheet */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-h-[85vh] rounded-t-2xl bg-card border-t-2 border-primary/20 p-4 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg text-primary font-bold">
                  Order Items ({totalQty})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-destructive font-semibold hover:underline px-2 py-1"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2 max-h-[45vh]">
              {items.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Cart is empty. Add items from the menu.
                </div>
              ) : (
                items.map((it) => (
                  <div
                    key={`${it.name}-${!!it.isFree}`}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${
                      it.isFree
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-secondary/50"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-bold truncate text-foreground flex items-center gap-1">
                        {it.isFree && <Gift className="h-3.5 w-3.5 text-accent shrink-0" />}
                        <span className="truncate">{it.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">₹{it.price} each</div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateQty(it.name, !!it.isFree, it.qty - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border text-foreground active:scale-95"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center font-bold text-sm font-mono">{it.qty}</span>
                      <button
                        onClick={() => updateQty(it.name, !!it.isFree, it.qty + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="w-16 text-right font-display font-bold text-sm shrink-0 ml-1">
                      ₹{it.price * it.qty}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Free Item reward if unlocked */}
            {eligibleForFree && (
              <div className="rounded-lg border-2 border-dashed border-accent bg-accent/10 p-2.5 my-2">
                <span className="text-xs font-bold text-accent flex items-center gap-1">
                  <Gift className="h-3.5 w-3.5" />
                  <span>Free Streak Reward:</span>
                </span>
                <select
                  className="input-field mt-1 py-1 text-xs"
                  value={freeItemId}
                  onChange={(e) => setFreeItemId(e.target.value)}
                >
                  <option value="">-- Choose Reward --</option>
                  {freeItemOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Value ₹{m.price})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Mode */}
            <div className="py-2 border-t border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Payment Mode
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(["Cash", "UPI", "Card"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setPaymentMethod(m);
                    }}
                    className={`flex items-center justify-center gap-1 py-2 rounded-lg border text-xs font-bold ${
                      paymentMethod === m
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-secondary text-muted-foreground"
                    }`}
                  >
                    {m === "Cash" && <Banknote className="h-3.5 w-3.5" />}
                    {m === "UPI" && <QrCode className="h-3.5 w-3.5" />}
                    {m === "Card" && <CreditCard className="h-3.5 w-3.5" />}
                    <span>{m}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Totals & Submit */}
            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-muted-foreground">Grand Total:</span>
                <span className="font-display text-2xl text-primary font-black">₹{total}</span>
              </div>
              <button
                onClick={() => {
                  setIsCartDrawerOpen(false);
                  handleSaveBill();
                }}
                disabled={items.length === 0}
                className="btn-accent w-full py-3 text-base font-bold gap-2 shadow-lg active:scale-95 disabled:opacity-50"
              >
                <Zap className="h-5 w-5" />
                <span>SAVE & PRINT BILL · ₹{total}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Thermal Receipt & Kitchen Token Modal */}
      <ReceiptModal
        isOpen={!!savedBillForReceipt}
        bill={savedBillForReceipt}
        onClose={() => setSavedBillForReceipt(null)}
        onNextOrder={resetFormForNextOrder}
      />
    </div>
  );
}

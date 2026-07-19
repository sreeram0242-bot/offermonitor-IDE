// LocalStorage-backed data layer for CD Billing loyalty tracker.
// Single-device only. No backend.
import { useState, useEffect } from "react";

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category?: string;
  costPrice?: number;
};

export const DEFAULT_CATEGORIES = [
  "Sandwiches",
  "Burgers",
  "Fries",
  "Manchurian",
  "Noodles",
  "Rice",
  "Momos",
  "Mojito",
];

const CATEGORIES_KEY = "ek_categories_v1";

export function categoryFromId(id: string): string {
  if (id.startsWith("mo")) return "Momos";
  if (id.startsWith("mj")) return "Mojito";
  if (id.startsWith("s")) return "Sandwiches";
  if (id.startsWith("b")) return "Burgers";
  if (id.startsWith("f")) return "Fries";
  if (id.startsWith("m")) return "Manchurian";
  if (id.startsWith("n")) return "Noodles";
  if (id.startsWith("r")) return "Rice";
  return "Other";
}

export function getCategoryOf(item: MenuItem): string {
  return item.category?.trim() || categoryFromId(item.id);
}

let _cachedCategories: string[] | null = null;

export function loadCategories(): string[] {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  if (_cachedCategories) return _cachedCategories;
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
      _cachedCategories = DEFAULT_CATEGORIES;
      return DEFAULT_CATEGORIES;
    }
    _cachedCategories = JSON.parse(raw);
    return _cachedCategories!;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(cats: string[]) {
  if (typeof window === "undefined") return;
  _cachedCategories = cats;
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
}
export type BillItem = { name: string; price: number; qty: number; costPrice?: number };
export type Bill = {
  id: string;
  phone: string;
  name: string;
  date: string; // YYYY-MM-DD
  items: BillItem[];
  subtotal?: number;
  gstAmount?: number;
  total: number;
  freeItem?: { name: string; price: number } | null;
  tableName?: string;
  orderNumber?: string;
};

const MENU_KEY = "ek_menu_v1";
const BILLS_KEY = "ek_bills_v1";

export const FREE_ITEM_MAX_PRICE = 79;
export const STREAK_TARGET = 6;

export const DEFAULT_MENU: MenuItem[] = [
  // Sandwiches
  { id: "s1", name: "Veg sandwich", price: 39 },
  { id: "s2", name: "Club sandwich", price: 39 },
  { id: "s3", name: "Veg korean toasty sandwich", price: 59 },
  { id: "s4", name: "Veg loaded sandwich / Paneer", price: 59 },
  { id: "s5", name: "Chicken sandwich", price: 69 },
  { id: "s6", name: "Chicken loaded sandwich", price: 89 },
  { id: "s7", name: "Egg stuffed sandwich", price: 69 },
  { id: "s8", name: "Chicken Korean toasty sandwich", price: 79 },
  { id: "s9", name: "Chocolate sandwich", price: 59 },
  { id: "s10", name: "Bread omelette", price: 39 },
  // Burgers
  { id: "b1", name: "Veg Burger", price: 59 },
  { id: "b2", name: "Veg Gochujang burger", price: 69 },
  { id: "b3", name: "Chicken burger", price: 79 },
  { id: "b4", name: "Ramali chicken burger", price: 99 },
  { id: "b5", name: "Chicken gochujang burger", price: 99 },
  { id: "b6", name: "Fried chicken burger", price: 89 },
  { id: "b7", name: "Chicken smashed burger", price: 110 },
  { id: "b8", name: "Double decker burger", price: 139 },
  // Fries
  { id: "f1", name: "Classical french fries", price: 39 },
  { id: "f2", name: "Peri peri french fries", price: 59 },
  { id: "f3", name: "Veg loaded fries", price: 79 },
  { id: "f4", name: "Chicken loaded fries", price: 139 },
  { id: "f5", name: "Korean hot toasty fries", price: 59 },
  { id: "f6", name: "Chilli potato pops", price: 59 },
  { id: "f7", name: "Fried chicken wings (3pcs)", price: 79 },
  { id: "f8", name: "Lays chicken", price: 79 },
  { id: "f9", name: "Fried chicken lollipop (3pcs)", price: 79 },
  { id: "f10", name: "Korean Toasty popcorn", price: 139 },
  { id: "f11", name: "Korean toasty wings", price: 139 },
  { id: "f12", name: "Korean Toasty lollipop", price: 139 },
  { id: "f13", name: "Chicken pop corn", price: 99 },
  // Manchurian
  { id: "m1", name: "Veg manchurian", price: 59 },
  { id: "m2", name: "Paneer spicy manchurian", price: 69 },
  { id: "m3", name: "Chicken spicy manchurian", price: 69 },
  { id: "m4", name: "Crispy chicken manchurian", price: 79 },
  // Noodles
  { id: "n1", name: "Veg noodles", price: 59 },
  { id: "n2", name: "Egg noodles", price: 69 },
  { id: "n3", name: "Chicken noodles", price: 79 },
  { id: "n4", name: "Crispy chicken noodles", price: 110 },
  { id: "n5", name: "Korean special veg noodles", price: 69 },
  { id: "n6", name: "Korean special egg noodles", price: 79 },
  { id: "n7", name: "Korean special chicken noodles", price: 99 },
  { id: "n8", name: "Schezwan veg noodles", price: 69 },
  { id: "n9", name: "Schezwan egg noodles", price: 79 },
  { id: "n10", name: "Schezwan chicken noodles", price: 99 },
  // Rice
  { id: "r1", name: "Veg rice", price: 59 },
  { id: "r2", name: "Egg rice", price: 69 },
  { id: "r3", name: "Chicken rice", price: 79 },
  { id: "r4", name: "Crispy chicken rice", price: 110 },
  { id: "r5", name: "Korean special veg rice", price: 69 },
  { id: "r6", name: "Korean special egg rice", price: 79 },
  { id: "r7", name: "Korean special chicken rice", price: 99 },
  { id: "r8", name: "Schezwan veg rice", price: 69 },
  { id: "r9", name: "Schezwan egg rice", price: 79 },
  { id: "r10", name: "Schezwan chicken rice", price: 89 },
  // Momos
  { id: "mo1", name: "Veg momos", price: 59 },
  { id: "mo2", name: "Paneer momos", price: 69 },
  { id: "mo3", name: "Chicken momos", price: 79 },
  // Mojito
  { id: "mj1", name: "Deep blue sky mojito", price: 69 },
  { id: "mj2", name: "Lemon and mint mojito", price: 69 },
  { id: "mj3", name: "Green apple mojito", price: 69 },
  { id: "mj4", name: "Triple sip extra vibe mojito", price: 79 },
  { id: "mj5", name: "Peach mojito", price: 79 },
  { id: "mj6", name: "Lemon soda", price: 49 },
];

function isBrowser() {
  return typeof window !== "undefined";
}

let _cachedMenu: MenuItem[] | null = null;

export function loadMenu(): MenuItem[] {
  if (!isBrowser()) return DEFAULT_MENU;
  if (_cachedMenu) return _cachedMenu;
  try {
    const raw = localStorage.getItem(MENU_KEY);
    if (!raw) {
      localStorage.setItem(MENU_KEY, JSON.stringify(DEFAULT_MENU));
      _cachedMenu = DEFAULT_MENU;
      return DEFAULT_MENU;
    }
    _cachedMenu = JSON.parse(raw);
    return _cachedMenu!;
  } catch {
    return DEFAULT_MENU;
  }
}

export function saveMenu(items: MenuItem[]) {
  if (!isBrowser()) return;
  _cachedMenu = items;
  localStorage.setItem(MENU_KEY, JSON.stringify(items));
}

let _cachedBills: Bill[] | null = null;

export function loadBills(): Bill[] {
  if (!isBrowser()) return [];
  if (_cachedBills) return _cachedBills;
  try {
    const raw = localStorage.getItem(BILLS_KEY);
    _cachedBills = raw ? JSON.parse(raw) : [];
    return _cachedBills!;
  } catch {
    return [];
  }
}

export function saveBills(bills: Bill[]) {
  if (!isBrowser()) return;
  _cachedBills = bills;
  localStorage.setItem(BILLS_KEY, JSON.stringify(bills));
}

export function deleteBill(id: string) {
  if (typeof window === "undefined") return;
  const bills = loadBills();
  const updated = bills.filter((b) => b.id !== id);
  saveBills(updated);
}

export function addBill(bill: Bill) {
  const all = [...loadBills(), bill];
  saveBills(all);
}


export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function addDaysISO(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/**
 * Consecutive-day streak logic.
 * Returns:
 *  - streak: number of consecutive days ending on the most recent visit (or today)
 *  - lastVisit: last visit date (ISO) or null
 *  - eligibleToday: true if the customer has 6 consecutive days ending yesterday
 *    OR the last 6 dates including today form a consecutive run, i.e. today is
 *    the "7th" reward day.
 *  - visitDates: sorted unique ISO dates
 */
export function computeLoyalty(custBills: Bill[]) {
  // Calculate total spent per date
  const dailyTotals = new Map<string, number>();
  for (const b of custBills) {
    dailyTotals.set(b.date, (dailyTotals.get(b.date) || 0) + b.total);
  }

  // Filter dates where total spent >= 200
  const dates = Array.from(dailyTotals.entries())
    .filter(([_, total]) => total >= 200)
    .map(([date, _]) => date)
    .sort();

  if (dates.length === 0) {
    return {
      streak: 0,
      lastVisit: null as string | null,
      eligibleToday: false,
      visitDates: Array.from(new Set(custBills.map((b) => b.date))).sort(),
    };
  }

  const lastVisit = dates[dates.length - 1];

  // Walk backwards from lastVisit to find the current consecutive streak.
  let streak = 1;
  for (let i = dates.length - 2; i >= 0; i--) {
    if (dates[i] === addDaysISO(dates[i + 1], -1)) {
      streak++;
    } else {
      break;
    }
  }

  const today = todayISO();

  // Eligible today = customer already logged 6 consecutive valid days ending yesterday
  // OR 6+ consecutive valid days ending today (and hasn't yet used the free item today).
  let eligibleToday = false;
  if (lastVisit === addDaysISO(today, -1) && streak >= STREAK_TARGET) {
    eligibleToday = true;
  } else if (lastVisit === today && streak >= STREAK_TARGET) {
    // On the 7th day itself, still eligible until they use it
    const todayBill = custBills.find((b) => b.date === today && b.freeItem);
    if (!todayBill) eligibleToday = true;
  }

  return {
    streak,
    lastVisit,
    eligibleToday,
    visitDates: Array.from(new Set(custBills.map((b) => b.date))).sort(),
  };
}

export type CustomerSummary = {
  phone: string;
  name: string;
  totalVisits: number;
  totalSpent: number;
  lastVisit: string | null;
  streak: number;
  eligibleToday: boolean;
};

let _cachedCustomers: CustomerSummary[] | null = null;
let _lastBillsForCustomers: Bill[] | null = null;

export function getCustomers(bills: Bill[]): CustomerSummary[] {
  if (_lastBillsForCustomers === bills && _cachedCustomers) {
    return _cachedCustomers;
  }
  
  const map = new Map<string, CustomerSummary>();
  const billsByPhone = new Map<string, Bill[]>();
  
  for (const b of bills) {
    // Group bills by phone for O(1) lookup later
    let arr = billsByPhone.get(b.phone);
    if (!arr) {
      arr = [];
      billsByPhone.set(b.phone, arr);
    }
    arr.push(b);

    const existing = map.get(b.phone);
    if (existing) {
      existing.name = b.name || existing.name;
      existing.totalSpent += b.total;
    } else {
      map.set(b.phone, {
        phone: b.phone,
        name: b.name,
        totalVisits: 0,
        totalSpent: b.total,
        lastVisit: null,
        streak: 0,
        eligibleToday: false,
      });
    }
  }

  for (const [phone, summary] of map) {
    const l = computeLoyalty(billsByPhone.get(phone) || []);
    summary.totalVisits = l.visitDates.length;
    summary.lastVisit = l.lastVisit;
    summary.streak = l.streak;
    summary.eligibleToday = l.eligibleToday;
  }
  
  _cachedCustomers = Array.from(map.values()).sort((a, b) =>
    (b.lastVisit ?? "").localeCompare(a.lastVisit ?? ""),
  );
  _lastBillsForCustomers = bills;
  
  return _cachedCustomers;
}

export function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------------------------------------------------------------------------
// Settings Layer
// ---------------------------------------------------------------------------
export type AppSettings = {
  hotelName: string;
  streakOfferEnabled: boolean;
  requireCustomerDetails: boolean;
  tablesEnabled: boolean;
  tableNames: string[];
  gstPercentage: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  hotelName: "CD Billing",
  streakOfferEnabled: true,
  requireCustomerDetails: true,
  tablesEnabled: false,
  tableNames: ["Table 1", "Table 2", "Table 3", "Table 4"],
  gstPercentage: 0,
};

const SETTINGS_KEY = "ek_settings_v1";

export function loadSettings(): AppSettings {
  if (!isBrowser()) return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  if (!isBrowser()) return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event("settings-changed"));
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings());

  useEffect(() => {
    function handle() {
      setSettings(loadSettings());
    }
    window.addEventListener("settings-changed", handle);
    return () => window.removeEventListener("settings-changed", handle);
  }, []);

  return settings;
}

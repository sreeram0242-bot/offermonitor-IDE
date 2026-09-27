// LocalStorage-backed data layer for CD Billing loyalty tracker.
// Single-device offline capable. Optional cloud WhatsApp gateway.
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
  "Rolls",
  "Beverages",
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
  if (id.startsWith("ro")) return "Rolls";
  if (id.startsWith("bv")) return "Beverages";
  return "Other";
}

export function getCategoryOf(item: MenuItem): string {
  return item?.category?.trim() || categoryFromId(item?.id || "");
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
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...parsed]));
      _cachedCategories = merged;
      return merged;
    }
    _cachedCategories = DEFAULT_CATEGORIES;
    return DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(cats: string[]) {
  if (typeof window === "undefined") return;
  _cachedCategories = cats;
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
}

export type PaymentMethod = "Cash" | "UPI" | "Card";

export type BillItem = {
  name: string;
  price: number;
  qty: number;
  costPrice?: number;
  isFree?: boolean;
};

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
  tokenNumber?: number;
  paymentMethod?: PaymentMethod;
  createdAt?: string; // ISO timestamp
  notes?: string;
};

const MENU_KEY = "ek_menu_v1";
const BILLS_KEY = "ek_bills_v1";

export const FREE_ITEM_MAX_PRICE = 79;
export const STREAK_TARGET = 6;

export const DEFAULT_MENU: MenuItem[] = [
  // 1. Sandwiches
  { id: "s1", name: "Veg Sandwich", price: 39, category: "Sandwiches" },
  { id: "s2", name: "Club Sandwich", price: 49, category: "Sandwiches" },
  { id: "s3", name: "Veg Korean Toasty Sandwich", price: 59, category: "Sandwiches" },
  { id: "s4", name: "Veg Loaded Paneer Sandwich", price: 69, category: "Sandwiches" },
  { id: "s5", name: "Corn & Cheese Grilled Sandwich", price: 59, category: "Sandwiches" },
  { id: "s6", name: "Bombay Masala Toast", price: 49, category: "Sandwiches" },
  { id: "s7", name: "Egg Stuffed Sandwich", price: 59, category: "Sandwiches" },
  { id: "s8", name: "Chicken Sandwich", price: 69, category: "Sandwiches" },
  { id: "s9", name: "Chicken Loaded Sandwich", price: 89, category: "Sandwiches" },
  { id: "s10", name: "Chicken Korean Toasty Sandwich", price: 79, category: "Sandwiches" },
  { id: "s11", name: "Chocolate Grilled Sandwich", price: 49, category: "Sandwiches" },
  { id: "s12", name: "Bread Omelette", price: 39, category: "Sandwiches" },
  { id: "s13", name: "Cheese Bread Omelette", price: 49, category: "Sandwiches" },

  // 2. Burgers
  { id: "b1", name: "Classic Veg Burger", price: 59, category: "Burgers" },
  { id: "b2", name: "Crispy Paneer Burger", price: 79, category: "Burgers" },
  { id: "b3", name: "Veg Gochujang Burger", price: 69, category: "Burgers" },
  { id: "b4", name: "Spicy Mexican Veg Burger", price: 69, category: "Burgers" },
  { id: "b5", name: "Classic Chicken Burger", price: 79, category: "Burgers" },
  { id: "b6", name: "Fried Crispy Chicken Burger", price: 89, category: "Burgers" },
  { id: "b7", name: "Ramali Chicken Burger", price: 99, category: "Burgers" },
  { id: "b8", name: "Chicken Gochujang Burger", price: 99, category: "Burgers" },
  { id: "b9", name: "Chicken Smashed Burger", price: 110, category: "Burgers" },
  { id: "b10", name: "Double Decker Burger", price: 139, category: "Burgers" },
  { id: "b11", name: "Tandoori Chicken Burger", price: 89, category: "Burgers" },

  // 3. Fries & Sides
  { id: "f1", name: "Classic French Fries", price: 39, category: "Fries" },
  { id: "f2", name: "Peri Peri French Fries", price: 59, category: "Fries" },
  { id: "f3", name: "Cheesy Loaded Fries", price: 79, category: "Fries" },
  { id: "f4", name: "Veg Loaded Fries", price: 69, category: "Fries" },
  { id: "f5", name: "Chicken Loaded Fries", price: 119, category: "Fries" },
  { id: "f6", name: "Korean Hot Toasty Fries", price: 59, category: "Fries" },
  { id: "f7", name: "Chilli Potato Pops", price: 59, category: "Fries" },
  { id: "f8", name: "Fried Chicken Wings (3pcs)", price: 79, category: "Fries" },
  { id: "f9", name: "Lays Crusted Chicken", price: 79, category: "Fries" },
  { id: "f10", name: "Fried Chicken Lollipop (3pcs)", price: 79, category: "Fries" },
  { id: "f11", name: "Crispy Chicken Popcorn", price: 99, category: "Fries" },
  { id: "f12", name: "Korean Toasty Popcorn", price: 129, category: "Fries" },
  { id: "f13", name: "Korean Toasty Wings", price: 129, category: "Fries" },
  { id: "f14", name: "Korean Toasty Lollipop", price: 129, category: "Fries" },
  { id: "f15", name: "Chicken Nuggets (6pcs)", price: 79, category: "Fries" },

  // 4. Manchurian & Starters
  { id: "m1", name: "Veg Dry Manchurian", price: 59, category: "Manchurian" },
  { id: "m2", name: "Veg Gravy Manchurian", price: 69, category: "Manchurian" },
  { id: "m3", name: "Paneer Spicy Manchurian", price: 69, category: "Manchurian" },
  { id: "m4", name: "Crispy Babycorn Manchurian", price: 69, category: "Manchurian" },
  { id: "m5", name: "Gobi Manchurian", price: 59, category: "Manchurian" },
  { id: "m6", name: "Mushroom Manchurian", price: 69, category: "Manchurian" },
  { id: "m7", name: "Chicken Dry Manchurian", price: 69, category: "Manchurian" },
  { id: "m8", name: "Chicken Spicy Manchurian", price: 79, category: "Manchurian" },
  { id: "m9", name: "Crispy Chicken Manchurian", price: 79, category: "Manchurian" },
  { id: "m10", name: "Dragon Chicken", price: 89, category: "Manchurian" },
  { id: "m11", name: "Chilli Chicken Dry", price: 89, category: "Manchurian" },

  // 5. Noodles
  { id: "n1", name: "Veg Hakka Noodles", price: 59, category: "Noodles" },
  { id: "n2", name: "Egg Hakka Noodles", price: 69, category: "Noodles" },
  { id: "n3", name: "Chicken Hakka Noodles", price: 79, category: "Noodles" },
  { id: "n4", name: "Crispy Chicken Noodles", price: 109, category: "Noodles" },
  { id: "n5", name: "Schezwan Veg Noodles", price: 69, category: "Noodles" },
  { id: "n6", name: "Schezwan Egg Noodles", price: 79, category: "Noodles" },
  { id: "n7", name: "Schezwan Chicken Noodles", price: 89, category: "Noodles" },
  { id: "n8", name: "Korean Special Veg Noodles", price: 69, category: "Noodles" },
  { id: "n9", name: "Korean Special Egg Noodles", price: 79, category: "Noodles" },
  { id: "n10", name: "Korean Special Chicken Noodles", price: 99, category: "Noodles" },
  { id: "n11", name: "Singapore Veg Noodles", price: 69, category: "Noodles" },
  { id: "n12", name: "Singapore Chicken Noodles", price: 89, category: "Noodles" },

  // 6. Rice
  { id: "r1", name: "Veg Fried Rice", price: 59, category: "Rice" },
  { id: "r2", name: "Egg Fried Rice", price: 69, category: "Rice" },
  { id: "r3", name: "Chicken Fried Rice", price: 79, category: "Rice" },
  { id: "r4", name: "Crispy Chicken Fried Rice", price: 109, category: "Rice" },
  { id: "r5", name: "Schezwan Veg Rice", price: 69, category: "Rice" },
  { id: "r6", name: "Schezwan Egg Rice", price: 79, category: "Rice" },
  { id: "r7", name: "Schezwan Chicken Rice", price: 89, category: "Rice" },
  { id: "r8", name: "Korean Special Veg Rice", price: 69, category: "Rice" },
  { id: "r9", name: "Korean Special Egg Rice", price: 79, category: "Rice" },
  { id: "r10", name: "Korean Special Chicken Rice", price: 99, category: "Rice" },
  { id: "r11", name: "Triple Schezwan Fried Rice", price: 119, category: "Rice" },
  { id: "r12", name: "Paneer Fried Rice", price: 79, category: "Rice" },

  // 7. Momos
  { id: "mo1", name: "Steamed Veg Momos (5pcs)", price: 49, category: "Momos" },
  { id: "mo2", name: "Fried Veg Momos (5pcs)", price: 59, category: "Momos" },
  { id: "mo3", name: "Kurkure Veg Momos (5pcs)", price: 69, category: "Momos" },
  { id: "mo4", name: "Steamed Paneer Momos (5pcs)", price: 59, category: "Momos" },
  { id: "mo5", name: "Fried Paneer Momos (5pcs)", price: 69, category: "Momos" },
  { id: "mo6", name: "Steamed Chicken Momos (5pcs)", price: 69, category: "Momos" },
  { id: "mo7", name: "Fried Chicken Momos (5pcs)", price: 79, category: "Momos" },
  { id: "mo8", name: "Kurkure Chicken Momos (5pcs)", price: 89, category: "Momos" },
  { id: "mo9", name: "Peri Peri Fried Momos (5pcs)", price: 79, category: "Momos" },

  // 8. Mojito & Coolers
  { id: "mj1", name: "Deep Blue Sky Mojito", price: 59, category: "Mojito" },
  { id: "mj2", name: "Lemon & Mint Virgin Mojito", price: 59, category: "Mojito" },
  { id: "mj3", name: "Green Apple Mojito", price: 59, category: "Mojito" },
  { id: "mj4", name: "Watermelon Cool Mojito", price: 59, category: "Mojito" },
  { id: "mj5", name: "Triple Sip Extra Vibe Mojito", price: 69, category: "Mojito" },
  { id: "mj6", name: "Peach Passion Mojito", price: 69, category: "Mojito" },
  { id: "mj7", name: "Fresh Lemon Soda (Sweet/Salt)", price: 39, category: "Mojito" },
  { id: "mj8", name: "Kala Khatta Soda", price: 49, category: "Mojito" },
  { id: "mj9", name: "Blue Lagoon Mocktail", price: 59, category: "Mojito" },

  // 9. Rolls & Wraps
  { id: "ro1", name: "Veg Kathi Roll", price: 49, category: "Rolls" },
  { id: "ro2", name: "Paneer Tikka Roll", price: 69, category: "Rolls" },
  { id: "ro3", name: "Single Egg Roll", price: 49, category: "Rolls" },
  { id: "ro4", name: "Double Egg Roll", price: 59, category: "Rolls" },
  { id: "ro5", name: "Chicken Kathi Roll", price: 69, category: "Rolls" },
  { id: "ro6", name: "Crispy Chicken Roll", price: 79, category: "Rolls" },
  { id: "ro7", name: "Schezwan Chicken Roll", price: 79, category: "Rolls" },

  // 10. Beverages & Shakes
  { id: "bv1", name: "Cold Coffee", price: 49, category: "Beverages" },
  { id: "bv2", name: "Thick Chocolate Shake", price: 69, category: "Beverages" },
  { id: "bv3", name: "Oreo Milkshake", price: 69, category: "Beverages" },
  { id: "bv4", name: "KitKat Crunch Shake", price: 79, category: "Beverages" },
  { id: "bv5", name: "Cold Badam Milk", price: 39, category: "Beverages" },
  { id: "bv6", name: "Bottled Mineral Water", price: 20, category: "Beverages" },
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
      _cachedMenu = DEFAULT_MENU;
      localStorage.setItem(MENU_KEY, JSON.stringify(DEFAULT_MENU));
      return DEFAULT_MENU;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const existingNames = new Set(parsed.map((item: MenuItem) => (item.name || "").toLowerCase()));
      const missingDefaults = DEFAULT_MENU.filter((item) => !existingNames.has(item.name.toLowerCase()));
      
      const merged = [
        ...parsed.map((item: MenuItem) => ({
          ...item,
          name: item.name || "Item",
          price: Number(item.price) || 0,
          category: item.category || categoryFromId(item.id || ""),
        })),
        ...missingDefaults,
      ];
      _cachedMenu = merged;
      return merged;
    }
    _cachedMenu = DEFAULT_MENU;
    localStorage.setItem(MENU_KEY, JSON.stringify(DEFAULT_MENU));
    return DEFAULT_MENU;
  } catch {
    return DEFAULT_MENU;
  }
}

export function saveMenu(items: MenuItem[]) {
  if (!isBrowser()) return;
  _cachedMenu = items;
  localStorage.setItem(MENU_KEY, JSON.stringify(items));
}

export function resetMenuToDefaults(): MenuItem[] {
  if (!isBrowser()) return DEFAULT_MENU;
  _cachedMenu = DEFAULT_MENU;
  localStorage.setItem(MENU_KEY, JSON.stringify(DEFAULT_MENU));
  saveCategories(DEFAULT_CATEGORIES);
  window.dispatchEvent(new Event("menu-changed"));
  return DEFAULT_MENU;
}

let _cachedBills: Bill[] | null = null;

export function loadBills(): Bill[] {
  if (!isBrowser()) return [];
  if (_cachedBills) return _cachedBills;
  try {
    const raw = localStorage.getItem(BILLS_KEY);
    if (!raw) {
      _cachedBills = [];
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      _cachedBills = parsed.map((b) => ({
        ...b,
        id: b.id || newId(),
        name: b.name || "Walk-in Customer",
        phone: b.phone || "",
        date: b.date || todayISO(),
        items: Array.isArray(b.items)
          ? b.items.map((it: BillItem) => ({
              ...it,
              name: it?.name || "Item",
              price: Number(it?.price) || 0,
              qty: Number(it?.qty) || 1,
            }))
          : [],
        total: Number(b.total) || 0,
      }));
      return _cachedBills;
    }
    _cachedBills = [];
    return [];
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

export function getNextTokenNumber(date: string = todayISO()): number {
  const bills = loadBills();
  const todaysBills = bills.filter((b) => b.date === date);
  return todaysBills.length + 1;
}

export function addBill(bill: Bill) {
  const token = bill.tokenNumber || getNextTokenNumber(bill.date);
  const normalizedBill: Bill = {
    ...bill,
    tokenNumber: token,
    orderNumber: bill.orderNumber || `#${token}`,
    paymentMethod: bill.paymentMethod || "Cash",
    createdAt: bill.createdAt || new Date().toISOString(),
  };
  const all = [...loadBills(), normalizedBill];
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
  if (!iso) return "-";
  const parts = iso.split("-").map(Number);
  if (parts.length < 3) return iso;
  const [y, m, d] = parts;
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

export function computeLoyalty(custBills: Bill[]) {
  const dailyTotals = new Map<string, number>();
  for (const b of custBills) {
    if (b.date) {
      dailyTotals.set(b.date, (dailyTotals.get(b.date) || 0) + (Number(b.total) || 0));
    }
  }

  const dates = Array.from(dailyTotals.entries())
    .filter(([_, total]) => total >= 200)
    .map(([date, _]) => date)
    .sort();

  if (dates.length === 0) {
    return {
      streak: 0,
      lastVisit: null as string | null,
      eligibleToday: false,
      visitDates: Array.from(new Set(custBills.map((b) => b.date).filter(Boolean))).sort(),
    };
  }

  const lastVisit = dates[dates.length - 1];

  let streak = 1;
  for (let i = dates.length - 2; i >= 0; i--) {
    if (dates[i] === addDaysISO(dates[i + 1], -1)) {
      streak++;
    } else {
      break;
    }
  }

  const today = todayISO();
  let eligibleToday = false;
  if (lastVisit === addDaysISO(today, -1) && streak >= STREAK_TARGET) {
    eligibleToday = true;
  } else if (lastVisit === today && streak >= STREAK_TARGET) {
    const todayBill = custBills.find((b) => b.date === today && b.freeItem);
    if (!todayBill) eligibleToday = true;
  }

  return {
    streak,
    lastVisit,
    eligibleToday,
    visitDates: Array.from(new Set(custBills.map((b) => b.date).filter(Boolean))).sort(),
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

  const safeBills = Array.isArray(bills) ? bills : [];
  const map = new Map<string, CustomerSummary>();
  const billsByPhone = new Map<string, Bill[]>();

  for (const b of safeBills) {
    const phone = (b.phone || "").trim();
    if (!phone) continue;

    let arr = billsByPhone.get(phone);
    if (!arr) {
      arr = [];
      billsByPhone.set(phone, arr);
    }
    arr.push(b);

    const existing = map.get(phone);
    const safeTotal = Number(b.total) || 0;
    const safeName = (b.name || "").trim() || "Customer " + phone;

    if (existing) {
      if (!existing.name || existing.name.startsWith("Customer ")) {
        existing.name = safeName;
      }
      existing.totalSpent += safeTotal;
    } else {
      map.set(phone, {
        phone: phone,
        name: safeName,
        totalVisits: 0,
        totalSpent: safeTotal,
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
  _lastBillsForCustomers = safeBills;

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
  hotelPhone?: string;
  hotelAddress?: string;
  streakOfferEnabled: boolean;
  requireCustomerDetails: boolean;
  tablesEnabled: boolean;
  tableNames: string[];
  gstPercentage: number;
  autoPrintReceipt?: boolean;

  autoOpenWhatsApp?: boolean;
  whatsappBillTemplate?: string;

  autoWhatsAppBaileys?: boolean;
  whatsappServerUrl?: string;
};

export const DEFAULT_WHATSAPP_SERVER_URL = "https://cd-billing-baileys.onrender.com";

export const DEFAULT_SETTINGS: AppSettings = {
  hotelName: "CD Billing",
  hotelPhone: "9025898839",
  hotelAddress: "80 feet road, opp. BOB Bank, Karur",
  streakOfferEnabled: true,
  requireCustomerDetails: false,
  tablesEnabled: false,
  tableNames: ["Table 1", "Table 2", "Table 3", "Table 4"],
  gstPercentage: 0,
  autoPrintReceipt: false,

  autoOpenWhatsApp: true,
  whatsappBillTemplate: "",
  autoWhatsAppBaileys: false,
  whatsappServerUrl: DEFAULT_WHATSAPP_SERVER_URL,
};

const SETTINGS_KEY = "ek_settings_v1";

export function loadSettings(): AppSettings {
  if (!isBrowser()) return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);

    // Auto-migrate Render URL if empty, null, localhost or 127.0.0.1
    let serverUrl = (parsed.whatsappServerUrl || "").trim();
    if (!serverUrl || serverUrl.includes("localhost") || serverUrl.includes("127.0.0.1")) {
      serverUrl = DEFAULT_WHATSAPP_SERVER_URL;
    }

    const merged: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      hotelName: parsed.hotelName || DEFAULT_SETTINGS.hotelName,
      tableNames: Array.isArray(parsed.tableNames) && parsed.tableNames.length > 0
        ? parsed.tableNames
        : DEFAULT_SETTINGS.tableNames,
      whatsappServerUrl: serverUrl,
      autoOpenWhatsApp: parsed.autoOpenWhatsApp !== undefined ? parsed.autoOpenWhatsApp : true,
    };

    if (parsed.whatsappServerUrl !== serverUrl || !Array.isArray(parsed.tableNames)) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    }

    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  if (!isBrowser()) return;
  const toSave = {
    ...settings,
    whatsappServerUrl: settings.whatsappServerUrl?.trim() || DEFAULT_WHATSAPP_SERVER_URL,
    tableNames: Array.isArray(settings.tableNames) && settings.tableNames.length > 0
      ? settings.tableNames
      : DEFAULT_SETTINGS.tableNames,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
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

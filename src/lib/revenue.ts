import { Bill, BillItem, newId } from "./loyalty";
import {
  isWithinInterval,
  parseISO,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";

export type Expense = {
  id: string;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
};

const EXPENSES_KEY = "ek_expenses_v1";

export function loadExpenses(): Expense[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EXPENSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Expense[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function addExpense(expense: Expense) {
  const all = loadExpenses();
  all.push(expense);
  saveExpenses(all);
}

export function deleteExpense(id: string) {
  saveExpenses(loadExpenses().filter((e) => e.id !== id));
}

export type FreeItemGiven = {
  id: string; // bill id
  date: string;
  phone: string;
  customerName: string;
  itemName: string;
  itemPrice: number;
};

export type RevenueStats = {
  totalRevenue: number;
  totalProfit: number;
  totalBills: number;
  totalExpenses: number;
  cashRevenue: number;
  upiRevenue: number;
  cardRevenue: number;
  topItems: { name: string; qty: number; revenue: number }[];
  periodExpenses: Expense[];
  freeItemsGiven: FreeItemGiven[];
  tableSales: { tableName: string; revenue: number; billsCount: number }[];
  totalGstCollected: number;
};

export function calculateRevenue(
  bills: Bill[],
  expenses: Expense[],
  startDate?: Date,
  endDate?: Date,
): RevenueStats {
  let filteredBills = bills;
  let filteredExpenses = expenses;

  if (startDate && endDate) {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    filteredBills = bills.filter((b) => {
      const bDate = parseISO(b.date);
      return isWithinInterval(bDate, { start, end });
    });

    filteredExpenses = expenses.filter((e) => {
      const eDate = parseISO(e.date);
      return isWithinInterval(eDate, { start, end });
    });
  }

  let totalRevenue = 0;
  let totalProfit = 0;
  let cashRevenue = 0;
  let upiRevenue = 0;
  let cardRevenue = 0;
  const totalBills = filteredBills.length;
  const itemMap = new Map<string, { qty: number; revenue: number }>();
  const tableMap = new Map<string, { revenue: number; billsCount: number }>();
  const freeItemsGiven: FreeItemGiven[] = [];
  let totalGstCollected = 0;

  for (const b of filteredBills) {
    totalRevenue += b.total;
    if (b.paymentMethod === "UPI") {
      upiRevenue += b.total;
    } else if (b.paymentMethod === "Card") {
      cardRevenue += b.total;
    } else {
      // Default / Cash
      cashRevenue += b.total;
    }

    if (b.gstAmount) {
      totalGstCollected += b.gstAmount;
    }

    if (b.freeItem) {
      freeItemsGiven.push({
        id: b.id,
        date: b.date,
        phone: b.phone,
        customerName: b.name,
        itemName: b.freeItem.name,
        itemPrice: b.freeItem.price,
      });
    }

    // Also include manually added free items
    for (const item of b.items) {
      if (item.isFree) {
        freeItemsGiven.push({
          id: b.id,
          date: b.date,
          phone: b.phone,
          customerName: b.name,
          itemName: item.name,
          itemPrice: 0, // Since it was given away for free
        });
      }
    }

    if (b.tableName) {
      const existingTable = tableMap.get(b.tableName) || { revenue: 0, billsCount: 0 };
      tableMap.set(b.tableName, {
        revenue: existingTable.revenue + b.total,
        billsCount: existingTable.billsCount + 1,
      });
    }

    // Profit calculation
    for (const item of b.items) {
      const cost = item.costPrice || 0;
      const profit = (item.price - cost) * item.qty;
      totalProfit += profit;

      const existing = itemMap.get(item.name) || { qty: 0, revenue: 0 };
      itemMap.set(item.name, {
        qty: existing.qty + item.qty,
        revenue: existing.revenue + item.price * item.qty,
      });
    }
  }

  let totalExpenses = 0;
  for (const e of filteredExpenses) {
    totalExpenses += e.amount;
  }

  totalProfit -= totalExpenses;

  const topItems = Array.from(itemMap.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  const tableSales = Array.from(tableMap.entries())
    .map(([tableName, stats]) => ({ tableName, ...stats }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue,
    totalProfit,
    totalBills,
    totalExpenses,
    cashRevenue,
    upiRevenue,
    cardRevenue,
    topItems,
    periodExpenses: filteredExpenses,
    freeItemsGiven,
    tableSales,
    totalGstCollected,
  };
}

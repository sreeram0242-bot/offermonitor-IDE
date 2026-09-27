import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { loadBills, type Bill, newId, useSettings } from "@/lib/loyalty";
import {
  calculateRevenue,
  loadExpenses,
  addExpense as saveNewExpense,
  deleteExpense as removeExpense,
  type Expense,
} from "@/lib/revenue";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
} from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Banknote, QrCode, X } from "lucide-react";

export const Route = createFileRoute("/revenue")({
  head: () => ({ meta: [{ title: "Revenue — CD Billing" }] }),
  component: RevenuePage,
});

function RevenuePage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<"daily" | "monthly" | "yearly" | "custom">("daily");
  const settings = useSettings();

  const [customStart, setCustomStart] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(() => format(new Date(), "yyyy-MM-dd"));

  // Add Expense form state
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expDate, setExpDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    setBills(loadBills());
    setExpenses(loadExpenses());
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (period === "daily") {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (period === "monthly") {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (period === "yearly") {
      start = startOfYear(now);
      end = endOfYear(now);
    } else {
      start = startOfDay(new Date(customStart));
      end = endOfDay(new Date(customEnd));
    }

    return calculateRevenue(bills, expenses, start, end);
  }, [bills, expenses, period, customStart, customEnd]);

  function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseInt(expAmount, 10);
    if (!amount || amount <= 0 || !expDesc.trim() || !expDate) {
      alert("Please enter a valid amount, description, and date.");
      return;
    }
    const newExp: Expense = {
      id: newId(),
      amount,
      description: expDesc.trim(),
      date: expDate,
    };
    saveNewExpense(newExp);
    setExpenses(loadExpenses());
    setExpAmount("");
    setExpDesc("");
  }

  function handleDeleteExpense(id: string) {
    if (confirm("Delete this expense?")) {
      removeExpense(id);
      setExpenses(loadExpenses());
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-primary">Revenue & Analytics</h1>

      {/* Filters */}
      <div className="card-menu p-5 flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          {(["daily", "monthly", "yearly", "custom"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full border-2 px-4 py-1 text-sm font-bold capitalize transition-colors ${
                period === p
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-primary/30 bg-card text-primary hover:border-primary"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex items-center gap-2 text-sm ml-4">
            <span className="font-bold text-muted-foreground">From:</span>
            <input
              type="date"
              className="input-field max-w-[150px]"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <span className="font-bold text-muted-foreground ml-2">To:</span>
            <input
              type="date"
              className="input-field max-w-[150px]"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <div className="card-menu p-3 md:p-4 text-center">
          <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Total Revenue
          </div>
          <div className="mt-1 font-display text-xl md:text-2xl text-primary font-bold">
            ₹{stats.totalRevenue}
          </div>
          {stats.totalGstCollected > 0 && (
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              (₹{stats.totalGstCollected} GST)
            </div>
          )}
        </div>

        <div className="card-menu p-3 md:p-4 text-center">
          <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Net Profit
          </div>
          <div
            className={`mt-1 font-display text-xl md:text-2xl font-bold ${
              stats.totalProfit >= 0 ? "text-accent" : "text-destructive"
            }`}
          >
            ₹{stats.totalProfit}
          </div>
        </div>

        <div className="card-menu p-3 md:p-4 text-center">
          <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Total Expenses
          </div>
          <div className="mt-1 font-display text-xl md:text-2xl text-destructive font-bold">
            ₹{stats.totalExpenses}
          </div>
        </div>

        <div className="card-menu p-3 md:p-4 text-center">
          <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
            <Banknote className="h-3 w-3 text-emerald-600" />
            <span>Cash</span>
          </div>
          <div className="mt-1 font-display text-xl md:text-2xl text-emerald-700 dark:text-emerald-400 font-bold">
            ₹{stats.cashRevenue}
          </div>
        </div>

        <div className="card-menu p-3 md:p-4 text-center">
          <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
            <QrCode className="h-3 w-3 text-accent" />
            <span>UPI / QR</span>
          </div>
          <div className="mt-1 font-display text-xl md:text-2xl text-accent font-bold">
            ₹{stats.upiRevenue}
          </div>
        </div>

        <Link
          to="/bills"
          className="card-menu p-3 md:p-4 text-center block transition-colors hover:border-primary"
        >
          <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Total Bills
          </div>
          <div className="mt-1 font-display text-xl md:text-2xl text-primary font-bold">
            {stats.totalBills}
          </div>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expenses Manager */}
        <div className="space-y-6">
          <form onSubmit={handleAddExpense} className="card-menu p-5 space-y-4">
            <h2 className="font-display text-xl text-primary">Add Expense</h2>
            <div className="flex flex-wrap gap-3">
              <input
                type="date"
                className="input-field w-auto min-w-[140px]"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                required
              />
              <input
                className="input-field flex-1 min-w-[150px]"
                placeholder="Description (e.g. Vegetables)"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                required
              />
              <div className="flex items-center gap-1 w-28">
                <span className="font-display text-accent text-lg">₹</span>
                <input
                  className="input-field"
                  placeholder="Amt"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  required
                />
              </div>
              <button type="submit" className="btn-accent whitespace-nowrap">
                + Add
              </button>
            </div>
          </form>

          <div className="card-menu p-5">
            <h2 className="font-display text-xl text-primary mb-4">Expenses ({period})</h2>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="pb-3 font-bold uppercase">Date</th>
                    <th className="pb-3 font-bold uppercase">Description</th>
                    <th className="pb-3 text-right font-bold uppercase">Amount</th>
                    <th className="pb-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.periodExpenses.map((exp) => (
                    <tr key={exp.id} className="transition-colors hover:bg-secondary">
                      <td className="py-3 font-medium whitespace-nowrap">{exp.date}</td>
                      <td className="py-3">{exp.description}</td>
                      <td className="py-3 text-right font-bold text-destructive">₹{exp.amount}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                          title="Delete"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stats.periodExpenses.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        No expenses recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Charts & Free Items */}
        <div className="space-y-6">
          <div className="card-menu p-5">
            <h2 className="font-display text-xl text-primary mb-4">Top 10 Selling Items</h2>
            {stats.topItems.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.topItems}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
                      contentStyle={{ borderRadius: "8px", border: "none" }}
                    />
                    <Bar dataKey="qty" fill="#064e3b" radius={[0, 4, 4, 0]} name="Quantity Sold" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No items sold in this period.
              </div>
              )}
          </div>

          {settings.tablesEnabled && (
            <div className="card-menu p-5 mt-6">
              <h2 className="font-display text-xl text-primary mb-4">Table-wise Sales ({period})</h2>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="pb-3 font-bold uppercase">Table</th>
                      <th className="pb-3 text-center font-bold uppercase">Bills</th>
                      <th className="pb-3 text-right font-bold uppercase">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.tableSales.map((t) => (
                      <tr key={t.tableName} className="transition-colors hover:bg-secondary">
                        <td className="py-3 font-medium whitespace-nowrap">{t.tableName}</td>
                        <td className="py-3 text-center text-muted-foreground">{t.billsCount}</td>
                        <td className="py-3 text-right font-bold text-accent">₹{t.revenue}</td>
                      </tr>
                    ))}
                    {stats.tableSales.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-muted-foreground">
                          No table sales recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {settings.streakOfferEnabled && (
              <div className="card-menu p-5 mt-6">
                <h2 className="font-display text-xl text-primary mb-4">Free Items Given ({period})</h2>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="pb-3 font-bold uppercase">Date</th>
                    <th className="pb-3 font-bold uppercase">Customer</th>
                    <th className="pb-3 font-bold uppercase">Item</th>
                    <th className="pb-3 text-right font-bold uppercase">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.freeItemsGiven.map((free) => (
                    <tr key={free.id} className="transition-colors hover:bg-secondary">
                      <td className="py-3 font-medium whitespace-nowrap">{free.date}</td>
                      <td className="py-3">
                        <div>{free.customerName || "Walk-in"}</div>
                        <div className="text-xs text-muted-foreground">{free.phone}</div>
                      </td>
                      <td className="py-3 font-bold text-primary">{free.itemName}</td>
                      <td className="py-3 text-right font-bold text-accent">₹{free.itemPrice}</td>
                    </tr>
                  ))}
                  {stats.freeItemsGiven.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        No free items given in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
            )}
        </div>
      </div>
    </div>
  );
}

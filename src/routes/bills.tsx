import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { loadBills, deleteBill, type Bill, useSettings, formatDate } from "@/lib/loyalty";
import { toast } from "sonner";
import {
  ChevronLeftIcon,
  Trash2Icon,
  Search,
  X,
  Printer,
  Receipt,
  Banknote,
  QrCode,
  CreditCard,
  Plus,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, isWithinInterval, format } from "date-fns";
import { ReceiptModal } from "@/components/ReceiptModal";

export const Route = createFileRoute("/bills")({
  head: () => ({ meta: [{ title: "Recent Bills — CD Billing" }] }),
  component: Bills,
});

function Bills() {
  const [bills, setBills] = useState<Bill[]>([]);
  const settings = useSettings();
  const [period, setPeriod] = useState<"all" | "today" | "week" | "custom">("today");
  const [customStart, setCustomStart] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");
  const [selectedBillForReceipt, setSelectedBillForReceipt] = useState<Bill | null>(null);

  useEffect(() => {
    // Sort newest first
    const all = loadBills();
    all.reverse();
    setBills(all);
  }, []);

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to permanently delete this bill?")) return;
    deleteBill(id);
    setBills((prev) => prev.filter((b) => b.id !== id));
    toast.success("Bill deleted successfully.");
  }

  const filteredBills = useMemo(() => {
    let result = bills;

    if (period !== "all") {
      const now = new Date();
      let start: Date;
      let end: Date;

      if (period === "today") {
        start = startOfDay(now);
        end = endOfDay(now);
      } else if (period === "week") {
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
      } else {
        start = startOfDay(new Date(customStart));
        end = endOfDay(new Date(customEnd));
      }

      result = result.filter((b) => {
        const [y, m, d] = b.date.split("-").map(Number);
        const bDate = new Date(y, m - 1, d);
        return isWithinInterval(bDate, { start, end });
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((b) => {
        const orderMatch =
          b.orderNumber?.toLowerCase().includes(q) ||
          (b.tokenNumber && String(b.tokenNumber).includes(q));
        const nameMatch = b.name?.toLowerCase().includes(q);
        const phoneMatch = b.phone?.includes(q);
        const itemMatch = Array.isArray(b.items) && b.items.some((it) => (it.name || '').toLowerCase().includes(q));
        return orderMatch || nameMatch || phoneMatch || itemMatch;
      });
    }

    return result;
  }, [bills, period, customStart, customEnd, search]);

  // Summary stats for currently filtered period
  const stats = useMemo(() => {
    let cash = 0;
    let upi = 0;
    let total = 0;

    for (const b of filteredBills) {
      total += b.total;
      if (b.paymentMethod === "UPI") {
        upi += b.total;
      } else {
        cash += b.total;
      }
    }

    return { count: filteredBills.length, cash, upi, total };
  }, [filteredBills]);

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary border border-border text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-2xl md:text-3xl text-primary font-bold">Recent Bills</h1>
        </div>

        <Link to="/new-bill" className="btn-accent py-2 px-3 text-xs md:text-sm font-bold gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" />
          <span>New Bill</span>
        </Link>
      </div>

      {/* Period & Shift Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="card-soft p-3 text-center border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Bills ({period})
          </span>
          <span className="font-display text-xl md:text-2xl font-bold text-foreground mt-0.5 block">
            {stats.count}
          </span>
        </div>

        <div className="card-soft p-3 text-center border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block flex items-center justify-center gap-1">
            <Banknote className="h-3 w-3 text-emerald-600" /> Cash
          </span>
          <span className="font-display text-xl md:text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
            ₹{stats.cash}
          </span>
        </div>

        <div className="card-soft p-3 text-center border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block flex items-center justify-center gap-1">
            <QrCode className="h-3 w-3 text-accent" /> UPI / QR
          </span>
          <span className="font-display text-xl md:text-2xl font-bold text-accent mt-0.5 block">
            ₹{stats.upi}
          </span>
        </div>

        <div className="card-soft p-3 text-center border bg-primary/5 border-primary/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
            Total Revenue
          </span>
          <span className="font-display text-xl md:text-2xl font-bold text-primary mt-0.5 block">
            ₹{stats.total}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-menu p-3 md:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Period selector */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {(["today", "week", "all", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-full border px-3.5 py-1 text-xs font-bold capitalize transition-colors ${
                  period === p
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-primary/20 bg-card text-muted-foreground hover:border-primary"
                }`}
              >
                {p === "week" ? "This Week" : p}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              className="input-field pl-8 pr-8 py-1.5 text-xs w-full"
              placeholder="Search token, name, phone, item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2 flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Custom date range picker if custom selected */}
        {period === "custom" && (
          <div className="flex items-center gap-2 pt-2 border-t border-border text-xs">
            <span className="font-bold text-muted-foreground">From:</span>
            <input
              type="date"
              className="input-field py-1 text-xs max-w-[140px]"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <span className="font-bold text-muted-foreground ml-2">To:</span>
            <input
              type="date"
              className="input-field py-1 text-xs max-w-[140px]"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Bills Content */}
      {filteredBills.length === 0 ? (
        <div className="card-soft p-12 text-center text-muted-foreground space-y-2">
          <Receipt className="h-10 w-10 mx-auto opacity-30" />
          <p className="font-medium text-sm">No bills found for this period.</p>
          <p className="text-xs text-muted-foreground">Try selecting a different filter or search term.</p>
        </div>
      ) : (
        <>
          {/* Mobile Card List View (< 768px) */}
          <div className="md:hidden space-y-2.5">
            {filteredBills.map((b) => {
              const tokenDisplay = b.tokenNumber
                ? `#${b.tokenNumber}`
                : b.orderNumber || `#${b.id.slice(-4)}`;

              const itemsSummary = b.items
                .map((i) => `${i.qty}× ${i.name}`)
                .join(", ");

              const timeStr = b.createdAt
                ? new Date(b.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <div
                  key={b.id}
                  className="card-menu p-3 rounded-xl space-y-2 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-primary px-2.5 py-0.5 font-display text-sm font-bold text-primary-foreground">
                        TOKEN {tokenDisplay}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {formatDate(b.date)} {timeStr}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-display text-lg font-bold text-primary">₹{b.total}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-bold text-foreground truncate">
                        {b.name || "Walk-in"}
                        {b.phone && (
                          <span className="text-muted-foreground font-normal ml-1">
                            ({b.phone})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {itemsSummary}
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase shrink-0 ${
                        b.paymentMethod === "UPI"
                          ? "bg-accent/10 text-accent border border-accent/20"
                          : "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-600/20"
                      }`}
                    >
                      {b.paymentMethod || "Cash"}
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                    <button
                      onClick={() => setSelectedBillForReceipt(b)}
                      className="btn-ghost py-1 px-2.5 text-xs font-bold gap-1 text-primary hover:bg-primary/10"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Receipt</span>
                    </button>

                    <button
                      onClick={() => handleDelete(b.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                      title="Delete Bill"
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block card-menu overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="p-3.5 font-bold">Token / Order</th>
                    <th className="p-3.5 font-bold">Date & Time</th>
                    <th className="p-3.5 font-bold">Customer</th>
                    <th className="p-3.5 font-bold">Items Summary</th>
                    <th className="p-3.5 font-bold">Mode</th>
                    <th className="p-3.5 font-bold text-right">Total</th>
                    <th className="p-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredBills.map((b) => {
                    const tokenDisplay = b.tokenNumber
                      ? `#${b.tokenNumber}`
                      : b.orderNumber || `-`;

                    const itemsSummary = b.items
                      .map((i) => `${i.qty}x ${i.name}`)
                      .join(", ");

                    const timeStr = b.createdAt
                      ? new Date(b.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "";

                    return (
                      <tr key={b.id} className="transition-colors hover:bg-secondary/40">
                        <td className="p-3.5 font-bold text-primary">
                          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-bold text-primary">
                            TOKEN {tokenDisplay}
                          </span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap text-xs text-muted-foreground font-mono">
                          <div>{formatDate(b.date)}</div>
                          <div className="text-[10px]">{timeStr}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-foreground">{b.name || "Walk-in"}</div>
                          {b.phone && (
                            <span className="block text-[10px] text-muted-foreground font-mono">
                              {b.phone}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 max-w-[200px] truncate text-xs text-muted-foreground">
                          {itemsSummary}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                              b.paymentMethod === "UPI"
                                ? "bg-accent/10 text-accent border border-accent/20"
                                : "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-600/20"
                            }`}
                          >
                            {b.paymentMethod || "Cash"}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-display text-base font-bold text-foreground">
                          ₹{b.total}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedBillForReceipt(b)}
                              className="btn-ghost py-1 px-2.5 text-xs font-semibold gap-1"
                              title="Print Receipt"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Print</span>
                            </button>
                            <button
                              onClick={() => handleDelete(b.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded text-destructive hover:bg-destructive/10 transition-colors"
                              title="Delete Bill"
                            >
                              <Trash2Icon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Thermal Receipt & WhatsApp Modal */}
      <ReceiptModal
        isOpen={!!selectedBillForReceipt}
        bill={selectedBillForReceipt}
        onClose={() => setSelectedBillForReceipt(null)}
      />
    </div>
  );
}

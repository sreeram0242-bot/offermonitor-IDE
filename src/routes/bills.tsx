import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { loadBills, deleteBill, type Bill, useSettings } from "@/lib/loyalty";
import { toast } from "sonner";
import { ChevronLeftIcon, Trash2Icon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, isWithinInterval, format } from "date-fns";

export const Route = createFileRoute("/bills")({
  component: Bills,
});

function Bills() {
  const [bills, setBills] = useState<Bill[]>([]);
  const settings = useSettings();
  const [period, setPeriod] = useState<"all" | "today" | "week" | "custom">("today");
  const [customStart, setCustomStart] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(() => format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    // Sort newest first
    const all = loadBills();
    all.reverse();
    setBills(all);
  }, []);

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to permanently delete this bill?")) return;
    deleteBill(id);
    setBills(prev => prev.filter(b => b.id !== id));
    toast.success("Bill deleted successfully.");
  }

  const filteredBills = useMemo(() => {
    if (period === "all") return bills;
    
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

    return bills.filter(b => {
      const [y, m, d] = b.date.split("-").map(Number);
      const bDate = new Date(y, m - 1, d);
      return isWithinInterval(bDate, { start, end });
    });
  }, [bills, period, customStart, customEnd]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="btn-secondary rounded-full p-2">
          <ChevronLeftIcon className="h-5 w-5" />
        </Link>
        <h2 className="font-display text-3xl text-primary">All Bills</h2>
      </div>

      <div className="card-menu p-5 flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          {(["all", "today", "week", "custom"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full border-2 px-4 py-1 text-sm font-bold capitalize transition-colors ${
                period === p
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-primary/30 bg-card text-primary hover:border-primary"
              }`}
            >
              {p === "week" ? "This Week" : p}
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

      <div className="card-menu overflow-hidden">
        {filteredBills.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No bills found for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-primary/10 bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 font-bold">Order #</th>
                  <th className="p-4 font-bold">Date</th>
                  <th className="p-4 font-bold">Customer</th>
                  {settings.tablesEnabled && <th className="p-4 font-bold">Table</th>}
                  <th className="p-4 font-bold text-right">Total</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {filteredBills.map((b) => (
                  <tr key={b.id} className="transition-colors hover:bg-secondary/30">
                    <td className="p-4 font-bold text-primary">{b.orderNumber || "-"}</td>
                    <td className="p-4 whitespace-nowrap">{b.date}</td>
                    <td className="p-4">
                      {b.name} 
                      {b.phone && <span className="block text-[10px] text-muted-foreground">{b.phone}</span>}
                    </td>
                    {settings.tablesEnabled && (
                      <td className="p-4">
                        {b.tableName ? (
                          <span className="inline-flex rounded-full bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
                            {b.tableName}
                          </span>
                        ) : "-"}
                      </td>
                    )}
                    <td className="p-4 text-right font-display text-lg text-foreground">₹{b.total}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDelete(b.id)}
                        className="inline-flex rounded bg-red-500/10 p-2 text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                        title="Delete Bill"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

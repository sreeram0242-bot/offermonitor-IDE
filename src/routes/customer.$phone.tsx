import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  computeLoyalty,
  deleteBill,
  formatDate,
  loadBills,
  STREAK_TARGET,
  useSettings,
  type Bill,
} from "@/lib/loyalty";
import { StreakDots } from "./index";
import { Printer, Plus, ChevronLeft, Trash2, Phone, Calendar, Gift } from "lucide-react";
import { ReceiptModal } from "@/components/ReceiptModal";
import { toast } from "sonner";

export const Route = createFileRoute("/customer/$phone")({
  head: () => ({ meta: [{ title: "Customer — CD Billing" }] }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { phone } = Route.useParams();
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [dateFilter, setDateFilter] = useState("");
  const [selectedBillForReceipt, setSelectedBillForReceipt] = useState<Bill | null>(null);
  const settings = useSettings();

  function refresh() {
    setBills(loadBills().filter((b) => b.phone === phone));
  }

  useEffect(() => {
    refresh();
  }, [phone]);

  const customerName = bills[0]?.name ?? "Customer";
  // Correctly compute loyalty using this specific customer's bills
  const loyalty = useMemo(() => computeLoyalty(bills), [bills]);

  const totalSpent = bills.reduce((s, b) => s + b.total, 0);
  const filteredBills = [...bills]
    .filter((b) => (dateFilter ? b.date === dateFilter : true))
    .sort((a, b) => b.date.localeCompare(a.date));

  function onDelete(id: string) {
    if (!confirm("Are you sure you want to delete this bill?")) return;
    deleteBill(id);
    refresh();
    toast.success("Bill deleted.");
  }

  if (bills.length === 0) {
    return (
      <div className="card-soft p-8 text-center space-y-4">
        <p className="text-muted-foreground">No bills found for {phone}.</p>
        <div className="flex justify-center gap-3">
          <Link to="/customers" className="btn-ghost">
            ← All Customers
          </Link>
          <Link to="/new-bill" className="btn-primary">
            + Create Bill
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate({ to: "/customers" })}
          className="flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>All Customers</span>
        </button>

        <Link
          to="/new-bill"
          className="btn-accent py-2 px-3 text-xs md:text-sm font-bold gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Bill for {customerName}</span>
        </Link>
      </div>

      {/* Customer Header Card */}
      <div className="card-menu p-5 md:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl text-primary font-bold">
              {customerName}
            </h1>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Phone className="h-3.5 w-3.5 text-primary" />
              <span>{phone}</span>
            </div>
          </div>

          {settings.streakOfferEnabled && loyalty.eligibleToday && (
            <div className="rounded-xl border-2 border-accent bg-accent/15 px-3 py-2 text-center">
              <div className="font-display text-sm md:text-base font-bold text-accent flex items-center justify-center gap-1.5">
                <Gift className="h-4 w-4" />
                <span>FREE REWARD UNLOCKED!</span>
              </div>
              <div className="text-[10px] font-bold text-foreground opacity-80">
                Eligible today (up to ₹79)
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Mini label="Total Visits" value={loyalty.visitDates.length} />
          <Mini label="Total Spent" value={`₹${totalSpent}`} />
          {settings.streakOfferEnabled && (
            <Mini
              label="Visit Streak"
              value={`${Math.min(loyalty.streak, STREAK_TARGET)}/${STREAK_TARGET}`}
            />
          )}
          <Mini
            label="Last Visit"
            value={loyalty.lastVisit ? formatDate(loyalty.lastVisit) : "—"}
          />
        </div>

        {/* Streak Dots and Explanation */}
        {settings.streakOfferEnabled && (
          <div className="pt-2 border-t border-border">
            <StreakDots streak={loyalty.streak} />
            <p className="mt-2 text-xs text-muted-foreground">
              {loyalty.eligibleToday
                ? "Free reward unlocked! Add an item up to ₹79 for free on today's order."
                : loyalty.streak >= STREAK_TARGET
                  ? "Free item was unlocked! Keep visiting daily to maintain your loyalty status."
                  : `${STREAK_TARGET - loyalty.streak} more consecutive visit${
                      STREAK_TARGET - loyalty.streak !== 1 ? "s" : ""
                    } to unlock a free item.`}
            </p>
          </div>
        )}
      </div>

      {/* Bill History Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl md:text-2xl text-primary font-bold">Bill History</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                className="input-field py-1 text-xs pl-8 w-auto"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            {dateFilter && (
              <button onClick={() => setDateFilter("")} className="btn-ghost text-xs py-1 px-2">
                Clear
              </button>
            )}
          </div>
        </div>

        {filteredBills.length === 0 ? (
          <div className="card-soft p-8 text-center text-muted-foreground text-sm">
            No bills found on this date.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBills.map((b) => (
              <div key={b.id} className="card-menu p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-bold text-primary">
                      {formatDate(b.date)}
                    </span>
                    {b.tokenNumber && (
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-bold text-primary">
                        TOKEN #{b.tokenNumber}
                      </span>
                    )}
                    {b.paymentMethod && (
                      <span className="rounded bg-secondary border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        {b.paymentMethod}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-display text-xl font-bold text-primary">₹{b.total}</span>
                    <button
                      onClick={() => setSelectedBillForReceipt(b)}
                      className="btn-ghost py-1 px-2.5 text-xs font-bold gap-1 text-primary"
                      title="View Receipt"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Receipt</span>
                    </button>
                    <button
                      onClick={() => onDelete(b.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded"
                      title="Delete Bill"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <ul className="space-y-1 text-xs">
                  {b.items.map((it, i) => (
                    <li
                      key={i}
                      className={`flex justify-between py-1 border-b border-dashed ${
                        it.isFree ? "border-accent/40 text-accent font-semibold" : "border-border"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {it.isFree && <Gift className="h-3.5 w-3.5 text-accent" />}
                        <span>{it.name}</span>
                        <span className="text-muted-foreground ml-1">× {it.qty}</span>
                      </span>
                      <span className="font-bold">₹{it.price * it.qty}</span>
                    </li>
                  ))}
                  {b.freeItem && (
                    <li className="flex justify-between py-1 border-b border-dashed border-accent text-accent font-semibold">
                      <span className="flex items-center gap-1">
                        <Gift className="h-3.5 w-3.5 text-accent" />
                        <span>{b.freeItem.name} (Free Reward)</span>
                      </span>
                      <span>₹0</span>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Modal for re-printing */}
      <ReceiptModal
        isOpen={!!selectedBillForReceipt}
        bill={selectedBillForReceipt}
        onClose={() => setSelectedBillForReceipt(null)}
      />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-secondary/50 p-3 text-center">
      <div className="font-display text-lg md:text-xl font-bold leading-none text-primary">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

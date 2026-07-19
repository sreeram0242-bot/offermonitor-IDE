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

export const Route = createFileRoute("/customer/$phone")({
  head: () => ({ meta: [{ title: "Customer — CD Billing" }] }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { phone } = Route.useParams();
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [dateFilter, setDateFilter] = useState("");
  const settings = useSettings();

  function refresh() {
    setBills(loadBills().filter((b) => b.phone === phone));
  }

  useEffect(() => {
    refresh();
  }, [phone]);

  const customerName = bills[0]?.name ?? "Unknown";
  const loyalty = useMemo(() => computeLoyalty(loadBills(), phone), [bills, phone]);

  const totalSpent = bills.reduce((s, b) => s + b.total, 0);
  const filteredBills = [...bills]
    .filter((b) => (dateFilter ? b.date === dateFilter : true))
    .sort((a, b) => b.date.localeCompare(a.date));

  function onDelete(id: string) {
    if (!confirm("Delete this bill?")) return;
    deleteBill(id);
    refresh();
  }

  if (bills.length === 0) {
    return (
      <div className="card-soft p-8 text-center">
        <p className="text-muted-foreground">No bills found for {phone}.</p>
        <Link to="/" className="btn-ghost mt-4">
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate({ to: "/customers" })}
        className="text-sm font-bold text-primary hover:underline"
      >
        ← All customers
      </button>

      <div className="card-menu p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-primary">{customerName}</h1>
            <div className="mt-1 text-sm font-semibold text-muted-foreground">📞 {phone}</div>
          </div>
          {settings.streakOfferEnabled && loyalty.eligibleToday && (
            <div className="rounded-lg border-2 border-accent bg-accent/10 px-3 py-2 text-center">
              <div className="font-display text-accent">🎁 FREE ITEM</div>
              <div className="text-[11px] font-bold text-muted-foreground">
                Eligible today (up to ₹79)
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini label="Visits" value={loyalty.visitDates.length} />
          <Mini label="Total Spent" value={`₹${totalSpent}`} />
          {settings.streakOfferEnabled && (
            <Mini
              label="Streak"
              value={`${Math.min(loyalty.streak, STREAK_TARGET)}/${STREAK_TARGET}`}
            />
          )}
          <Mini
            label="Last Visit"
            value={loyalty.lastVisit ? formatDate(loyalty.lastVisit) : "—"}
          />
        </div>

        {settings.streakOfferEnabled && (
          <div className="mt-5">
            <StreakDots streak={loyalty.streak} />
            <p className="mt-2 text-sm text-muted-foreground">
              {loyalty.eligibleToday
                ? "🎉 Free item unlocked!"
                : loyalty.streak >= STREAK_TARGET
                  ? "Free item was available — keep visiting daily to keep the streak."
                  : `${STREAK_TARGET - loyalty.streak} more consecutive day${
                      STREAK_TARGET - loyalty.streak !== 1 ? "s" : ""
                    } to unlock a free item.`}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-primary">Bill History</h2>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input-field w-auto"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          {dateFilter && (
            <button onClick={() => setDateFilter("")} className="btn-ghost text-xs">
              Clear
            </button>
          )}
        </div>
      </div>

      {filteredBills.length === 0 ? (
        <div className="card-soft p-6 text-center text-muted-foreground">
          No bills on this date.
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredBills.map((b) => (
            <li key={b.id} className="card-soft p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="font-display text-lg text-primary">{formatDate(b.date)}</div>
                  {b.tableName && (
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      {b.tableName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-xl text-accent">₹{b.total}</span>
                  <button
                    onClick={() => onDelete(b.id)}
                    className="text-xs font-bold text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {b.items.map((it, i) => (
                  <li
                    key={i}
                    className={`flex justify-between border-b border-dashed ${it.isFree ? 'border-accent/40 text-accent' : 'border-border'} py-1`}
                  >
                    <span>
                      {it.isFree ? `🎁 ${it.name} (Free)` : it.name} <span className={it.isFree ? 'text-accent/70' : 'text-muted-foreground'}>× {it.qty}</span>
                    </span>
                    <span className="font-bold">₹{it.price * it.qty}</span>
                  </li>
                ))}
                {b.freeItem && (
                  <li className="flex justify-between border-b border-dashed border-accent py-1 text-accent">
                    <span>🎁 {b.freeItem.name} (free)</span>
                    <span className="font-bold">₹0</span>
                  </li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border-2 border-primary/20 bg-secondary p-3">
      <div className="font-display text-xl leading-none text-primary">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

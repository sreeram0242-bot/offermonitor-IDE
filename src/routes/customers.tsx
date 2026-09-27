import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCustomers, loadBills, formatDate, type CustomerSummary } from "@/lib/loyalty";
import { StreakDots } from "./index";
import { Search, Plus, Phone, ArrowRight, X, Gift } from "lucide-react";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — CD Billing" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setCustomers(getCustomers(loadBills()));
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query)
  );

  return (
    <div className="space-y-4 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-primary font-bold">
            All Customers
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {customers.length} recorded customers
          </p>
        </div>

        <Link to="/new-bill" className="btn-accent py-2 px-3 text-xs md:text-sm font-bold gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" />
          <span>New Bill</span>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          className="input-field pl-9 pr-9 py-2 text-sm shadow-sm"
          placeholder="Search by customer name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card-soft p-12 text-center text-muted-foreground space-y-2">
          <Search className="h-8 w-8 mx-auto opacity-30" />
          <p className="text-sm font-medium">
            {customers.length === 0 ? "No customers yet." : "No matches found."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <div
              key={c.phone}
              className="card-menu p-4 rounded-xl flex flex-col justify-between hover:border-primary/40 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg font-bold text-foreground truncate">
                      {c.name || "Customer"}
                    </div>
                    <a
                      href={`tel:${c.phone}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mt-0.5"
                    >
                      <Phone className="h-3 w-3" />
                      <span>{c.phone}</span>
                    </a>
                  </div>

                  {c.eligibleToday && (
                    <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground flex items-center gap-1">
                      <Gift className="h-3 w-3" />
                      <span>Free item</span>
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs font-medium text-muted-foreground pt-2 border-t border-border/50">
                  <StreakDots streak={c.streak} />
                  <span>
                    {c.totalVisits} visits · ₹{c.totalSpent}
                  </span>
                </div>

                {c.lastVisit && (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Last visit: {formatDate(c.lastVisit)}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                <Link
                  to="/customer/$phone"
                  params={{ phone: c.phone }}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <span>History & Rewards</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <Link
                  to="/new-bill"
                  className="btn-ghost py-1 px-2.5 text-xs font-bold gap-1 text-accent border-accent/30 hover:bg-accent/10"
                >
                  <Plus className="h-3 w-3" />
                  <span>Quick Bill</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

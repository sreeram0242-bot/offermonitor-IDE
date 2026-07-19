import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCustomers, loadBills, formatDate, type CustomerSummary, useSettings, saveSettings } from "@/lib/loyalty";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [totalBills, setTotalBills] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [query, setQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const globalSettings = useSettings();
  const [settings, setSettings] = useState(globalSettings);
  const [newTable, setNewTable] = useState("");

  useEffect(() => {
    if (isSettingsOpen) {
      setSettings(globalSettings);
    }
  }, [isSettingsOpen, globalSettings]);

  function handleSaveSettings() {
    let finalSettings = { ...settings };
    if (!finalSettings.requireCustomerDetails) {
      finalSettings.streakOfferEnabled = false;
    }
    saveSettings(finalSettings);
    setIsSettingsOpen(false);
  }

  useEffect(() => {
    const bills = loadBills();
    setCustomers(getCustomers(bills));
    setTotalBills(bills.length);
    setTotalRevenue(bills.reduce((s, b) => s + b.total, 0));
  }, []);

  const filtered = customers.filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query),
  );

  const totalCustomers = customers.length;
  const eligibleCount = customers.filter((c) => c.eligibleToday).length;

  return (
    <div className="space-y-8 relative">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl leading-tight text-foreground">Dashboard</h1>
          {globalSettings.streakOfferEnabled && (
            <p className="mt-1 text-sm text-muted-foreground">
              6 consecutive visits · Free item up to ₹79 on day 7
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/bills" className="btn-secondary">
            📄 Recent Bills
          </Link>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-primary/20 bg-card hover:bg-secondary transition-colors"
            title="Settings"
          >
            ⚙️
          </button>
          <Link to="/new-bill" className="btn-primary">
            + New Bill
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Customers" value={totalCustomers} />
        <StatCard label="Total Bills" value={totalBills} />
        <StatCard label="Revenue" value={`₹${totalRevenue.toLocaleString("en-IN")}`} />
        {globalSettings.streakOfferEnabled && (
          <StatCard label="Eligible Today" value={eligibleCount} accent={eligibleCount > 0} />
        )}
      </section>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-xl border-2 border-primary/20 bg-card p-6 shadow-2xl animate-in zoom-in-95 my-8">
            <h2 className="font-display text-2xl text-primary mb-4">Settings</h2>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <label className="block flex-[2]">
                  <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Hotel Name</span>
                  <input 
                    className="input-field mt-1" 
                    value={settings.hotelName}
                    onChange={e => setSettings({ ...settings, hotelName: e.target.value })}
                  />
                </label>
                <label className="block flex-1">
                  <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">GST %</span>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    className="input-field mt-1" 
                    value={settings.gstPercentage || ""}
                    onChange={e => setSettings({ ...settings, gstPercentage: Number(e.target.value) || 0 })}
                  />
                </label>
              </div>

              <label className="flex items-center justify-between cursor-pointer rounded-lg border-2 border-primary/10 bg-secondary p-3">
                <div>
                  <div className="font-bold">Require Customer Details</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Ask for Name & Phone in New Bill</div>
                </div>
                <input 
                  type="checkbox" 
                  className="h-5 w-5 accent-accent"
                  checked={settings.requireCustomerDetails}
                  onChange={e => {
                    const checked = e.target.checked;
                    setSettings({ 
                      ...settings, 
                      requireCustomerDetails: checked,
                      streakOfferEnabled: checked ? settings.streakOfferEnabled : false 
                    });
                  }}
                />
              </label>

              <label className={`flex items-center justify-between cursor-pointer rounded-lg border-2 border-primary/10 bg-secondary p-3 ${!settings.requireCustomerDetails ? "opacity-50" : ""}`}>
                <div>
                  <div className="font-bold">6-Day Streak Offer</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {!settings.requireCustomerDetails 
                      ? "Requires Customer Details to be ON"
                      : "Enable the loyalty program"}
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  className="h-5 w-5 accent-accent"
                  checked={settings.streakOfferEnabled}
                  disabled={!settings.requireCustomerDetails}
                  onChange={e => setSettings({ ...settings, streakOfferEnabled: e.target.checked })}
                />
              </label>

              <div className="rounded-lg border-2 border-primary/10 bg-secondary p-3 space-y-3">
                  <label className="flex cursor-pointer items-center justify-between rounded-lg border-2 border-primary/10 bg-secondary p-3 transition-colors hover:border-primary/30">
                    <div>
                      <div className="font-bold text-foreground">Custom Tables</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Enable selection of tables</div>
                    </div>
                    <div className={`relative h-6 w-11 rounded-full transition-colors ${settings.tablesEnabled ? "bg-primary" : "bg-primary/20"}`}>
                      <div className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.tablesEnabled ? "translate-x-5" : "translate-x-0"}`} />
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={settings.tablesEnabled}
                      onChange={e => setSettings({ ...settings, tablesEnabled: e.target.checked })}
                    />
                  </label>

                {settings.tablesEnabled && (
                  <div className="pt-2 border-t border-primary/10 space-y-2">
                    <div className="flex gap-2">
                      <input 
                        className="input-field flex-1" 
                        placeholder="New Table Name..."
                        value={newTable}
                        onChange={e => setNewTable(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newTable.trim()) {
                            e.preventDefault();
                            setSettings({ ...settings, tableNames: [...settings.tableNames, newTable.trim()] });
                            setNewTable("");
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if (newTable.trim()) {
                            setSettings({ ...settings, tableNames: [...settings.tableNames, newTable.trim()] });
                            setNewTable("");
                          }
                        }}
                        className="btn-accent px-3"
                      >
                        Add
                      </button>
                    </div>
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                      {settings.tableNames.map((t, i) => (
                        <li key={i} className="flex justify-between items-center text-sm bg-background p-2 rounded border border-border">
                          <span>{t}</span>
                          <button 
                            className="text-destructive font-bold hover:underline"
                            onClick={() => {
                              const nt = [...settings.tableNames];
                              nt.splice(i, 1);
                              setSettings({ ...settings, tableNames: nt });
                            }}
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                      {settings.tableNames.length === 0 && (
                        <li className="text-xs text-muted-foreground text-center py-2">No tables added yet.</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <div className="rounded-lg border-2 border-primary/10 bg-secondary p-3 space-y-3">
                <div>
                  <div className="font-bold">Data Management</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Backup or restore your hotel's data</div>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => {
                      const data = {
                        bills: localStorage.getItem("ek_bills_v1"),
                        menu: localStorage.getItem("ek_menu_v1"),
                        categories: localStorage.getItem("ek_categories_v1"),
                        expenses: localStorage.getItem("ek_expenses_v1"),
                        settings: localStorage.getItem("ek_settings_v1"),
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `ek_backup_${new Date().toISOString().split("T")[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="btn-primary flex-1 text-xs py-2"
                  >
                    ⬇️ Export Backup
                  </button>
                  <label className="btn-accent flex-1 text-xs py-2 text-center cursor-pointer">
                    ⬆️ Restore Backup
                    <input 
                      type="file" 
                      accept=".json" 
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!confirm("WARNING: This will overwrite ALL data on this device with the backup. Continue?")) return;
                        
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const data = JSON.parse(event.target?.result as string);
                            if (data.bills) localStorage.setItem("ek_bills_v1", data.bills);
                            if (data.menu) localStorage.setItem("ek_menu_v1", data.menu);
                            if (data.categories) localStorage.setItem("ek_categories_v1", data.categories);
                            if (data.expenses) localStorage.setItem("ek_expenses_v1", data.expenses);
                            if (data.settings) localStorage.setItem("ek_settings_v1", data.settings);
                            
                            alert("Backup restored successfully! The app will now reload.");
                            window.location.reload();
                          } catch (err) {
                            alert("Failed to restore backup. Invalid file format.");
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSettings}
                className="btn-primary flex-1"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-foreground">Customers</h2>
          <Link to="/customers" className="text-sm font-medium text-primary hover:underline">
            View all →
          </Link>
        </div>
        <input
          className="input-field mb-4"
          placeholder="Search by name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {filtered.length === 0 ? (
          <div className="card-soft p-8 text-center text-sm text-muted-foreground">
            {customers.length === 0
              ? "No bills yet. Add your first bill to get started."
              : "No matches."}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.slice(0, 8).map((c) => (
              <CustomerCard key={c.phone} c={c} streakEnabled={settings.streakOfferEnabled} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className={`card-elevated p-4 ${accent ? "border-accent" : ""}`}>
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-2 font-display text-2xl md:text-3xl leading-none ${
          accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function CustomerCard({ c, streakEnabled }: { c: CustomerSummary; streakEnabled?: boolean }) {
  return (
    <Link
      to="/customer/$phone"
      params={{ phone: c.phone }}
      className="card-elevated block p-4 transition-colors hover:border-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-lg leading-tight text-foreground">{c.name}</div>
          <div className="mt-0.5 text-sm text-muted-foreground">{c.phone}</div>
        </div>
        {streakEnabled && c.eligibleToday && (
          <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
            Free item
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs">
        {streakEnabled ? (
          <StreakDots streak={c.streak} />
        ) : (
          <span className="font-medium text-muted-foreground">Visits: {c.totalVisits}</span>
        )}
        <span className="text-muted-foreground">
          {streakEnabled ? `${c.totalVisits} visits · ₹${c.totalSpent}` : `₹${c.totalSpent}`}
        </span>
      </div>
      {c.lastVisit && (
        <div className="mt-1 text-[11px] text-muted-foreground">
          Last visit · {formatDate(c.lastVisit)}
        </div>
      )}
    </Link>
  );
}

export function StreakDots({ streak }: { streak: number }) {
  const capped = Math.min(streak, 6);
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-4 rounded-full ${i < capped ? "bg-primary" : "bg-border"}`}
        />
      ))}
      <span className="ml-1.5 font-medium text-muted-foreground">{capped}/6</span>
    </span>
  );
}

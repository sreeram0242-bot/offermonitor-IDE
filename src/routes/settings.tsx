import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  useSettings,
  saveSettings,
  type AppSettings,
  loadBills,
  loadMenu,
} from "@/lib/loyalty";
import {
  DEFAULT_WHATSAPP_BILL_TEMPLATE,
  TEMPLATE_VARIABLES,
  SAMPLE_BILL_FOR_PREVIEW,
  renderWhatsAppBill,
  fetchBaileysStatus,
  sendBaileysInvoice,
  disconnectBaileys,
  type BaileysStatus,
} from "@/lib/whatsapp";
import { toast } from "sonner";
import {
  Store,
  MessageSquare,
  Printer,
  Sparkles,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  RotateCcw,
  Sliders,
  Download,
  Upload,
  Phone,
  MapPin,
  Percent,
  Plus,
  Trash2,
  Radio,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const globalSettings = useSettings();
  const [settings, setSettings] = useState<AppSettings>(globalSettings);
  const [newTable, setNewTable] = useState("");

  // Baileys status state
  const [baileysStatus, setBaileysStatus] = useState<BaileysStatus>({
    connected: false,
    status: "disconnected",
  });
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Sync state when global settings change
  useEffect(() => {
    setSettings(globalSettings);
  }, [globalSettings]);

  // Check Baileys status on mount and periodically if waiting for QR
  const checkStatus = async (url?: string) => {
    setIsCheckingStatus(true);
    const serverUrl = url || settings.whatsappServerUrl || "http://localhost:3001";
    const status = await fetchBaileysStatus(serverUrl);
    setBaileysStatus(status);
    setIsCheckingStatus(false);
    return status;
  };

  useEffect(() => {
    checkStatus();
    // Poll every 5s if we are currently displaying QR code
    const interval = setInterval(() => {
      if (baileysStatus.status === "scan_qr" || baileysStatus.status === "connecting") {
        checkStatus();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [settings.whatsappServerUrl, baileysStatus.status]);

  const handleSave = () => {
    saveSettings(settings);
    toast.success("Settings saved successfully!");
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect WhatsApp session? You will need to scan QR code again.")) {
      return;
    }
    const ok = await disconnectBaileys(settings.whatsappServerUrl || "http://localhost:3001");
    if (ok) {
      toast.success("Disconnected. Generating new QR code...");
      setTimeout(() => checkStatus(), 1500);
    } else {
      toast.error("Failed to disconnect from gateway.");
    }
  };

  const handleSendTestMessage = async () => {
    if (!testPhone || testPhone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit phone number for testing.");
      return;
    }

    setIsSendingTest(true);
    const renderedMsg = renderWhatsAppBill(SAMPLE_BILL_FOR_PREVIEW, settings);
    const res = await sendBaileysInvoice(
      settings.whatsappServerUrl || "http://localhost:3001",
      testPhone,
      renderedMsg
    );
    setIsSendingTest(false);

    if (res.success) {
      toast.success(`Test bill sent successfully to ${testPhone}!`);
    } else {
      toast.error(res.error || "Failed to send test message. Check gateway connection.");
    }
  };

  const handleInsertVariable = (variableKey: string) => {
    const currentTemplate = settings.whatsappBillTemplate || DEFAULT_WHATSAPP_BILL_TEMPLATE;
    setSettings({
      ...settings,
      whatsappBillTemplate: currentTemplate + " " + variableKey,
    });
  };

  const handleResetTemplate = () => {
    if (confirm("Reset WhatsApp bill template back to the standard restaurant receipt layout?")) {
      setSettings({
        ...settings,
        whatsappBillTemplate: DEFAULT_WHATSAPP_BILL_TEMPLATE,
      });
      toast.info("Template reset to standard format.");
    }
  };

  // Preview bill rendered with current template
  const livePreviewText = renderWhatsAppBill(SAMPLE_BILL_FOR_PREVIEW, settings);

  // Backup handlers
  const handleExportBackup = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      bills: loadBills(),
      menu: loadMenu(),
      settings: settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cd-billing-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded successfully!");
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.bills) localStorage.setItem("ek_bills_v1", JSON.stringify(parsed.bills));
        if (parsed.menu) localStorage.setItem("ek_menu_v1", JSON.stringify(parsed.menu));
        if (parsed.settings) {
          saveSettings(parsed.settings);
          setSettings(parsed.settings);
        }
        toast.success("Backup restored successfully! Refreshing...");
        setTimeout(() => window.location.reload(), 800);
      } catch {
        toast.error("Invalid backup JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-primary font-bold flex items-center gap-2">
            <Sliders className="h-7 w-7 text-primary" />
            Settings & Integrations
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Configure restaurant profile, WhatsApp background invoicing, hardware and POS options
          </p>
        </div>
        <button
          onClick={handleSave}
          className="btn-accent px-5 py-2.5 text-sm font-bold shadow-md flex items-center gap-2 self-start sm:self-auto"
        >
          <CheckCircle2 className="h-4 w-4" />
          Save Changes
        </button>
      </div>

      {/* SECTION 1: WHATSAPP BAILEYS BACKGROUND INVOICING */}
      <section className="rounded-2xl border-2 border-primary/20 bg-card p-4 sm:p-6 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">WhatsApp Baileys Background Invoicing</h2>
              <p className="text-xs text-muted-foreground">
                Automatically send invoices to customer WhatsApp without opening WhatsApp or paying API charges
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {baileysStatus.connected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-3 py-1 text-xs font-bold border border-emerald-500/30">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Connected: +{baileysStatus.phone || "Active"}
              </span>
            ) : baileysStatus.status === "scan_qr" ? (
              <button
                onClick={() => setShowQrModal(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 px-3 py-1 text-xs font-bold border border-amber-500/30 animate-pulse"
              >
                <QrCode className="h-3.5 w-3.5 text-amber-500" />
                Scan QR Code to Connect
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 text-destructive px-3 py-1 text-xs font-bold border border-destructive/30">
                <AlertCircle className="h-3.5 w-3.5" />
                Offline / Not Connected
              </span>
            )}
            <button
              onClick={() => checkStatus()}
              disabled={isCheckingStatus}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg border border-border bg-secondary"
              title="Refresh Status"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isCheckingStatus ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Master Background Auto-Send Toggle */}
        <label className="flex items-center justify-between cursor-pointer rounded-xl border-2 border-primary/15 bg-primary/5 p-4 transition-all hover:border-primary/30">
          <div>
            <div className="font-bold text-sm text-foreground flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              Auto-Send Invoice in Background on Bill Completion
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              When switched ON, every completed bill is instantly dispatched to the customer in the background.
            </div>
          </div>
          <div className={`relative h-6 w-11 rounded-full transition-colors ${settings.autoWhatsAppBaileys ? "bg-primary" : "bg-muted"}`}>
            <div
              className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${
                settings.autoWhatsAppBaileys ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </div>
          <input
            type="checkbox"
            className="hidden"
            checked={!!settings.autoWhatsAppBaileys}
            onChange={(e) => setSettings({ ...settings, autoWhatsAppBaileys: e.target.checked })}
          />
        </label>

        {/* Server Connection URL & Action bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Baileys Gateway URL
            </label>
            <div className="flex gap-2">
              <input
                className="input-field py-1.5 text-sm font-mono flex-1"
                placeholder="http://localhost:3001"
                value={settings.whatsappServerUrl || ""}
                onChange={(e) => setSettings({ ...settings, whatsappServerUrl: e.target.value })}
              />
              <button
                type="button"
                onClick={() => checkStatus(settings.whatsappServerUrl)}
                disabled={isCheckingStatus}
                className="px-3 py-1.5 rounded-lg border border-border bg-secondary text-xs font-bold hover:bg-secondary/80 flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isCheckingStatus ? "animate-spin" : ""}`} />
                Test
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Default is <code className="text-primary font-mono">http://localhost:3001</code>. Start gateway with <code className="text-primary font-mono">npm run baileys:server</code>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              WhatsApp Device Link
            </label>
            {baileysStatus.connected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="w-full py-1.5 px-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 flex items-center justify-center gap-1.5"
              >
                Disconnect Session
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="w-full py-1.5 px-3 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 flex items-center justify-center gap-1.5"
              >
                <QrCode className="h-3.5 w-3.5" />
                Show QR Code
              </button>
            )}
          </div>
        </div>

        {/* Live QR Code Display Modal / Box */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="relative w-full max-w-sm rounded-2xl bg-card border-2 border-primary/20 p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
              <h3 className="font-bold text-lg text-primary flex items-center justify-center gap-2">
                <QrCode className="h-5 w-5" />
                Link WhatsApp Device
              </h3>

              {baileysStatus.qrDataUrl ? (
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl mx-auto w-fit shadow-xs">
                  <img src={baileysStatus.qrDataUrl} alt="WhatsApp QR Code" className="h-56 w-56" />
                </div>
              ) : baileysStatus.connected ? (
                <div className="p-6 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2" />
                  <p className="font-bold">WhatsApp is connected!</p>
                  <p className="text-xs text-muted-foreground mt-1">Phone: +{baileysStatus.phone}</p>
                </div>
              ) : (
                <div className="p-6 bg-secondary rounded-xl text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mx-auto mb-2 text-amber-500" />
                  <p className="font-bold text-foreground">Waiting for Gateway...</p>
                  <p className="text-xs mt-1">
                    Make sure the Baileys server is running via <code className="text-primary font-mono">npm run baileys:server</code>.
                  </p>
                </div>
              )}

              <div className="text-left text-xs text-muted-foreground space-y-1 bg-secondary/50 p-3 rounded-lg">
                <p className="font-bold text-foreground">Instructions:</p>
                <p>1. Open WhatsApp on your mobile phone.</p>
                <p>2. Go to <strong>Settings</strong> or <strong>Menu (3 dots)</strong> &gt; <strong>Linked Devices</strong>.</p>
                <p>3. Tap <strong>Link a Device</strong> and point your camera at this QR code.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full btn-accent py-2 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* WhatsApp Invoice Template Editor */}
        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Online WhatsApp Bill Template
              </h3>
              <p className="text-xs text-muted-foreground">
                Customize how your bill looks when sent to customer WhatsApp. Uses standard WhatsApp formatting (*bold*, _italic_).
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetTemplate}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-secondary"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to Default Layout
            </button>
          </div>

          {/* Quick-insert variable pills */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Insert Variable Placeholders:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => handleInsertVariable(v.key)}
                  className="rounded-md border border-primary/20 bg-secondary/80 hover:bg-primary/10 hover:text-primary px-2 py-0.5 text-[11px] font-mono text-muted-foreground transition-colors"
                  title={v.desc}
                >
                  {v.key}
                </button>
              ))}
            </div>
          </div>

          {/* Editor & Live Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
            {/* Template Editor Box */}
            <div className="flex flex-col">
              <span className="text-xs font-bold text-muted-foreground mb-1">Template Code (Editable):</span>
              <textarea
                rows={14}
                className="w-full rounded-xl border border-input bg-background p-3 text-xs font-mono leading-relaxed text-foreground shadow-xs focus:border-primary focus:ring-1 focus:ring-primary"
                value={settings.whatsappBillTemplate || DEFAULT_WHATSAPP_BILL_TEMPLATE}
                onChange={(e) => setSettings({ ...settings, whatsappBillTemplate: e.target.value })}
                placeholder="Enter bill template..."
              />
            </div>

            {/* Live WhatsApp Render Preview */}
            <div className="flex flex-col">
              <span className="text-xs font-bold text-muted-foreground mb-1 flex items-center justify-between">
                <span>Live WhatsApp Preview (Sample Data):</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Simulated Chat Bubble</span>
              </span>
              <div className="flex-1 rounded-xl border border-emerald-500/20 bg-[#efeae2] dark:bg-[#121b22] p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed shadow-inner overflow-y-auto text-slate-800 dark:text-slate-100 max-h-[320px]">
                {livePreviewText}
              </div>
            </div>
          </div>

          {/* Test Send Section */}
          <div className="rounded-xl border border-primary/10 bg-secondary/50 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              <strong className="text-foreground">Send Test Bill:</strong> Test your current template and Baileys connection by sending a real preview message to your phone.
            </div>
            <div className="flex w-full sm:w-auto gap-2">
              <input
                className="input-field py-1 text-xs font-mono w-full sm:w-44"
                placeholder="10-digit WhatsApp number"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={isSendingTest}
                className="btn-accent px-3 py-1 text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                <Send className="h-3 w-3" />
                {isSendingTest ? "Sending..." : "Send Test"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: RESTAURANT PROFILE */}
      <section className="rounded-2xl border-2 border-primary/20 bg-card p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Restaurant Profile</h2>
            <p className="text-xs text-muted-foreground">Store information printed on bills and invoices</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Hotel / Restaurant Name
            </label>
            <input
              className="input-field py-1.5 text-sm"
              value={settings.hotelName}
              onChange={(e) => setSettings({ ...settings, hotelName: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Contact Phone
            </label>
            <input
              className="input-field py-1.5 text-sm font-mono"
              placeholder="9025898839"
              value={settings.hotelPhone || ""}
              onChange={(e) => setSettings({ ...settings, hotelPhone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              GST Percentage (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              className="input-field py-1.5 text-sm font-mono"
              value={settings.gstPercentage || ""}
              onChange={(e) => setSettings({ ...settings, gstPercentage: Number(e.target.value) || 0 })}
            />
          </div>

          <div className="sm:col-span-2 md:col-span-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Address / Bill Footer Info
            </label>
            <input
              className="input-field py-1.5 text-sm"
              placeholder="Main Road, Karur"
              value={settings.hotelAddress || ""}
              onChange={(e) => setSettings({ ...settings, hotelAddress: e.target.value })}
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: POS OPERATIONS & FAST COUNTER OPTIONS */}
      <section className="rounded-2xl border-2 border-primary/20 bg-card p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">POS & Counter Checkout Settings</h2>
            <p className="text-xs text-muted-foreground">Adjust behavior for small counter restaurants</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center justify-between cursor-pointer rounded-xl border border-primary/10 bg-secondary p-3.5">
            <div>
              <div className="font-bold text-sm text-foreground">Auto-Print Thermal Receipt</div>
              <div className="text-xs text-muted-foreground mt-0.5">Automatically trigger print dialog on bill creation</div>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 accent-accent"
              checked={!!settings.autoPrintReceipt}
              onChange={(e) => setSettings({ ...settings, autoPrintReceipt: e.target.checked })}
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer rounded-xl border border-primary/10 bg-secondary p-3.5">
            <div>
              <div className="font-bold text-sm text-foreground">Require Customer Name & Phone</div>
              <div className="text-xs text-muted-foreground mt-0.5">Keep unchecked for fast 1-tap walk-in billing</div>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 accent-accent"
              checked={settings.requireCustomerDetails}
              onChange={(e) => {
                const checked = e.target.checked;
                setSettings({
                  ...settings,
                  requireCustomerDetails: checked,
                  streakOfferEnabled: checked ? settings.streakOfferEnabled : false,
                });
              }}
            />
          </label>

          <label className={`flex items-center justify-between cursor-pointer rounded-xl border border-primary/10 bg-secondary p-3.5 ${!settings.requireCustomerDetails ? "opacity-50" : ""}`}>
            <div>
              <div className="font-bold text-sm text-foreground">6-Day Streak Loyalty Program</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {!settings.requireCustomerDetails
                  ? "Requires Customer Details to be enabled"
                  : "Tracks customer visits and gives 7th day reward"}
              </div>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 accent-accent"
              checked={settings.streakOfferEnabled}
              disabled={!settings.requireCustomerDetails}
              onChange={(e) => setSettings({ ...settings, streakOfferEnabled: e.target.checked })}
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer rounded-xl border border-primary/10 bg-secondary p-3.5">
            <div>
              <div className="font-bold text-sm text-foreground">Custom Tables Option</div>
              <div className="text-xs text-muted-foreground mt-0.5">Enable dine-in table numbers for counter billing</div>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 accent-accent"
              checked={settings.tablesEnabled}
              onChange={(e) => setSettings({ ...settings, tablesEnabled: e.target.checked })}
            />
          </label>
        </div>

        {/* Custom Table Names Editor */}
        {settings.tablesEnabled && (
          <div className="rounded-xl border border-primary/10 bg-secondary/50 p-4 space-y-3">
            <span className="text-xs font-bold text-foreground">Configured Tables:</span>
            <div className="flex flex-wrap gap-2">
              {settings.tableNames.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-bold text-foreground shadow-xs"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        tableNames: settings.tableNames.filter((name) => name !== t),
                      })
                    }
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 max-w-sm">
              <input
                className="input-field py-1 text-xs flex-1"
                placeholder="New table name (e.g. Table 5)"
                value={newTable}
                onChange={(e) => setNewTable(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTable.trim()) {
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
                className="btn-accent px-3 py-1 text-xs font-bold"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 4: DATA BACKUP & EXPORT */}
      <section className="rounded-2xl border-2 border-primary/20 bg-card p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Data Backup & Migration</h2>
            <p className="text-xs text-muted-foreground">Export your bills and menu to JSON or restore on another device</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="rounded-xl border border-primary/20 bg-secondary hover:bg-primary/10 px-4 py-2.5 text-xs font-bold text-foreground flex items-center gap-2 shadow-xs transition-colors"
          >
            <Download className="h-4 w-4 text-primary" />
            Download Full Database Backup (.json)
          </button>

          <label className="rounded-xl border border-primary/20 bg-secondary hover:bg-primary/10 px-4 py-2.5 text-xs font-bold text-foreground flex items-center gap-2 shadow-xs transition-colors cursor-pointer">
            <Upload className="h-4 w-4 text-primary" />
            Restore Database from JSON
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>
        </div>
      </section>

      {/* Bottom Save Action */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="btn-accent px-8 py-3 text-sm font-bold shadow-lg flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Save All Settings
        </button>
      </div>
    </div>
  );
}

import { type Bill, type AppSettings, formatDate } from "./loyalty";

export const DEFAULT_WHATSAPP_BILL_TEMPLATE = `=============================
      *{{hotelName}}*
{{hotelAddress}}
Ph: {{hotelPhone}}
=============================
*TOKEN #{{token}}*
*BILL NO:* {{billNo}}
*DATE:* {{dateTime}}
*CUSTOMER:* {{customerName}}
*PAYMENT:* {{paymentMethod}}
-----------------------------
*ITEMS ORDERED:*
{{items}}
-----------------------------
*SUBTOTAL:* ₹{{subtotal}}
{{gstSection}}
*GRAND TOTAL: ₹{{total}}*
=============================
_Thank you for dining with us!_
_Please visit again!_
=============================`;

export const TEMPLATE_VARIABLES = [
  { key: "{{hotelName}}", desc: "Restaurant / Hotel Name" },
  { key: "{{hotelPhone}}", desc: "Contact Phone Number" },
  { key: "{{hotelAddress}}", desc: "Address / Location" },
  { key: "{{token}}", desc: "Daily Token Number (e.g. 05)" },
  { key: "{{billNo}}", desc: "Invoice / Bill Number" },
  { key: "{{dateTime}}", desc: "Order Date & Time" },
  { key: "{{customerName}}", desc: "Customer Name (or Walk-in)" },
  { key: "{{customerPhone}}", desc: "Customer Phone Number" },
  { key: "{{paymentMethod}}", desc: "Payment Mode (Cash / UPI)" },
  { key: "{{items}}", desc: "Formatted Item List with Quantities & Prices" },
  { key: "{{subtotal}}", desc: "Bill Subtotal before Tax" },
  { key: "{{gstSection}}", desc: "GST line with percentage and amount (if applicable)" },
  { key: "{{gstPercentage}}", desc: "GST Percentage" },
  { key: "{{gstAmount}}", desc: "Total GST Amount" },
  { key: "{{total}}", desc: "Grand Total Amount in ₹" },
];

export const SAMPLE_BILL_FOR_PREVIEW: Bill = {
  id: "sample_bill_101",
  name: "Ramesh Kumar",
  phone: "9876543210",
  date: "2026-09-27",
  tokenNumber: 7,
  orderNumber: "INV-20260927-007",
  paymentMethod: "UPI",
  createdAt: "2026-09-27T14:35:00.000Z",
  items: [
    { id: "s1", name: "Veg Sandwich", price: 39, qty: 2 },
    { id: "b3", name: "Chicken Burger", price: 79, qty: 1 },
    { id: "f2", name: "Peri Peri French Fries", price: 59, qty: 1 },
    { id: "mj1", name: "Mint Lime Mojito", price: 49, qty: 1 },
  ],
  subtotal: 265,
  gstAmount: 13,
  total: 278,
  freeItem: null,
};

/**
 * Format the list of items for WhatsApp markdown display
 */
export function formatWhatsAppItems(bill: Bill): string {
  if (!bill.items || bill.items.length === 0) return "No items";

  const lines = bill.items.map((it) => {
    const itemTotal = it.price * it.qty;
    return `- ${it.name}  x${it.qty}  =  ₹${itemTotal}`;
  });

  if (bill.freeItem) {
    lines.push(`[FREE LOYALTY REWARD]: ${bill.freeItem.name} = ₹0`);
  }

  return lines.join("\n");
}

/**
 * Render a bill using the user's custom template or default template
 */
export function renderWhatsAppBill(bill: Bill, settings: AppSettings): string {
  const template = settings.whatsappBillTemplate?.trim() || DEFAULT_WHATSAPP_BILL_TEMPLATE;

  // Format date and time
  const dateStr = formatDate(bill.date);
  let timeStr = "";
  if (bill.createdAt) {
    try {
      timeStr = new Date(bill.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      timeStr = "";
    }
  }
  const dateTimeStr = timeStr ? `${dateStr}, ${timeStr}` : dateStr;

  // Token formatting
  const tokenStr = bill.tokenNumber
    ? String(bill.tokenNumber).padStart(2, "0")
    : (bill.orderNumber || "01");

  // GST section
  let gstLine = "";
  if (bill.gstAmount && bill.gstAmount > 0) {
    const pct = settings.gstPercentage || 5;
    gstLine = `*GST (${pct}%):* ₹${bill.gstAmount}`;
  }

  const subtotal = bill.subtotal || (bill.gstAmount ? bill.total - bill.gstAmount : bill.total);
  const itemsText = formatWhatsAppItems(bill);

  let result = template
    .replace(/\{\{hotelName\}\}/g, settings.hotelName || "CD Billing")
    .replace(/\{\{hotelPhone\}\}/g, settings.hotelPhone || "")
    .replace(/\{\{hotelAddress\}\}/g, settings.hotelAddress || "")
    .replace(/\{\{token\}\}/g, tokenStr)
    .replace(/\{\{billNo\}\}/g, bill.orderNumber || bill.id.slice(0, 8).toUpperCase())
    .replace(/\{\{dateTime\}\}/g, dateTimeStr)
    .replace(/\{\{customerName\}\}/g, bill.name?.trim() || "Walk-in Customer")
    .replace(/\{\{customerPhone\}\}/g, bill.phone?.trim() || "N/A")
    .replace(/\{\{paymentMethod\}\}/g, bill.paymentMethod || "CASH")
    .replace(/\{\{items\}\}/g, itemsText)
    .replace(/\{\{subtotal\}\}/g, String(subtotal))
    .replace(/\{\{gstSection\}\}/g, gstLine)
    .replace(/\{\{gstPercentage\}\}/g, String(settings.gstPercentage || 0))
    .replace(/\{\{gstAmount\}\}/g, String(bill.gstAmount || 0))
    .replace(/\{\{total\}\}/g, String(bill.total));

  // Clean empty lines if gstSection was empty
  result = result.replace(/\n\s*\n\s*\n/g, "\n\n");

  return result;
}

/**
 * Standardize Indian / International phone number for WhatsApp JID
 */
export function formatWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export type BaileysStatus = {
  connected: boolean;
  status: "connected" | "connecting" | "scan_qr" | "disconnected" | "error";
  phone?: string;
  qr?: string;
  qrDataUrl?: string;
  message?: string;
};

/**
 * Check the connection status of the Baileys Gateway Server
 */
export async function fetchBaileysStatus(serverUrl: string): Promise<BaileysStatus> {
  const url = (serverUrl || "https://cd-billing-baileys.onrender.com").replace(/\/$/, "");
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${url}/status`, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        connected: false,
        status: "disconnected",
        message: `Gateway returned status code ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      connected: !!data.connected,
      status: data.status || (data.connected ? "connected" : "disconnected"),
      phone: data.phone,
      qr: data.qr,
      qrDataUrl: data.qrDataUrl,
      message: data.message,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      status: "disconnected",
      message: `Cannot reach Baileys server at ${url} (${errorMsg})`,
    };
  }
}

/**
 * Send an invoice in the background via Baileys server
 */
export async function sendBaileysInvoice(
  serverUrl: string,
  phone: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const formattedPhone = formatWhatsAppPhone(phone);
  if (!formattedPhone || formattedPhone.length < 10) {
    return { success: false, error: "Invalid phone number." };
  }

  const url = (serverUrl || "https://cd-billing-baileys.onrender.com").replace(/\/$/, "");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${url}/send-invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        phone: formattedPhone,
        text,
      }),
    });
    clearTimeout(timeout);

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `Server responded with ${res.status}`,
      };
    }

    return {
      success: true,
      messageId: data.messageId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Network failure connecting to Baileys server (${errorMsg})`,
    };
  }
}

/**
 * Request Baileys gateway to disconnect / unlink session
 */
export async function disconnectBaileys(serverUrl: string): Promise<boolean> {
  const url = (serverUrl || "https://cd-billing-baileys.onrender.com").replace(/\/$/, "");
  try {
    const res = await fetch(`${url}/disconnect`, { method: "POST" });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

/**
 * 100% On-Device WhatsApp Dispatcher (Zero Server / Zero PC needed)
 * Automatically opens the installed WhatsApp app on Android with the customer chat
 * and pre-filled invoice message ready to send with 1 tap.
 */
export function openWhatsAppDirect(phone: string, text: string): boolean {
  const formattedPhone = formatWhatsAppPhone(phone);
  if (!formattedPhone || formattedPhone.length < 10) {
    return false;
  }
  const encoded = encodeURIComponent(text);

  // Directly invoke WhatsApp Android Native Intent
  try {
    const isNativeCapacitor = typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();
    if (isNativeCapacitor) {
      // whatsapp:// scheme triggers Android OS to directly launch the native WhatsApp / WA Business app
      window.location.href = `whatsapp://send?phone=${formattedPhone}&text=${encoded}`;
      return true;
    }
  } catch {
    // Fallback to standard web URL
  }

  window.open(`https://wa.me/${formattedPhone}?text=${encoded}`, "_blank");
  return true;
}

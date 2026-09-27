import { useSettings, type Bill, formatDate } from "@/lib/loyalty";
import { renderWhatsAppBill, sendBaileysInvoice, formatWhatsAppPhone, openWhatsAppDirect } from "@/lib/whatsapp";
import { Printer, Share2, X, PlusCircle, Check, Send } from "lucide-react";
import { toast } from "sonner";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  onNextOrder?: () => void;
}

export function ReceiptModal({ isOpen, onClose, bill, onNextOrder }: ReceiptModalProps) {
  const settings = useSettings();

  if (!isOpen || !bill) return null;

  const orderTime = bill.createdAt
    ? new Date(bill.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  const tokenDisplay = bill.tokenNumber
    ? `#${bill.tokenNumber}`
    : bill.orderNumber || `#${bill.id.slice(-4)}`;

  function handlePrint() {
    window.print();
  }

  async function handleWhatsAppShare() {
    if (!bill) return;
    const rawPhone = bill.phone?.replace(/\D/g, "") || "";
    let targetPhone = rawPhone;

    if (!targetPhone || targetPhone.length < 10) {
      const entered = window.prompt("Enter customer WhatsApp 10-digit phone number:", "");
      if (!entered) return;
      targetPhone = entered.replace(/\D/g, "");
      if (targetPhone.length < 10) {
        toast.error("Invalid phone number.");
        return;
      }
    }

    const phoneWithCountry = formatWhatsAppPhone(targetPhone);
    const msg = renderWhatsAppBill(bill, settings);

    // If Baileys background auto-dispatch is enabled in settings, try background sending first
    if (settings.autoWhatsAppBaileys) {
      toast.info("Sending invoice via Baileys in background...");
      const res = await sendBaileysInvoice(
        settings.whatsappServerUrl || "https://cd-billing-baileys.onrender.com",
        targetPhone,
        msg
      );
      if (res.success) {
        toast.success(`WhatsApp invoice sent to +${phoneWithCountry}!`);
        return;
      } else {
        toast.warning(`Baileys gateway unavailable (${res.error}). Opening WhatsApp app...`);
      }
    }

    // 100% on phone without server/PC
    openWhatsAppDirect(targetPhone, msg);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 overflow-y-auto">
      <div className="relative w-full max-w-sm rounded-2xl bg-card border-2 border-primary/20 shadow-2xl p-5 my-4 animate-in zoom-in-95 duration-200">
        {/* Header Close button */}
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors no-print"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* On-Screen Receipt Preview Card */}
        <div className="rounded-xl border border-dashed border-primary/30 bg-secondary/30 p-4 font-mono text-xs">
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-border">
            <div className="font-display text-xl tracking-tight text-primary font-bold">
              {settings.hotelName}
            </div>
            {settings.hotelAddress && (
              <div className="text-[10px] text-muted-foreground mt-0.5">{settings.hotelAddress}</div>
            )}
            {settings.hotelPhone && (
              <div className="text-[10px] text-muted-foreground">Ph: {settings.hotelPhone}</div>
            )}

            {/* Token Badge */}
            <div className="my-2 inline-block rounded-lg bg-primary px-4 py-1 text-primary-foreground shadow-sm">
              <span className="text-[11px] font-sans font-bold uppercase tracking-wider block opacity-90">
                TOKEN NUMBER
              </span>
              <span className="font-display text-2xl font-bold tracking-wider leading-none">
                {tokenDisplay}
              </span>
            </div>

            <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
              <span>{formatDate(bill.date)} {orderTime}</span>
              <span className="font-bold text-accent">{bill.paymentMethod || "Cash"}</span>
            </div>
            <div className="text-left text-[10px] text-muted-foreground mt-0.5 truncate">
              Cust: <span className="text-foreground font-semibold">{bill.name || "Walk-in"}</span>
              {bill.phone && <span className="ml-1">({bill.phone})</span>}
            </div>
          </div>

          {/* Items */}
          <div className="py-2.5 space-y-1.5 border-b border-dashed border-border">
            <div className="flex justify-between font-bold text-[10px] uppercase text-muted-foreground pb-1">
              <span>Item</span>
              <span>Qty x Rate</span>
              <span>Amt</span>
            </div>
            {bill.items.map((it, idx) => (
              <div key={idx} className="flex justify-between items-start text-xs">
                <span className="flex-1 pr-2 truncate font-medium text-foreground">
                  {it.isFree ? `[FREE] ${it.name}` : it.name}
                </span>
                <span className="text-muted-foreground shrink-0 text-center w-16">
                  {it.qty} × ₹{it.price}
                </span>
                <span className="font-bold text-right shrink-0 w-12 text-foreground">
                  ₹{it.price * it.qty}
                </span>
              </div>
            ))}
            {bill.freeItem && (
              <div className="flex justify-between items-start text-xs text-accent font-semibold">
                <span className="flex-1 pr-2 truncate">[FREE] {bill.freeItem.name}</span>
                <span className="shrink-0 text-center w-16">1 × ₹0</span>
                <span className="text-right shrink-0 w-12">₹0</span>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="pt-2.5 space-y-1">
            {bill.gstAmount && bill.gstAmount > 0 ? (
              <>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₹{bill.subtotal || bill.total - bill.gstAmount}</span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>GST ({settings.gstPercentage}%)</span>
                  <span>₹{bill.gstAmount}</span>
                </div>
              </>
            ) : null}
            <div className="flex justify-between items-baseline font-bold text-sm text-foreground pt-1 border-t border-dashed border-border">
              <span className="font-sans uppercase tracking-wider text-xs">Grand Total</span>
              <span className="font-display text-xl text-primary font-black">₹{bill.total}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center pt-3 text-[10px] text-muted-foreground opacity-80 font-medium">
            Thank you for visiting!
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-2 no-print">
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary flex-1 py-2.5 text-xs font-bold gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <Printer className="h-4 w-4" />
              Print Slip
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border-2 border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 py-2.5 text-xs font-bold hover:bg-emerald-600/20 active:scale-95 transition-all"
            >
              <Share2 className="h-4 w-4" />
              WhatsApp
            </button>
          </div>

          {onNextOrder ? (
            <button
              onClick={() => {
                onClose();
                onNextOrder();
              }}
              className="btn-accent w-full py-2.5 text-sm font-bold gap-2 active:scale-95 transition-transform shadow-md"
            >
              <PlusCircle className="h-4 w-4" />
              Next Order (New Bill)
            </button>
          ) : (
            <button onClick={onClose} className="btn-ghost w-full py-2 text-xs font-semibold">
              <Check className="h-4 w-4 mr-1" /> Done
            </button>
          )}
        </div>
      </div>

      {/* Hidden printable receipt for 58mm/80mm thermal printers */}
      <div id="printable-receipt" style={{ display: "none" }}>
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>{settings.hotelName}</div>
          {settings.hotelAddress && <div style={{ fontSize: "11px" }}>{settings.hotelAddress}</div>}
          {settings.hotelPhone && <div style={{ fontSize: "11px" }}>Ph: {settings.hotelPhone}</div>}
          <div style={{ borderTop: "1px dashed black", margin: "6px 0" }} />
          <div style={{ fontSize: "22px", fontWeight: "bold" }}>TOKEN {tokenDisplay}</div>
          <div style={{ borderTop: "1px dashed black", margin: "6px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
            <span>{formatDate(bill.date)} {orderTime}</span>
            <span>{bill.paymentMethod || "Cash"}</span>
          </div>
          <div style={{ textAlign: "left", fontSize: "11px", marginTop: "2px" }}>
            Cust: {bill.name || "Walk-in"} {bill.phone ? `(${bill.phone})` : ""}
          </div>
        </div>

        <div style={{ borderTop: "1px dashed black", margin: "6px 0" }} />

        <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px dashed black", textAlign: "left" }}>
              <th style={{ paddingBottom: "4px" }}>Item</th>
              <th style={{ textAlign: "center", paddingBottom: "4px" }}>Qty</th>
              <th style={{ textAlign: "right", paddingBottom: "4px" }}>Rate</th>
              <th style={{ textAlign: "right", paddingBottom: "4px" }}>Amt</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((it, idx) => (
              <tr key={idx}>
                <td style={{ paddingTop: "3px" }}>{it.isFree ? `[FREE] ${it.name}` : it.name}</td>
                <td style={{ textAlign: "center", paddingTop: "3px" }}>{it.qty}</td>
                <td style={{ textAlign: "right", paddingTop: "3px" }}>₹{it.price}</td>
                <td style={{ textAlign: "right", paddingTop: "3px" }}>₹{it.price * it.qty}</td>
              </tr>
            ))}
            {bill.freeItem && (
              <tr>
                <td style={{ paddingTop: "3px" }}>[FREE] {bill.freeItem.name}</td>
                <td style={{ textAlign: "center", paddingTop: "3px" }}>1</td>
                <td style={{ textAlign: "right", paddingTop: "3px" }}>₹0</td>
                <td style={{ textAlign: "right", paddingTop: "3px" }}>₹0</td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ borderTop: "1px dashed black", margin: "6px 0" }} />

        <div style={{ fontSize: "11px" }}>
          {bill.gstAmount && bill.gstAmount > 0 ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal:</span>
                <span>₹{bill.subtotal || bill.total - bill.gstAmount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>GST ({settings.gstPercentage}%):</span>
                <span>₹{bill.gstAmount}</span>
              </div>
            </>
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "bold", marginTop: "4px" }}>
            <span>TOTAL:</span>
            <span>₹{bill.total}</span>
          </div>
        </div>

        <div style={{ borderTop: "1px dashed black", margin: "8px 0" }} />
        <div style={{ textAlign: "center", fontSize: "11px", marginTop: "4px" }}>
          Thank you! Please visit again
        </div>
      </div>
    </div>
  );
}

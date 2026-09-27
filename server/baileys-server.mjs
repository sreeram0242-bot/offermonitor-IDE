/**
 * Standalone WhatsApp Baileys Gateway Server for CD Billing POS
 * 
 * Allows automatic background invoice sending directly to customer WhatsApp
 * without opening the WhatsApp application or requiring Meta Business API fees.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.join(__dirname, "auth_info_baileys");

const PORT = process.env.PORT || 3001;

// Global state
let sock = null;
let connectionState = "disconnected"; // 'disconnected' | 'connecting' | 'scan_qr' | 'connected'
let currentQR = null;
let currentQRDataUrl = null;
let connectedPhone = null;
let isBaileysAvailable = false;

// Attempt dynamic import of Baileys so server can start even before `npm install`
let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, QRCode, pino;

async function loadDependencies() {
  try {
    const baileys = await import("@whiskeysockets/baileys");
    makeWASocket = baileys.default || baileys.makeWASocket;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    DisconnectReason = baileys.DisconnectReason;
    fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;

    const qrMod = await import("qrcode");
    QRCode = qrMod.default || qrMod;

    const pinoMod = await import("pino");
    pino = pinoMod.default || pinoMod;

    isBaileysAvailable = true;
    console.log("[Baileys Gateway] Required libraries loaded successfully.");
    return true;
  } catch (err) {
    console.warn("[Baileys Gateway] Baileys libraries not yet installed.");
    console.warn("Run `cd server && npm install` or `npm run baileys:install` to initialize.");
    isBaileysAvailable = false;
    return false;
  }
}

async function startWhatsApp() {
  if (!isBaileysAvailable) {
    const ok = await loadDependencies();
    if (!ok) return;
  }

  connectionState = "connecting";
  console.log("[Baileys Gateway] Connecting to WhatsApp Multi-Device...");

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    let version = [2, 3000, 1015901307];
    try {
      const v = await fetchLatestBaileysVersion();
      if (v?.version) version = v.version;
    } catch {
      // Use fallback version
    }

    const logger = pino({ level: "silent" });

    sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: true,
      auth: state,
      browser: ["CD Billing POS", "Chrome", "1.0.0"],
      syncFullHistory: false,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQR = qr;
        connectionState = "scan_qr";
        console.log("[Baileys Gateway] New QR code generated. Waiting for scan...");
        try {
          if (QRCode) {
            currentQRDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
          }
        } catch (e) {
          console.error("QR Code generation error:", e);
        }
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason?.loggedOut;
        console.log(`[Baileys Gateway] Connection closed. Reason code: ${statusCode}. Reconnecting: ${shouldReconnect}`);

        currentQR = null;
        currentQRDataUrl = null;
        connectedPhone = null;
        sock = null;

        if (shouldReconnect) {
          connectionState = "connecting";
          setTimeout(startWhatsApp, 3000);
        } else {
          connectionState = "disconnected";
          console.log("[Baileys Gateway] Logged out. Clearing credentials.");
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {}
        }
      } else if (connection === "open") {
        connectionState = "connected";
        currentQR = null;
        currentQRDataUrl = null;
        const jid = sock.user?.id || "";
        connectedPhone = jid.split(":")[0] || jid.split("@")[0] || "Connected";
        console.log(`[Baileys Gateway] Connected successfully as +${connectedPhone}!`);
      }
    });
  } catch (err) {
    console.error("[Baileys Gateway] Error launching socket:", err);
    connectionState = "disconnected";
  }
}

// ---------------------------------------------------------------------------
// HTTP Request Dispatcher with CORS
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  // 1. Health & Status
  if (pathname === "/status" || pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        isInstalled: isBaileysAvailable,
        connected: connectionState === "connected",
        status: connectionState,
        phone: connectedPhone,
        qr: currentQR,
        qrDataUrl: currentQRDataUrl,
        message: !isBaileysAvailable
          ? "Baileys is not installed. Please run `cd server && npm install`"
          : connectionState === "connected"
          ? `Connected as +${connectedPhone}`
          : connectionState === "scan_qr"
          ? "Scan QR Code with WhatsApp (Linked Devices)"
          : "Connecting...",
      })
    );
    return;
  }

  // 2. Disconnect / Logout
  if (pathname === "/disconnect" && req.method === "POST") {
    try {
      if (sock) {
        try {
          await sock.logout();
        } catch {}
        sock = null;
      }
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      connectionState = "disconnected";
      currentQR = null;
      currentQRDataUrl = null;
      connectedPhone = null;
      setTimeout(startWhatsApp, 1000);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, message: "Disconnected successfully" }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: String(e) }));
    }
    return;
  }

  // 3. Send Invoice in Background
  if (pathname === "/send-invoice" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const { phone, text } = payload;

        if (!phone || !text) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Missing required fields: phone, text" }));
          return;
        }

        if (connectionState !== "connected" || !sock) {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: `WhatsApp not connected (status: ${connectionState}). Please scan QR code in settings.`,
            })
          );
          return;
        }

        const digits = phone.replace(/\D/g, "");
        const formatted = digits.length === 10 ? `91${digits}` : digits;
        const jid = `${formatted}@s.whatsapp.net`;

        console.log(`[Baileys Gateway] Sending background invoice to ${jid}...`);
        const sent = await sock.sendMessage(jid, { text });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            messageId: sent?.key?.id || "sent",
            to: formatted,
          })
        );
      } catch (err) {
        console.error("[Baileys Gateway] Failed to send invoice:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: String(err?.message || err) }));
      }
    });
    return;
  }

  // Fallback 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint not found" }));
});

// Start Server & WhatsApp listener
server.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(` CD BILLING — WhatsApp Baileys Gateway Server`);
  console.log(` HTTP API running at: http://localhost:${PORT}`);
  console.log(` Status endpoint:     http://localhost:${PORT}/status`);
  console.log(` Send endpoint:       http://localhost:${PORT}/send-invoice`);
  console.log(`====================================================`);

  await loadDependencies();
  if (isBaileysAvailable) {
    startWhatsApp();
  }

  // Keep-alive self-ping loop (prevents sleep on free cloud hosts like Render/Koyeb)
  const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL;
  if (externalUrl) {
    console.log(`[Baileys Gateway] Setting up keep-alive self-ping to ${externalUrl}...`);
    setInterval(() => {
      try {
        fetch(`${externalUrl.replace(/\/$/, "")}/health`).catch(() => {});
      } catch {}
    }, 10 * 60 * 1000); // Every 10 mins
  }
});

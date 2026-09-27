# CD BILLING — WhatsApp Baileys Gateway Server

This is an automated background WhatsApp messaging gateway built with [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys).

It connects directly to WhatsApp Multi-Device protocol using WebSockets. When configured in the POS app, all restaurant bills are automatically sent to the customer's WhatsApp in the background with zero manual intervention and zero per-message charges.

---

### Quick Start (Local Machine or Restaurant PC)

1. Open a terminal in the `server` directory:
   ```bash
   cd server
   npm install
   ```

2. Start the gateway:
   ```bash
   npm start
   ```

3. Open your CD Billing POS app, go to **Settings > WhatsApp Invoicing**:
   - The connection status will show **Scan QR Code**.
   - Open WhatsApp on your phone > **Settings** (or 3 dots) > **Linked Devices** > **Link a Device**.
   - Scan the QR code shown on the screen.
   - The status will turn green: **Connected as +91 XXXXX XXXXX**.
   - Toggle **"Auto-send invoice in background on bill completion"** to **ON**.

That's it! Every bill created will now be dispatched instantly to the customer's WhatsApp in the background!

---

### Running on Cloud (Optional)
You can deploy this `server` folder to free hosting providers like:
- **Render.com** (Web Service, Node environment)
- **Railway.app**
- **Fly.io**
- **VPS (Ubuntu/Debian)** with `pm2`

Once deployed, simply paste your cloud URL (e.g., `https://my-pos-baileys.onrender.com`) into the **Server URL** input in the POS Settings page.

import { app, BrowserWindow } from "electron";
import path from "path";
import http from "http";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let staticServer = null;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

/**
 * Start a lightweight zero-dependency local static HTTP server for SPA
 */
function startStaticServer(distDir) {
  return new Promise((resolve, reject) => {
    staticServer = http.createServer((req, res) => {
      try {
        let reqPath = decodeURI(req.url.split("?")[0]);
        if (reqPath === "/" || reqPath === "") {
          reqPath = "/index.html";
        }

        let filePath = path.join(distDir, reqPath);

        // Fallback to index.html for client-side SPA routing (TanStack Router)
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(distDir, "index.html");
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        fs.readFile(filePath, (err, content) => {
          if (err) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Error loading file");
            return;
          }
          res.writeHead(200, {
            "Content-Type": contentType,
            "Cache-Control": "no-cache",
          });
          res.end(content);
        });
      } catch (e) {
        res.writeHead(500);
        res.end("Internal Server Error");
      }
    });

    // Listen on dynamic available port on localhost
    staticServer.listen(0, "127.0.0.1", () => {
      const port = staticServer.address().port;
      resolve(port);
    });

    staticServer.on("error", (err) => {
      reject(err);
    });
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 850,
    minHeight: 550,
    title: "CD Billing POS",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  // Determine web assets directory
  let distDir = path.join(__dirname, "dist-capacitor");
  if (!fs.existsSync(distDir)) {
    distDir = path.join(__dirname, ".output/public");
  }

  try {
    const port = await startStaticServer(distDir);
    await mainWindow.loadURL(`http://127.0.0.1:${port}`);
  } catch (err) {
    console.error("Failed to start embedded web server:", err);
    // Fallback load file directly
    mainWindow.loadFile(path.join(distDir, "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (staticServer) {
    try {
      staticServer.close();
    } catch {}
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

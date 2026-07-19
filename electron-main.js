import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
  });

  if (app.isPackaged) {
    // Start the local Node server inside the Electron process
    process.env.PORT = "3000";
    process.env.NODE_ENV = "production";

    try {
      let serverPath = path.join(__dirname, ".output/server/index.mjs");
      // Node's native dynamic import() doesn't understand ASAR virtual file systems.
      // Since we unpack .output, we must point directly to the unpacked folder on disk.
      if (serverPath.includes("app.asar")) {
        serverPath = serverPath.replace("app.asar", "app.asar.unpacked");
      }

      // On Windows, dynamic imports require proper file:// URLs
      await import(pathToFileURL(serverPath).href);

      // Give the server a tiny moment to bind to the port
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Load the app
      mainWindow.loadURL("http://localhost:3000");
    } catch (err) {
      console.error("Failed to start local server:", err);
    }
  } else {
    // In development, wait for Vite to be ready
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

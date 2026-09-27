import { build, Platform } from "electron-builder";
import path from "path";
import fs from "fs";

const SCRATCH_OUTPUT = "C:\\Users\\mahit\\.gemini\\antigravity-ide\\brain\\cb018dae-c498-402a-9d41-89043c5d0ae2\\scratch\\build-electron";
const TARGET_DIR = "E:\\OfferMonitor";

async function main() {
  console.log("Starting Electron Builder using fast internal SSD scratch cache...");

  // Clean scratch output directory if exists
  if (fs.existsSync(SCRATCH_OUTPUT)) {
    try {
      fs.rmSync(SCRATCH_OUTPUT, { recursive: true, force: true });
    } catch (e) {
      console.warn("Could not clean scratch dir:", e);
    }
  }

  try {
    const result = await build({
      targets: Platform.WINDOWS.createTarget(["portable"]),
      config: {
        appId: "com.cdbilling.pos",
        productName: "CD BILLING",
        asar: true,
        compression: "normal",
        directories: {
          output: SCRATCH_OUTPUT,
        },
        win: {
          target: "portable",
        },
        files: [
          "electron-main.js",
          "dist-capacitor/**/*",
          "package.json",
        ],
      },
    });

    console.log("Packaging successful! Output files in scratch:", result);

    // Find the generated .exe
    const files = fs.readdirSync(SCRATCH_OUTPUT);
    const exeFile = files.find(f => f.endsWith(".exe"));
    if (exeFile) {
      const srcExe = path.join(SCRATCH_OUTPUT, exeFile);
      const destExe = path.join(TARGET_DIR, "CD BILLING.exe");
      console.log(`Copying ${srcExe} to ${destExe}...`);
      fs.copyFileSync(srcExe, destExe);
      const stats = fs.statSync(destExe);
      console.log(`SUCCESS! Created ${destExe} (${(stats.size / (1024*1024)).toFixed(2)} MB)`);
    } else {
      console.warn("Could not find .exe file in output directory:", files);
    }
  } catch (err) {
    console.error("BUILD ERROR:", err);
    process.exit(1);
  }
}

main();

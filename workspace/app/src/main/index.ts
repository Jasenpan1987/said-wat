import { app, BrowserWindow } from "electron";
import path from "path";
import { loadDotEnv } from "./env.js";
import { createTray } from "./tray.js";
import { initHotkeys, stopHotkeys } from "./hotkeys.js";
import { startCapture } from "./capture/index.js";
import { registerIpcHandlers } from "./ipc-handlers.js";
import { runDemoFlow, runInterpretFlow } from "./interpret-flow.js";

const iconPath = path.join(
  import.meta.dirname,
  "../renderer/assets/tray-icon.png"
);

// Dev convenience: load `MOONSHOT_API_KEY` from the repo-root `.env` before
// anything reads the environment (no-op when the file is absent or packaged).
loadDotEnv();

// Single-instance guard: a second launch tells the running instance about
// itself and then exits. Must run before app 'ready'.
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

// Keep the tray referenced for the app's lifetime — an unreferenced Tray gets
// garbage-collected and disappears from the menu bar.
let tray: ReturnType<typeof createTray> | null = null;

app.on("second-instance", () => {
  // A second launch means "show me the app". There is nothing to focus yet
  // (tray-only until the sticky-note popup exists), but once T-007 lands this
  // is where the existing note gets brought to front.
  const existing = BrowserWindow.getAllWindows()[0];
  if (existing) {
    if (existing.isMinimized()) existing.restore();
    existing.show();
    existing.focus();
  }
});

app.whenReady().then(() => {
  tray = createTray(iconPath);
  registerIpcHandlers();
  const report = initHotkeys({
    onCapture: () => {
      void startCapture()
        .then((result) => {
          if (result) {
            void runInterpretFlow(result);
          } else {
            console.log("[capture] cancelled");
          }
        })
        .catch((err) => console.error("[capture] failed:", err));
    },
    // The polish flow arrives in T-009. Until then the hotkey is registered
    // but logs its press.
    onPolish: () => console.log("[hotkeys] polish pressed (flow arrives in T-009)"),
  });

  // Surface registration failures (e.g. an accelerator held by another app)
  // instead of silently missing a hotkey.
  for (const [name, result] of Object.entries(report)) {
    if (!result?.ok) console.warn(`[hotkeys] ${name} not registered: ${result?.reason}`);
  }

  // Demo mode: analyze the bundled sample screenshot through the real
  // pipeline (no Screen Recording permission needed). SAIDWAT_DEMO=1.
  if (process.env.SAIDWAT_DEMO === "1") {
    setTimeout(() => void runDemoFlow(), 1200);
  }
});

// Tray-only lifecycle: closing a sticky-note popup must never take the app
// down. On macOS the convention is to keep running; quit only via the tray.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  tray?.destroy();
  tray = null;
  stopHotkeys();
  // More cleanup hooks land here as T-005/T-006 add in-flight work.
});

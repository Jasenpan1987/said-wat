import { app, BrowserWindow } from "electron";
import path from "path";
import { loadDotEnv } from "./env.js";
import { createTray } from "./tray.js";
import { initHotkeys, stopHotkeys, getCurrentHotkeys } from "./hotkeys.js";
import { startCapture } from "./capture/index.js";
import { registerIpcHandlers } from "./ipc-handlers.js";
import { runDemoFlow, runInterpretFlow } from "./interpret-flow.js";
import { runPolishFlow } from "./polish-flow.js";
import { loadSettings, saveSettings } from "./settings-store.js";
import { setModelOverride } from "./llm/kimi.js";
import { showSettingsWindow } from "./settings-window.js";

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
  // Persisted settings drive startup wiring (T-011): hotkey bindings and the
  // model override flow straight into the hotkey manager and the LLM client.
  const settings = loadSettings();
  setModelOverride(settings.model);

  tray = createTray(iconPath, () => showSettingsWindow());
  registerIpcHandlers();
  const report = initHotkeys(
    {
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
      // Flow A: clipboard polish (T-009).
      onPolish: () => {
        void runPolishFlow();
      },
    },
    settings.hotkeys
  );

  // Surface registration failures (e.g. an accelerator held by another app)
  // instead of silently missing a hotkey.
  for (const [name, result] of Object.entries(report)) {
    if (!result?.ok) console.warn(`[hotkeys] ${name} not registered: ${result?.reason}`);
  }
  // A stored binding that failed to register falls back to the default; keep
  // the settings file in sync with what is actually active.
  if (Object.values(report).some((r) => r && !r.ok)) {
    saveSettings({ ...loadSettings(), hotkeys: getCurrentHotkeys() });
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

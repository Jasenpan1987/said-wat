import { clipboard, ipcMain } from "electron";
import { getLastViewContext, hideNote } from "./note-window.js";
import { retryLastInterpret } from "./interpret-flow.js";
import { sendDraft } from "./reply-flow.js";
import { getThread } from "./thread-store.js";
import { getPolish } from "./polish-store.js";
import { retryLastPolish, sendPolishFeedback } from "./polish-flow.js";
import { loadSettings, saveSettings } from "./settings-store.js";
import { getCurrentHotkeys, updateHotkeys } from "./hotkeys.js";
import { setModelOverride, testConnection } from "./llm/kimi.js";
import { setSettingsRecording } from "./settings-window.js";
import { friendlyError } from "./ui-errors.js";

/** Registers all renderer → main IPC. Called once at app ready. */
export function registerIpcHandlers(): void {
  ipcMain.on("note-dismiss", () => hideNote());
  ipcMain.on("note-retry", () => {
    // The retry button routes by which flow produced the last view.
    if (getLastViewContext()?.origin === "polish") {
      void retryLastPolish();
    } else {
      void retryLastInterpret();
    }
  });
  ipcMain.on("note-copy", (_event, text: string) => {
    clipboard.writeText(text);
  });
  ipcMain.on("note-send", (_event, draft: string) => {
    void sendDraft(draft);
  });
  ipcMain.handle("thread-get", () => getThread());

  // ---- Interactive polish (T-014) ----
  ipcMain.handle("polish-get", () => getPolish());
  ipcMain.on("polish-feedback", (_event, feedback: string) => {
    void sendPolishFeedback(feedback);
  });

  // ---- Settings (T-011) ----
  ipcMain.handle("settings-get", () => {
    const settings = loadSettings();
    return {
      // The effective runtime bindings — reality, not the stored file.
      hotkeys: getCurrentHotkeys(),
      model: settings.model,
      apiKeySet: Boolean(process.env.MOONSHOT_API_KEY),
    };
  });

  ipcMain.handle("settings-set-hotkeys", (_event, hotkeys) => {
    const report = updateHotkeys(hotkeys);
    // Persist the *effective* bindings (conflict keep-previous may differ).
    saveSettings({ ...loadSettings(), hotkeys: getCurrentHotkeys() });
    return report;
  });

  ipcMain.handle("settings-set-model", (_event, model: string | null) => {
    const normalized =
      typeof model === "string" && model.trim() !== "" ? model.trim() : null;
    setModelOverride(normalized);
    saveSettings({ ...loadSettings(), model: normalized });
  });

  ipcMain.handle("settings-test-connection", async () => {
    try {
      await testConnection();
      return { ok: true, message: "连接成功 ✓" };
    } catch (err) {
      return { ok: false, message: friendlyError(err) };
    }
  });

  ipcMain.on("settings-recording", (_event, active: boolean) => {
    setSettingsRecording(active === true);
  });
}

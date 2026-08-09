import { clipboard, ipcMain } from "electron";
import { hideNote } from "./note-window.js";
import { retryLastInterpret } from "./interpret-flow.js";
import { sendDraft } from "./reply-flow.js";
import { getThread } from "./thread-store.js";

/** Registers all renderer → main IPC. Called once at app ready. */
export function registerIpcHandlers(): void {
  ipcMain.on("note-dismiss", () => hideNote());
  ipcMain.on("note-retry", () => void retryLastInterpret());
  ipcMain.on("note-copy", (_event, text: string) => {
    clipboard.writeText(text);
  });
  ipcMain.on("note-send", (_event, draft: string) => {
    void sendDraft(draft);
  });
  ipcMain.handle("thread-get", () => getThread());
}

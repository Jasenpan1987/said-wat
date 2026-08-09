import { ipcMain } from "electron";
import { hideNote } from "./note-window.js";
import { retryLastInterpret } from "./interpret-flow.js";

/** Registers all renderer → main IPC. Called once at app ready. */
export function registerIpcHandlers(): void {
  ipcMain.on("note-dismiss", () => hideNote());
  ipcMain.on("note-retry", () => void retryLastInterpret());
}

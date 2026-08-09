import fs from "fs";
import path from "path";
import { app } from "electron";
import { DEFAULT_HOTKEYS } from "./hotkeys.js";
import type { HotkeyBindings } from "./hotkeys.js";

/**
 * Persisted user settings (T-011). model null = client default (kimi-k2.6).
 * The API key is deliberately NOT here — story 9: keys come from the
 * environment only, never from app config.
 */
export interface Settings {
  hotkeys: HotkeyBindings;
  model: string | null;
}

const DEFAULT_SETTINGS: Settings = {
  hotkeys: { ...DEFAULT_HOTKEYS },
  model: null,
};

// Computed lazily so load/save work in unit tests without an Electron runtime;
// the path default is only evaluated when a caller omits it.
function settingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

function normalizeHotkeys(value: unknown): HotkeyBindings {
  const fallback = { ...DEFAULT_HOTKEYS };
  if (typeof value !== "object" || value === null) return fallback;
  const v = value as { capture?: unknown; polish?: unknown };
  return {
    capture:
      typeof v.capture === "string" && v.capture.trim() !== ""
        ? v.capture.trim()
        : fallback.capture,
    polish:
      typeof v.polish === "string" && v.polish.trim() !== ""
        ? v.polish.trim()
        : fallback.polish,
  };
}

function normalizeModel(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** Reads persisted settings; a missing or corrupt file falls back to defaults. */
export function loadSettings(filePath = settingsPath()): Settings {
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<
        string,
        unknown
      >;
      return {
        hotkeys: normalizeHotkeys(data?.hotkeys),
        model: normalizeModel(data?.model),
      };
    }
  } catch {
    // Corrupt file — fall through to defaults.
  }
  return { ...DEFAULT_SETTINGS };
}

/** Persists settings to disk, creating the directory when needed. */
export function saveSettings(settings: Settings, filePath = settingsPath()): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
}

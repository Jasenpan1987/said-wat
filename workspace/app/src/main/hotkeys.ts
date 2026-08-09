import { globalShortcut } from "electron";
import type { HotkeyName, HotkeyReport } from "../shared/types.js";

export type { HotkeyReport } from "../shared/types.js";

export type HotkeyBindings = Record<HotkeyName, string>;

export interface HotkeyHandlers {
  onCapture: () => void;
  onPolish: () => void;
}

// macOS-only product; the default accelerators are the ones agreed in the
// requirements (G-001 resolved 2026-08-10: capture moved to Cmd+Shift+S —
// Cmd+Shift+W collided with WeChat on the builder's machine). "Command+W" is
// never registered anywhere — it stays the universal close-window shortcut.
export const DEFAULT_HOTKEYS: HotkeyBindings = {
  capture: "Command+Shift+S",
  polish: "Command+Shift+E",
};

let current: HotkeyBindings = { ...DEFAULT_HOTKEYS };
let handlers: HotkeyHandlers = { onCapture: () => {}, onPolish: () => {} };
const active = new Set<HotkeyName>();

function dispatch(name: HotkeyName, accelerator: string): boolean {
  return globalShortcut.register(accelerator, () => {
    if (name === "capture") {
      handlers.onCapture();
    } else {
      handlers.onPolish();
    }
  });
}

function registerOne(name: HotkeyName): { ok: boolean; reason?: string } {
  const accelerator = current[name];
  const ok = dispatch(name, accelerator);
  if (ok) {
    active.add(name);
    return { ok: true };
  }
  return { ok: false, reason: `accelerator "${accelerator}" is already in use` };
}

/** Sets the handlers that fire when a hotkey is pressed. */
export function setHandlers(next: HotkeyHandlers): void {
  handlers = next;
}

/**
 * First-run wiring: sets the handlers and registers the given bindings
 * (defaults when omitted). Returns the per-key registration report.
 */
export function initHotkeys(
  nextHandlers: HotkeyHandlers,
  bindings: HotkeyBindings = DEFAULT_HOTKEYS
): HotkeyReport {
  handlers = nextHandlers;
  return updateHotkeys(bindings);
}

/**
 * Applies a set of bindings with conflict-safe re-registration: the previous
 * accelerator is unregistered before the new one is tried, and if the new one
 * fails, the previous binding is restored. Returns a per-key report so callers
 * (settings, T-011) can surface conflicts in the UI.
 */
export function updateHotkeys(bindings: HotkeyBindings): HotkeyReport {
  const report: HotkeyReport = {};
  const previous = current;
  current = { ...bindings };

  for (const name of ["capture", "polish"] as const) {
    if (previous[name] !== current[name]) {
      globalShortcut.unregister(previous[name]);
      active.delete(name);
    }
    const result = registerOne(name);
    if (result.ok) {
      report[name] = result;
      continue;
    }
    // New accelerator is taken — restore the previous binding.
    current[name] = previous[name];
    const restored = dispatch(name, previous[name]);
    if (restored) {
      active.add(name);
      report[name] = {
        ok: false,
        reason: `"${bindings[name]}" is taken; kept "${previous[name]}"`,
      };
    } else {
      report[name] = {
        ok: false,
        reason: `"${bindings[name]}" is taken and "${previous[name]}" could not be restored`,
      };
    }
  }
  return report;
}

/** Unregisters every hotkey. Called on app quit. */
export function stopHotkeys(): void {
  globalShortcut.unregisterAll();
  active.clear();
}

/** The currently active bindings (after conflict keep-previous logic). */
export function getCurrentHotkeys(): HotkeyBindings {
  return { ...current };
}

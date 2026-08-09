import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// settings-store pulls DEFAULT_HOTKEYS from hotkeys.ts, which imports electron
// at module level — mock it so the import is safe in a node test runtime.
vi.mock("electron", () => ({
  app: { getPath: () => "/tmp" },
}));

import { loadSettings, saveSettings } from "./settings-store.js";
import { DEFAULT_HOTKEYS } from "./hotkeys.js";

function tmpFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "saidwat-settings-"));
  return path.join(dir, "settings.json");
}

describe("settings-store", () => {
  let file: string;
  beforeEach(() => {
    file = tmpFile();
  });

  it("falls back to defaults when no file exists", () => {
    const settings = loadSettings(file);
    expect(settings.hotkeys).toEqual(DEFAULT_HOTKEYS);
    expect(settings.model).toBeNull();
  });

  it("round-trips saved settings", () => {
    saveSettings(
      {
        hotkeys: { capture: "Command+Option+C", polish: "Command+Shift+E" },
        model: "kimi-k2.7-code",
      },
      file
    );
    const loaded = loadSettings(file);
    expect(loaded.hotkeys).toEqual({
      capture: "Command+Option+C",
      polish: "Command+Shift+E",
    });
    expect(loaded.model).toBe("kimi-k2.7-code");
  });

  it("falls back to defaults on corrupt JSON", () => {
    fs.writeFileSync(file, "{ not json");
    const settings = loadSettings(file);
    expect(settings.hotkeys).toEqual(DEFAULT_HOTKEYS);
    expect(settings.model).toBeNull();
  });

  it("falls back per-field on invalid values", () => {
    fs.writeFileSync(
      file,
      JSON.stringify({ hotkeys: { capture: "  ", polish: 42 }, model: 7 })
    );
    const settings = loadSettings(file);
    expect(settings.hotkeys.capture).toBe(DEFAULT_HOTKEYS.capture);
    expect(settings.hotkeys.polish).toBe(DEFAULT_HOTKEYS.polish);
    expect(settings.model).toBeNull();
  });

  it("normalizes a blank model string to null", () => {
    fs.writeFileSync(file, JSON.stringify({ model: "  " }));
    expect(loadSettings(file).model).toBeNull();
  });

  it("creates the directory when saving", () => {
    const nested = path.join(path.dirname(file), "sub", "settings.json");
    saveSettings({ hotkeys: DEFAULT_HOTKEYS, model: null }, nested);
    expect(fs.existsSync(nested)).toBe(true);
  });
});

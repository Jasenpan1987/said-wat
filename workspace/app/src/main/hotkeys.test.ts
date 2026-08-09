import { describe, it, expect, beforeEach, vi } from "vitest";

// Fake globalShortcut: holds the current accelerator → callback map so tests
// can simulate the OS holding an accelerator and can press hotkeys directly.
const mockRegistrations = new Map<string, () => void>();

vi.mock("electron", () => ({
  globalShortcut: {
    register: (accelerator: string, callback: () => void) => {
      if (mockRegistrations.has(accelerator)) return false;
      mockRegistrations.set(accelerator, callback);
      return true;
    },
    unregister: (accelerator: string) => {
      mockRegistrations.delete(accelerator);
    },
    unregisterAll: () => {
      mockRegistrations.clear();
    },
    isRegistered: (accelerator: string) => mockRegistrations.has(accelerator),
  },
}));

import {
  DEFAULT_HOTKEYS,
  initHotkeys,
  setHandlers,
  stopHotkeys,
  updateHotkeys,
} from "./hotkeys.js";

function press(accelerator: string): void {
  const callback = mockRegistrations.get(accelerator);
  if (!callback) throw new Error(`not registered: ${accelerator}`);
  callback();
}

describe("hotkeys", () => {
  beforeEach(() => {
    mockRegistrations.clear();
    stopHotkeys();
  });

  it("registers the default capture/polish accelerators and never touches Command+W", () => {
    initHotkeys({ onCapture: () => {}, onPolish: () => {} });
    expect(mockRegistrations.has(DEFAULT_HOTKEYS.capture)).toBe(true);
    expect(mockRegistrations.has(DEFAULT_HOTKEYS.polish)).toBe(true);
    expect(mockRegistrations.has("Command+W")).toBe(false);
  });

  it("dispatches presses to the wired handlers", () => {
    const onCapture = vi.fn();
    const onPolish = vi.fn();
    initHotkeys({ onCapture, onPolish });

    press(DEFAULT_HOTKEYS.capture);
    press(DEFAULT_HOTKEYS.polish);

    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onPolish).toHaveBeenCalledTimes(1);
  });

  it("swaps handlers without touching registrations", () => {
    const first = vi.fn();
    const second = vi.fn();
    initHotkeys({ onCapture: first, onPolish: () => {} });
    setHandlers({ onCapture: second, onPolish: () => {} });

    press(DEFAULT_HOTKEYS.capture);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("re-registers an old accelerator out before the new one in", () => {
    initHotkeys({ onCapture: () => {}, onPolish: () => {} });
    const newBindings = {
      capture: "Command+Option+C",
      polish: "Command+Option+P",
    };

    const report = updateHotkeys(newBindings);

    expect(report.capture?.ok).toBe(true);
    expect(report.polish?.ok).toBe(true);
    expect(mockRegistrations.has(DEFAULT_HOTKEYS.capture)).toBe(false);
    expect(mockRegistrations.has("Command+Option+C")).toBe(true);
  });

  it("keeps the previous binding when the new accelerator is taken", () => {
    initHotkeys({ onCapture: () => {}, onPolish: () => {} });
    // Another app holds the requested new polish accelerator.
    mockRegistrations.set("Command+Option+P", () => {});

    const report = updateHotkeys({
      capture: "Command+Option+C",
      polish: "Command+Option+P",
    });

    expect(report.capture?.ok).toBe(true);
    expect(report.polish?.ok).toBe(false);
    expect(report.polish?.reason).toContain("kept");
    // Previous polish accelerator is still live and dispatchable.
    expect(mockRegistrations.has(DEFAULT_HOTKEYS.polish)).toBe(true);
    const onPolish = vi.fn();
    setHandlers({ onCapture: () => {}, onPolish });
    press(DEFAULT_HOTKEYS.polish);
    expect(onPolish).toHaveBeenCalledTimes(1);
  });

  it("reports a failure when the launch-time accelerator is already taken", () => {
    mockRegistrations.set(DEFAULT_HOTKEYS.polish, () => {});
    const report = initHotkeys({ onCapture: () => {}, onPolish: () => {} });

    expect(report.polish?.ok).toBe(false);
    expect(report.capture?.ok).toBe(true);
  });

  it("stopHotkeys unregisters everything", () => {
    initHotkeys({ onCapture: () => {}, onPolish: () => {} });
    stopHotkeys();
    expect(mockRegistrations.size).toBe(0);
  });
});

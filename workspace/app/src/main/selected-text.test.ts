import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ExecFileException } from "child_process";

// Mutable clipboard state so the simulated-Cmd+C poll can observe changes.
const mocks = vi.hoisted(() => {
  const state = {
    clipText: "",
    axOutput: "",
    clipboardHasImage: false,
    copyChangesClipboard: true,
  };
  return {
    state,
    execFile: vi.fn(
      (
        _cmd: string,
        args: string[],
        _opts: unknown,
        cb: (
          err: ExecFileException | null,
          stdout: string,
          stderr: string
        ) => void
      ) => {
        const script = args[1] ?? "";
        if (script.includes("keystroke")) {
          // A simulated Cmd+C: the frontmost app copies its selection over
          // the clipboard — unless the test simulates "no selection" by
          // leaving the clipboard unchanged.
          if (state.copyChangesClipboard) state.clipText = "copied-selection";
          cb(null, "", "");
          return;
        }
        cb(null, state.axOutput, "");
      }
    ),
  };
});

const { execFile: execFileMock, state } = mocks;

vi.mock("electron", () => ({
  systemPreferences: {
    isTrustedAccessibilityClient: vi.fn(() => true),
  },
  clipboard: {
    readText: vi.fn(() => mocks.state.clipText),
    writeText: vi.fn((t: string) => {
      mocks.state.clipText = t;
    }),
    readImage: vi.fn(() => ({ isEmpty: () => !mocks.state.clipboardHasImage })),
    writeImage: vi.fn(() => {
      mocks.state.clipText = "image-restored";
    }),
  },
  dialog: { showMessageBox: vi.fn() },
  shell: { openExternal: vi.fn() },
}));

vi.mock("child_process", () => ({
  execFile: mocks.execFile,
}));

import { systemPreferences, clipboard, dialog, shell } from "electron";
import {
  hasAccessibilityPermission,
  readSelectedText,
  showAccessibilityDialog,
} from "./selected-text.js";

describe("selected-text", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.clipText = "";
    state.axOutput = "";
    state.clipboardHasImage = false;
    state.copyChangesClipboard = true;
    vi.mocked(systemPreferences.isTrustedAccessibilityClient).mockReturnValue(
      true
    );
    vi.mocked(dialog.showMessageBox).mockResolvedValue({
      response: 1,
      checkboxChecked: false,
    });
  });

  it("hasAccessibilityPermission reflects systemPreferences", () => {
    expect(hasAccessibilityPermission()).toBe(true);
    vi.mocked(systemPreferences.isTrustedAccessibilityClient).mockReturnValue(
      false
    );
    expect(hasAccessibilityPermission()).toBe(false);
  });

  it("returns null without Accessibility permission and runs no osascript", async () => {
    vi.mocked(systemPreferences.isTrustedAccessibilityClient).mockReturnValue(
      false
    );
    expect(await readSelectedText()).toBeNull();
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("returns the AXSelectedText when the frontmost app exposes it", async () => {
    state.axOutput = "hello world";
    expect(await readSelectedText()).toBe("hello world");
    // AX path: clipboard is never read or written.
    expect(clipboard.readText).not.toHaveBeenCalled();
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it("trims the trailing newline osascript adds", async () => {
    state.axOutput = "hello world\n";
    expect(await readSelectedText()).toBe("hello world");
  });

  it("falls back to simulated Cmd+C when AX returns empty", async () => {
    state.clipText = "old-clipboard";
    state.axOutput = "";
    const result = await readSelectedText();
    expect(result).toBe("copied-selection");
    // The previous clipboard contents are restored.
    expect(clipboard.writeText).toHaveBeenCalledWith("old-clipboard");
    expect(state.clipText).toBe("old-clipboard");
  });

  it("returns null when there is no selection (clipboard unchanged)", async () => {
    state.clipText = "old-clipboard";
    state.copyChangesClipboard = false; // Cmd+C with no selection: no-op
    expect(await readSelectedText()).toBeNull();
    expect(state.clipText).toBe("old-clipboard");
  });

  it("restores an image clipboard after a simulated copy", async () => {
    state.clipText = ""; // an image clipboard reads as empty text
    state.clipboardHasImage = true;
    const result = await readSelectedText();
    expect(result).toBe("copied-selection");
    expect(clipboard.writeImage).toHaveBeenCalled();
    expect(state.clipText).toBe("image-restored");
  });

  it("falls back to simulated copy when the AX osascript call fails", async () => {
    state.axOutput = "";
    execFileMock.mockImplementationOnce(
      (
        _cmd: string,
        _args: string[],
        _opts: unknown,
        cb: (err: Error | null, stdout: string, stderr: string) => void
      ) => cb(new Error("osascript failed"), "", "")
    );
    expect(await readSelectedText()).toBe("copied-selection");
  });

  it("shows a dialog and opens Accessibility settings on confirm", async () => {
    vi.mocked(dialog.showMessageBox).mockResolvedValue({
      response: 0,
      checkboxChecked: false,
    });
    await showAccessibilityDialog();
    expect(dialog.showMessageBox).toHaveBeenCalled();
    expect(shell.openExternal).toHaveBeenCalledWith(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
    );
  });

  it("does not open settings when the user cancels", async () => {
    vi.mocked(dialog.showMessageBox).mockResolvedValue({
      response: 1,
      checkboxChecked: false,
    });
    await showAccessibilityDialog();
    expect(shell.openExternal).not.toHaveBeenCalled();
  });
});

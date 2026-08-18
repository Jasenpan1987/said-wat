import { execFile } from "child_process";
import { clipboard, dialog, shell, systemPreferences } from "electron";

// Flow A (Story 6): polish the text the user has *selected* in the frontmost
// app, so Cmd+Shift+E works without a preceding Cmd+C. macOS exposes another
// app's selection only through the Accessibility API; both strategies below
// go through `osascript` (System Events) and need Accessibility permission —
// checked via systemPreferences, not a native module (zero-native-deps).
//
// 1) AXSelectedText of the frontmost app's focused element — no side effects.
//    Fails (returns empty) in apps that don't expose the attribute, e.g. some
//    web views.
// 2) Simulated Cmd+C — universal: works wherever Cmd+C works (WeChat, Teams,
//    browsers, terminals). Briefly replaces the clipboard; the previous
//    contents (text or image) are restored before returning.

const AX_SELECTED_TEXT_SCRIPT = `
tell application "System Events"
    set frontApp to first application process whose frontmost is true
    set theText to ""
    try
        set focusedEl to value of attribute "AXFocusedUIElement" of frontApp
        set theText to value of attribute "AXSelectedText" of focusedEl
    end try
    return theText
end tell
`;

const SIMULATE_COPY_SCRIPT =
  'tell application "System Events" to keystroke "c" using command down';

// How long to wait for the frontmost app to put the selection on the
// clipboard after a simulated Cmd+C (most apps are instant; a few take a
// beat). If the clipboard never changes, there was no selection.
const COPY_POLL_MS = 40;
const COPY_POLL_MAX_MS = 500;

/** Whether this app may read other apps' selections (Accessibility TCC). */
export function hasAccessibilityPermission(): boolean {
  try {
    return systemPreferences.isTrustedAccessibilityClient(false);
  } catch {
    return false;
  }
}

function runOsascript(script: string): Promise<string> {
  // Explicit Promise wrapper rather than promisify(execFile): Node's
  // promisify uses a custom symbol for execFile that mocks don't replicate,
  // which silently broke the destructure below in tests.
  return new Promise((resolve) => {
    execFile(
      "osascript",
      ["-e", script],
      { timeout: 3000, killSignal: "SIGKILL" },
      (err, stdout) => {
        resolve(err ? "" : stdout.trim());
      }
    );
  });
}

/**
 * Reads the text currently selected in the frontmost app.
 * Returns null when: no Accessibility permission, nothing is selected, or the
 * read failed — never throws. Never leaves the clipboard modified.
 */
export async function readSelectedText(): Promise<string | null> {
  if (!hasAccessibilityPermission()) return null;
  const axText = await runOsascript(AX_SELECTED_TEXT_SCRIPT);
  if (axText) return axText;
  return readViaSimulatedCopy();
}

async function readViaSimulatedCopy(): Promise<string | null> {
  const savedText = clipboard.readText();
  const savedImage = clipboard.readImage();
  await runOsascript(SIMULATE_COPY_SCRIPT);
  try {
    // Poll until the clipboard changes (a real selection was copied) or the
    // window elapses (nothing selected — the clipboard still holds the old
    // contents, so there is nothing new to polish).
    const deadline = Date.now() + COPY_POLL_MAX_MS;
    while (Date.now() < deadline) {
      const current = clipboard.readText();
      if (current !== savedText) return current;
      await new Promise((resolve) => setTimeout(resolve, COPY_POLL_MS));
    }
    return null;
  } finally {
    restoreClipboard(savedText, savedImage);
  }
}

function restoreClipboard(text: string, image: Electron.NativeImage): void {
  if (!image.isEmpty()) {
    clipboard.writeImage(image);
  } else {
    clipboard.writeText(text);
  }
}

/**
 * Explains the Accessibility requirement and offers to open System Settings.
 * Called only when there is nothing on the clipboard either, so a user who
 * keeps using the old copy-first flow is never interrupted.
 */
export async function showAccessibilityDialog(): Promise<void> {
  const { response } = await dialog.showMessageBox({
    type: "warning",
    message: "said-wat 需要「辅助功能」权限",
    detail:
      "要直接润色你用鼠标选中的文字（免复制），said-wat 需要读取其他应用的选中内容。\n" +
      "请在 系统设置 → 隐私与安全性 → 辅助功能 中勾选 said-wat，然后重试。\n" +
      "（未开启时仍可先复制文字再按 Cmd+Shift+E。）",
    buttons: ["打开系统设置", "取消"],
    defaultId: 0,
    cancelId: 1,
  });
  if (response === 0) {
    void shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
    );
  }
}

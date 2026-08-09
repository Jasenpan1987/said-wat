import {
  BrowserWindow,
  desktopCapturer,
  dialog,
  ipcMain,
  screen,
  shell,
  systemPreferences,
} from "electron";
import type { NativeImage } from "electron";
import type { CaptureResult, Rect } from "../../shared/types.js";
import { clampToImage, toPhysicalRect } from "./crop.js";
import { createOverlayWindow } from "./overlay-window.js";

// A hotkey press while a capture is in flight is ignored (story 2 default),
// so an in-flight promise is reused instead of opening a second overlay.
let activeCapture: Promise<CaptureResult | null> | null = null;

interface DisplaySnapshot {
  display: Electron.Display;
  thumbnail: NativeImage;
}

/** Minimum selection (DIPs) below which a drag counts as a click → cancel. */
const MIN_SELECTION = 3;

/**
 * Opens the WeChat-style capture overlay. Resolves with the cropped region as
 * a PNG base64 string, or null when the user cancels or permission is missing.
 */
export function startCapture(): Promise<CaptureResult | null> {
  if (activeCapture) return activeCapture;
  activeCapture = doCapture().finally(() => {
    activeCapture = null;
  });
  return activeCapture;
}

async function doCapture(): Promise<CaptureResult | null> {
  if (!(await ensureScreenPermission())) {
    return null;
  }

  const displays = screen.getAllDisplays();
  const cursorPoint = screen.getCursorScreenPoint();
  const cursorDisplay = screen.getDisplayNearestPoint(cursorPoint);

  // One thumbnailSize applies to every source; scale is derived per display
  // from the actual snapshot size, so mixed-scale setups stay correct.
  const thumbnailSize = {
    width: Math.round(cursorDisplay.size.width * cursorDisplay.scaleFactor),
    height: Math.round(cursorDisplay.size.height * cursorDisplay.scaleFactor),
  };
  const sources = await desktopCapturer
    .getSources({ types: ["screen"], thumbnailSize })
    .catch(() => null);
  if (!sources) {
    // getSources throws when screen recording is unavailable (denied or the
    // system prompt was declined) — treat it like missing permission.
    await showPermissionDialog();
    return null;
  }

  const snapshots = new Map<number, DisplaySnapshot>();
  for (const display of displays) {
    const source =
      sources.find((s) => s.display_id === String(display.id)) ??
      sources.find((s) => s.id === `screen:${display.id}`);
    if (source && !source.thumbnail.isEmpty()) {
      snapshots.set(display.id, { display, thumbnail: source.thumbnail });
    }
  }

  if (snapshots.size === 0) {
    await showPermissionDialog();
    return null;
  }

  // The interactive window is the one on the cursor's display; fall back to
  // the first available snapshot if that display failed to capture.
  const interactiveDisplayId = snapshots.has(cursorDisplay.id)
    ? cursorDisplay.id
    : snapshots.keys().next().value as number;

  return new Promise<CaptureResult | null>((resolve) => {
    let settled = false;

    const windows = new Map<BrowserWindow, number>();
    for (const [displayId, snap] of snapshots) {
      const win = createOverlayWindow(snap.display);
      windows.set(win, displayId);
      win.webContents.once("did-finish-load", () => {
        win.webContents.send("capture-init", {
          displayId,
          dataUrl: snap.thumbnail.toDataURL(),
          imageWidth: snap.display.size.width,
          imageHeight: snap.display.size.height,
          scaleFactor: snap.display.scaleFactor,
          interactive: displayId === interactiveDisplayId,
        });
      });
      // A window closed out-of-band (never expected in normal use) must not
      // leave the capture promise hanging.
      win.on("closed", () => finish(null));
    }

    const finish = (result: CaptureResult | null) => {
      if (settled) return;
      settled = true;
      for (const win of windows.keys()) {
        if (!win.isDestroyed()) win.destroy();
      }
      cleanup();
      resolve(result);
    };

    const onConfirm = (
      _event: Electron.IpcMainEvent,
      payload: { displayId: number; rect: Rect }
    ) => {
      const snap = snapshots.get(payload.displayId);
      if (!snap) return; // unknown display — ignore, keep waiting
      if (payload.rect.width < MIN_SELECTION || payload.rect.height < MIN_SELECTION) {
        finish(null);
        return;
      }
      const imageSize = snap.thumbnail.getSize();
      const physical = clampToImage(
        toPhysicalRect(payload.rect, imageSize, snap.display.size),
        imageSize
      );
      if (physical.width === 0 || physical.height === 0) {
        finish(null);
        return;
      }
      const cropped = snap.thumbnail.crop(physical);
      if (cropped.isEmpty()) {
        finish(null);
        return;
      }
      finish({
        base64: cropped.toPNG().toString("base64"),
        mimeType: "image/png",
        rect: payload.rect,
        displayId: payload.displayId,
      });
    };
    const onCancel = () => finish(null);

    ipcMain.on("capture-confirm", onConfirm);
    ipcMain.on("capture-cancel", onCancel);
    const cleanup = () => {
      ipcMain.removeListener("capture-confirm", onConfirm);
      ipcMain.removeListener("capture-cancel", onCancel);
    };

    for (const [win, displayId] of windows) {
      win.show();
      if (displayId === interactiveDisplayId) {
        win.focus();
        win.webContents.focus();
      }
    }
  });
}

/**
 * Ensures Screen Recording permission. Returns false (and shows guidance)
 * when the permission is denied; when undetermined, getSources triggers the
 * system prompt and this returns true so the overlay can open either way.
 */
async function ensureScreenPermission(): Promise<boolean> {
  let status: string | undefined;
  try {
    status = systemPreferences.getMediaAccessStatus("screen");
  } catch {
    status = undefined; // pre-10.15 or non-macOS — defer to the thumbnail check
  }
  if (status === "denied" || status === "restricted") {
    await showPermissionDialog();
    return false;
  }
  return true;
}

async function showPermissionDialog(): Promise<void> {
  const { response } = await dialog.showMessageBox({
    type: "warning",
    message: "said-wat needs Screen Recording permission",
    detail:
      "To capture a screen region, said-wat must be allowed to record the screen. " +
      "Open System Settings → Privacy & Security → Screen Recording, enable it " +
      "for said-wat, then try the capture hotkey again.",
    buttons: ["Open System Settings", "Cancel"],
    defaultId: 0,
    cancelId: 1,
  });
  if (response === 0) {
    void shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
    );
  }
}

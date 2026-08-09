import { BrowserWindow } from "electron";
import path from "path";

/**
 * Fullscreen, frameless, always-on-top overlay window for one display. It
 * shows the dimmed snapshot and, on the cursor's display, hosts the drag
 * selection. Windows are created hidden; the caller shows them once all are
 * ready and focuses the interactive one.
 */
export function createOverlayWindow(display: Electron.Display): BrowserWindow {
  const win = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    backgroundColor: "#000000",
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    enableLargerThanScreen: true,
    show: false,
    webPreferences: {
      // This module compiles to dist/main/capture/ — one level up for the
      // shared preload, two for the renderer output.
      preload: path.join(import.meta.dirname, "../preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Above everything, including fullscreen apps and the Mission Control bar.
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  void win.loadFile(path.join(import.meta.dirname, "../../renderer/overlay.html"));
  return win;
}

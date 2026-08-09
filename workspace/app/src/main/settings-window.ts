import { BrowserWindow } from "electron";
import path from "path";

const WIDTH = 480;
const HEIGHT = 500;

let settingsWindow: BrowserWindow | null = null;

// While a hotkey is being recorded, the recorder needs the raw keystroke —
// the default application menu would otherwise close (⌘W), quit (⌘Q) or
// reload (⌘R) the window on exactly the combos we want to capture/reject.
let blockLifecycleKeys = false;

/** Set while the settings renderer is capturing a hotkey combo (T-011). */
export function setSettingsRecording(active: boolean): void {
  blockLifecycleKeys = active;
}

/** Opens (or focuses) the settings window. Called from the tray menu. */
export function showSettingsWindow(): void {
  const win = getOrCreateSettingsWindow();
  win.show();
  win.focus();
}

function getOrCreateSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) return settingsWindow;

  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    resizable: false,
    minimizable: false,
    fullscreenable: false,
    title: "设置",
    show: false,
    webPreferences: {
      preload: path.join(import.meta.dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.on("before-input-event", (event, input) => {
    if (blockLifecycleKeys && input.type === "keyDown" && input.meta) {
      if (input.key === "w" || input.key === "q" || input.key === "r") {
        event.preventDefault();
      }
    }
  });

  win.on("closed", () => {
    settingsWindow = null;
  });

  void win.loadFile(path.join(import.meta.dirname, "../renderer/settings.html"));

  settingsWindow = win;
  return win;
}

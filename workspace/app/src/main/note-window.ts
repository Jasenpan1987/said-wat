import { BrowserWindow, screen } from "electron";
import path from "path";
import type { NoteShowPayload, NoteView, Rect } from "../shared/types.js";

const WIDTH = 420;
const HEIGHT = 540;
const GAP = 12;

/** Which flow produced the current note content (retry routing). */
export type NoteViewOrigin = "interpret" | "polish";

let noteWindow: BrowserWindow | null = null;
let pendingPayload: NoteShowPayload | null = null;
let pendingShow = false;
let lastView: { kind: NoteView["kind"]; origin: NoteViewOrigin | null } | null = null;

/** Where the note's retry button should route (T-014). */
export function getLastViewContext(): {
  kind: NoteView["kind"];
  origin: NoteViewOrigin | null;
} | null {
  return lastView;
}

/**
 * Shows the sticky-note popup with the given content. A single window is
 * reused across flows (capture/interpret, polish, reply) and across note
 * close/reopen within the session.
 */
export function showNote(
  payload: NoteShowPayload,
  options: { rect?: Rect; displayId?: number; origin?: NoteViewOrigin } = {}
): void {
  lastView = { kind: payload.view.kind, origin: options.origin ?? null };
  const win = getOrCreateNoteWindow();
  if (options.rect !== undefined) {
    positionNear(win, options.rect, options.displayId);
  }
  if (win.webContents.isLoading()) {
    pendingPayload = payload;
    pendingShow = true;
    return;
  }
  win.webContents.send("note-show", payload);
  if (!win.isVisible()) {
    // First show must not steal keyboard focus from the app underneath
    // (story 5); the note takes focus once the user interacts with it.
    win.showInactive();
  }
}

function getOrCreateNoteWindow(): BrowserWindow {
  if (noteWindow && !noteWindow.isDestroyed()) return noteWindow;

  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(import.meta.dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setAlwaysOnTop(true, "floating");
  win.on("closed", () => {
    noteWindow = null;
  });
  win.webContents.once("did-finish-load", () => {
    if (pendingPayload) {
      win.webContents.send("note-show", pendingPayload);
      pendingPayload = null;
    }
    if (pendingShow) {
      win.showInactive();
      pendingShow = false;
    }
  });
  void win.loadFile(path.join(import.meta.dirname, "../renderer/index.html"));

  noteWindow = win;
  return win;
}

/** Places the window next to a screen region on its display, never on top. */
function positionNear(win: BrowserWindow, rect: Rect, displayId?: number): void {
  const display =
    screen.getAllDisplays().find((d) => d.id === displayId) ??
    screen.getDisplayNearestPoint({ x: rect.x, y: rect.y });
  const wa = display.workArea;
  const [width, height] = win.getSize();

  // Prefer the right side of the selection, then the left, then clamp.
  let x = rect.x + rect.width + GAP;
  if (x + width > wa.x + wa.width) {
    x = rect.x - width - GAP;
  }
  x = Math.max(x, wa.x);
  let y = rect.y;
  y = Math.min(Math.max(y, wa.y), wa.y + wa.height - height);

  win.setPosition(Math.round(x), Math.round(y));
}

export function hideNote(): void {
  if (noteWindow && !noteWindow.isDestroyed()) noteWindow.hide();
}

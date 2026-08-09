// Shared types between main, preload and renderer.

/** The three-section screenshot interpretation (Story 4). */
export interface InterpretResult {
  translation: string;
  summary: string;
  notablePoints: string;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Result of a completed capture, ready to hand to the LLM (T-008). */
export interface CaptureResult {
  base64: string;
  mimeType: "image/png";
  /** Logical (DIP) rect on the source display. */
  rect: Rect;
  displayId: number;
}

/** Sent main → overlay renderer once its snapshot is ready. */
export interface OverlayInitPayload {
  displayId: number;
  /** PNG data URL of the full display snapshot. */
  dataUrl: string;
  /** Display size in DIPs — the image is shown at this size. */
  imageWidth: number;
  imageHeight: number;
  scaleFactor: number;
  /** Whether this window accepts drag selection (cursor's display). */
  interactive: boolean;
}

export interface CaptureConfirmPayload {
  displayId: number;
  rect: Rect;
}

/** Content shown in the sticky note. */
export type NoteView =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "analysis"; analysis: InterpretResult };

/** Sent main → note renderer whenever the note content changes. */
export interface NoteShowPayload {
  view: NoteView;
}

/** API exposed by the preload under `window.electronAPI`. */
export interface ElectronAPI {
  capture: {
    confirm: (payload: CaptureConfirmPayload) => void;
    cancel: () => void;
    /** Tells main the overlay mounted and got its init payload. */
    ready: () => void;
    /** Subscribe to the overlay init payload; returns an unsubscribe fn. */
    onInit: (callback: (payload: OverlayInitPayload) => void) => () => void;
  };
  note: {
    /** Subscribe to note content updates; returns an unsubscribe fn. */
    onShow: (callback: (payload: NoteShowPayload) => void) => () => void;
    /** Dismiss the note (✕ or Esc in the note). */
    dismiss: () => void;
    /** Retry the last failed analysis (wired up in T-008). */
    retry: () => void;
  };
}

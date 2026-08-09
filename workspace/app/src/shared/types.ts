// Shared types between main, preload and renderer.

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

/** API exposed by the preload under `window.electronAPI`. */
export interface ElectronAPI {
  capture: {
    confirm: (payload: CaptureConfirmPayload) => void;
    cancel: () => void;
    /** Subscribe to the overlay init payload; returns an unsubscribe fn. */
    onInit: (callback: (payload: OverlayInitPayload) => void) => () => void;
  };
}

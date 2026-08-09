import type { Rect } from "../../shared/types.js";

export interface Size {
  width: number;
  height: number;
}

/**
 * Converts a logical (DIP) rect into the snapshot's pixel space. The
 * desktopCapturer snapshot may be at a different resolution than the display
 * (per-display scaling), so the scale is derived from the actual image size.
 */
export function toPhysicalRect(
  rect: Rect,
  imageSize: Size,
  displaySize: Size
): Rect {
  const scaleX = imageSize.width / displaySize.width;
  const scaleY = imageSize.height / displaySize.height;
  return {
    x: Math.round(rect.x * scaleX),
    y: Math.round(rect.y * scaleY),
    width: Math.round(rect.width * scaleX),
    height: Math.round(rect.height * scaleY),
  };
}

/** Clamps a rect so it lies fully inside the image. */
export function clampToImage(rect: Rect, imageSize: Size): Rect {
  const left = Math.min(Math.max(rect.x, 0), imageSize.width);
  const top = Math.min(Math.max(rect.y, 0), imageSize.height);
  const right = Math.min(Math.max(rect.x + rect.width, 0), imageSize.width);
  const bottom = Math.min(Math.max(rect.y + rect.height, 0), imageSize.height);
  return {
    x: left,
    y: top,
    width: Math.max(right - left, 0),
    height: Math.max(bottom - top, 0),
  };
}

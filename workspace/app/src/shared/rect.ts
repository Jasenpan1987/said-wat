import type { Rect } from "./types.js";

export interface Point {
  x: number;
  y: number;
}

/** Clamps a point into the bounds (0..width/height). */
export function clampPoint(point: Point, bounds: Rect): Point {
  return {
    x: Math.min(Math.max(point.x, 0), Math.max(bounds.width, 0)),
    y: Math.min(Math.max(point.y, 0), Math.max(bounds.height, 0)),
  };
}

/**
 * Normalizes a drag from two (possibly reversed) points into a rect,
 * clamped to the bounds. Used by the overlay while dragging.
 */
export function normalizeRect(a: Point, b: Point, bounds: Rect): Rect {
  const start = clampPoint(a, bounds);
  const end = clampPoint(b, bounds);
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

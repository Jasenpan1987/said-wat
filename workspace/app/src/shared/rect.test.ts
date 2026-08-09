import { describe, it, expect } from "vitest";
import { normalizeRect, clampPoint } from "./rect.js";

describe("normalizeRect", () => {
  const bounds = { x: 0, y: 0, width: 100, height: 200 };

  it("returns the rect in normalized order for a reversed drag", () => {
    const rect = normalizeRect({ x: 80, y: 120 }, { x: 20, y: 40 }, bounds);
    expect(rect).toEqual({ x: 20, y: 40, width: 60, height: 80 });
  });

  it("clamps start and end into the bounds", () => {
    const rect = normalizeRect({ x: -10, y: 190 }, { x: 150, y: 250 }, bounds);
    expect(rect).toEqual({ x: 0, y: 190, width: 100, height: 10 });
  });

  it("handles a zero-size drag", () => {
    const rect = normalizeRect({ x: 50, y: 50 }, { x: 50, y: 50 }, bounds);
    expect(rect).toEqual({ x: 50, y: 50, width: 0, height: 0 });
  });
});

describe("clampPoint", () => {
  it("clamps negatives and overflows", () => {
    expect(clampPoint({ x: -5, y: 500 }, { x: 0, y: 0, width: 100, height: 200 })).toEqual({
      x: 0,
      y: 200,
    });
  });
});

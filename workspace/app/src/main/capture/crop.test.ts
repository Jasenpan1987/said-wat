import { describe, it, expect } from "vitest";
import { toPhysicalRect, clampToImage } from "./crop.js";

describe("toPhysicalRect", () => {
  it("scales a DIP rect by the image/display ratio", () => {
    // 2x retina: 100 DIPs wide display, 200px snapshot
    const phys = toPhysicalRect(
      { x: 10, y: 20, width: 30, height: 40 },
      { width: 200, height: 400 },
      { width: 100, height: 200 }
    );
    expect(phys).toEqual({ x: 20, y: 40, width: 60, height: 80 });
  });

  it("rounds fractional pixels", () => {
    const phys = toPhysicalRect(
      { x: 3, y: 3, width: 5, height: 5 },
      { width: 99, height: 99 },
      { width: 100, height: 100 }
    );
    expect(phys.x).toBe(3);
    expect(phys.width).toBe(5);
  });

  it("is identity when image and display share size", () => {
    const phys = toPhysicalRect(
      { x: 5, y: 6, width: 7, height: 8 },
      { width: 100, height: 100 },
      { width: 100, height: 100 }
    );
    expect(phys).toEqual({ x: 5, y: 6, width: 7, height: 8 });
  });
});

describe("clampToImage", () => {
  const image = { width: 100, height: 100 };

  it("keeps a fully inside rect unchanged", () => {
    expect(clampToImage({ x: 10, y: 10, width: 50, height: 50 }, image)).toEqual({
      x: 10,
      y: 10,
      width: 50,
      height: 50,
    });
  });

  it("clamps an overflowing rect", () => {
    expect(clampToImage({ x: 80, y: 90, width: 50, height: 50 }, image)).toEqual({
      x: 80,
      y: 90,
      width: 20,
      height: 10,
    });
  });

  it("zeroes a fully outside rect", () => {
    expect(clampToImage({ x: 200, y: 200, width: 50, height: 50 }, image)).toEqual({
      x: 100,
      y: 100,
      width: 0,
      height: 0,
    });
  });
});

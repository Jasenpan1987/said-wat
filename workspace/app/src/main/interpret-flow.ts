import { readFileSync } from "node:fs";
import path from "node:path";
import { nativeImage, screen } from "electron";
import type { CaptureResult, Rect } from "../shared/types.js";
import { interpretImage } from "./llm/kimi.js";
import { showNote } from "./note-window.js";
import { pushSession } from "./reply-flow.js";
import { setThreadRoot } from "./thread-store.js";
import { friendlyError } from "./ui-errors.js";

// Optional model knob via env (defaults to the client's kimi-k2.6). Lets you
// try kimi-k3 or another model without a settings window: SAIDWAT_MODEL=kimi-k3
function modelFromEnv(): string | undefined {
  const model = process.env.SAIDWAT_MODEL;
  return model && model.trim() !== "" ? model.trim() : undefined;
}

// Screenshot interpretations are the slow path (a retina capture can take
// 30s+ at full size). The vision model reads text, not pixels — 1024px on
// the long edge keeps chat bubbles legible while cutting upload + vision
// time to ~1/3 of the original (measured 2026-08-10).
const MAX_IMAGE_DIM = 1024;

/**
 * Downsizes an over-large captured PNG before it goes to the vision model.
 * Returns the original base64 untouched when already within the limit.
 */
export function downscaleForVision(base64: string): string {
  const img = nativeImage.createFromBuffer(Buffer.from(base64, "base64"));
  if (img.isEmpty()) return base64;
  const { width, height } = img.getSize();
  if (Math.max(width, height) <= MAX_IMAGE_DIM) return base64;
  const resized = img.resize(
    width >= height ? { width: MAX_IMAGE_DIM } : { height: MAX_IMAGE_DIM }
  );
  return resized.toPNG().toString("base64");
}

let lastImage: { base64: string; mimeType: string; rect: Rect; displayId: number } | null =
  null;

/**
 * Story 4 wiring: capture confirmed → loading note → Kimi interpretation →
 * the note becomes a reply workspace rooted at the analysis; on failure a
 * friendly error + retry.
 */
export async function runInterpretFlow(result: CaptureResult): Promise<void> {
  lastImage = {
    base64: result.base64,
    mimeType: result.mimeType,
    rect: result.rect,
    displayId: result.displayId,
  };
  showNote(
    { view: { kind: "loading", label: "分析中" } },
    { rect: result.rect, displayId: result.displayId }
  );
  try {
    const analysis = await interpretImage(downscaleForVision(result.base64), result.mimeType, {
      model: modelFromEnv(),
    });
    setThreadRoot(analysis);
    pushSession();
  } catch (err) {
    showNote(
      { view: { kind: "error", message: friendlyError(err) } },
      { rect: result.rect, displayId: result.displayId }
    );
  }
}

/** Retry (note's retry button): re-send the last captured image. */
export async function retryLastInterpret(): Promise<void> {
  if (!lastImage) return;
  showNote({ view: { kind: "loading", label: "分析中" } });
  try {
    const analysis = await interpretImage(downscaleForVision(lastImage.base64), lastImage.mimeType, {
      model: modelFromEnv(),
    });
    setThreadRoot(analysis);
    pushSession();
  } catch (err) {
    showNote({ view: { kind: "error", message: friendlyError(err) } });
  }
}

/**
 * Demo trigger (SAIDWAT_DEMO=1): analyzes the bundled sample chat screenshot
 * through the real pipeline — same loading → analysis → note loop, no Screen
 * Recording permission required.
 */
export async function runDemoFlow(): Promise<void> {
  const file = path.join(import.meta.dirname, "../renderer/assets/sample-chat.png");
  const display = screen.getPrimaryDisplay();
  const work = display.workArea;
  await runInterpretFlow({
    base64: readFileSync(file).toString("base64"),
    mimeType: "image/png",
    rect: {
      x: Math.round(work.x + work.width * 0.35),
      y: Math.round(work.y + work.height * 0.25),
      width: 1,
      height: 1,
    },
    displayId: display.id,
  });
}

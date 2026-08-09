import { readFileSync } from "node:fs";
import path from "node:path";
import { screen } from "electron";
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
    const analysis = await interpretImage(result.base64, result.mimeType, {
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
    const analysis = await interpretImage(lastImage.base64, lastImage.mimeType, {
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

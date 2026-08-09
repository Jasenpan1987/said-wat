import { readFileSync } from "node:fs";
import path from "node:path";
import { screen } from "electron";
import type { CaptureResult, Rect } from "../shared/types.js";
import { LlmError, interpretImage } from "./llm/kimi.js";
import { showNote } from "./note-window.js";

// Optional model knob via env (defaults to the client's kimi-k2.6). Lets you
// try kimi-k3 or another model without a settings window: SAIDWAT_MODEL=kimi-k3
function modelFromEnv(): string | undefined {
  const model = process.env.SAIDWAT_MODEL;
  return model && model.trim() !== "" ? model.trim() : undefined;
}

let lastImage: { base64: string; mimeType: string; rect: Rect; displayId: number } | null =
  null;

/** Maps an LLM failure to a readable Chinese message for the note. */
export function friendlyError(err: unknown): string {
  if (err instanceof LlmError) {
    switch (err.code) {
      case "missing-key":
        return "未设置 MOONSHOT_API_KEY。请在项目根目录的 .env 中填入 key 后重试。";
      case "auth":
        return "API Key 无效或已过期。请检查 .env 中的 MOONSHOT_API_KEY。";
      case "network":
        return "网络错误，无法连接 Moonshot API。请检查网络后重试。";
      case "rate-limit":
        return "请求频率超限，请稍等几秒再试。";
      case "bad-response":
        return "模型返回的内容无法解析，请重试。";
      case "bad-input":
        return "没有可分析的内容。";
      default:
        return `发生未知错误：${err.message}`;
    }
  }
  return `发生未知错误：${err instanceof Error ? err.message : String(err)}`;
}

/**
 * Story 4 wiring: capture confirmed → loading note → Kimi interpretation →
 * three-section analysis in the note; on failure a friendly error + retry.
 */
export async function runInterpretFlow(result: CaptureResult): Promise<void> {
  lastImage = {
    base64: result.base64,
    mimeType: result.mimeType,
    rect: result.rect,
    displayId: result.displayId,
  };
  showNote({ view: { kind: "loading" } }, { rect: result.rect, displayId: result.displayId });
  try {
    const analysis = await interpretImage(result.base64, result.mimeType, {
      model: modelFromEnv(),
    });
    showNote({ view: { kind: "analysis", analysis } }, { rect: result.rect, displayId: result.displayId });
  } catch (err) {
    showNote({ view: { kind: "error", message: friendlyError(err) } }, { rect: result.rect, displayId: result.displayId });
  }
}

/** Retry (note's retry button): re-send the last captured image. */
export async function retryLastInterpret(): Promise<void> {
  if (!lastImage) return;
  showNote({ view: { kind: "loading" } });
  try {
    const analysis = await interpretImage(lastImage.base64, lastImage.mimeType, {
      model: modelFromEnv(),
    });
    showNote({ view: { kind: "analysis", analysis } });
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

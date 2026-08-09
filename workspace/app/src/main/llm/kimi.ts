import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import type { InterpretResult } from "../../shared/types.js";
import {
  INTERPRET_SYSTEM_PROMPT,
  POLISH_SYSTEM_PROMPT,
  REPLY_SYSTEM_PROMPT,
} from "./prompts.js";

export type { InterpretResult } from "../../shared/types.js";

export interface ReplyResult {
  answered: boolean;
  warning: string | null;
  reply: string;
}

export interface ThreadMessage {
  role: "user" | "assistant";
  content: string;
}

export type LlmErrorCode =
  | "missing-key"
  | "auth"
  | "network"
  | "rate-limit"
  | "bad-response"
  | "bad-input"
  | "unknown";

export class LlmError extends Error {
  constructor(
    public readonly code: LlmErrorCode,
    message: string
  ) {
    super(message);
    this.name = "LlmError";
  }
}

export const DEFAULT_MODEL = "kimi-k2.6";
export const FALLBACK_MODEL = "kimi-k2.7-code";
// The builder's account is on the Chinese Moonshot platform — keys from
// platform.moonshot.cn authenticate against api.moonshot.cn, not api.moonshot.ai
// (verified live 2026-08-10, G-002).
export const BASE_URL = "https://api.moonshot.cn/v1";
const TIMEOUT_MS = 60_000;

// Settings (T-011) will call setModelOverride; until then the default is used.
let modelOverride: string | null = null;

export function setModelOverride(model: string | null): void {
  modelOverride = model;
}

function getActiveModel(): string {
  return modelOverride ?? DEFAULT_MODEL;
}

// kimi-k2.6 has thinking on by default and must be explicitly disabled;
// kimi-k2.7-code cannot disable thinking, so the param is omitted there.
type ChatParams = ChatCompletionCreateParamsNonStreaming & {
  thinking?: { type: "enabled" | "disabled" };
};

function thinkingParam(model: string): ChatParams["thinking"] {
  return model === DEFAULT_MODEL ? { type: "disabled" } : undefined;
}

/** Reads the key at call time so setting it after launch needs no restart. */
function createClient(): OpenAI {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new LlmError(
      "missing-key",
      "MOONSHOT_API_KEY is not set. Export it in your environment (e.g. export MOONSHOT_API_KEY=...), then retry."
    );
  }
  return new OpenAI({ apiKey, baseURL: BASE_URL, timeout: TIMEOUT_MS });
}

export function mapError(err: unknown): LlmError {
  if (err instanceof LlmError) return err;
  const message = err instanceof Error ? err.message : String(err);
  if (typeof err === "object" && err !== null) {
    const e = err as { status?: number };
    if (e.status === 401) {
      return new LlmError(
        "auth",
        "Authentication failed — check that MOONSHOT_API_KEY is a valid Moonshot API key."
      );
    }
    if (e.status === 429) {
      return new LlmError("rate-limit", "Rate limited by the API — wait a moment and retry.");
    }
  }
  if (/ECONNREFUSED|ENOTFOUND|ENETUNREACH|ETIMEDOUT|fetch failed|network/i.test(message)) {
    return new LlmError("network", `Network error reaching ${BASE_URL} — check your connection.`);
  }
  return new LlmError("unknown", message);
}

async function complete(params: ChatParams): Promise<string> {
  const client = createClient();
  try {
    const response = await client.chat.completions.create(params);
    const content = response.choices[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new LlmError("bad-response", "The model returned an empty response.");
    }
    return content;
  } catch (err) {
    throw mapError(err);
  }
}

/** Extracts the first balanced JSON object, tolerating markdown fences. */
export function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = cleaned.slice(start, i + 1);
        try {
          const parsed = JSON.parse(candidate);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
          }
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

const SECTION_HEADERS: Array<[RegExp, keyof InterpretResult]> = [
  [/全文翻译|^翻译|full translation/i, "translation"],
  [/一句话总结|^总结|summary/i, "summary"],
  [/值得注意|^要点|notable/i, "notablePoints"],
];

/**
 * Parses the model's three-section output. Primary format is JSON; a markdown
 * "### header" layout is accepted as a fallback.
 */
export function parseInterpret(text: string): InterpretResult {
  const json = extractJson(text);
  if (json) {
    const result: InterpretResult = {
      translation: String(json.translation ?? "").trim(),
      summary: String(json.summary ?? "").trim(),
      notablePoints: String(json.notablePoints ?? "").trim(),
    };
    if (result.translation || result.summary || result.notablePoints) {
      return result;
    }
  }

  // Fallback: split on section headers, e.g. "### 全文翻译".
  const lines = text.split(/\r?\n/);
  const sections: Partial<InterpretResult> = {};
  let current: keyof InterpretResult | null = null;
  for (const line of lines) {
    const match = SECTION_HEADERS.find(([re]) => re.test(line));
    if (match) {
      current = match[1];
      sections[current] = line.replace(/#+\s*/, "").replace(/^[0-3][.、)]\s*/, "").trim();
      continue;
    }
    if (current && sections[current] !== undefined) {
      sections[current] += "\n" + line;
    }
  }
  if (sections.translation && sections.summary && sections.notablePoints) {
    return sections as InterpretResult;
  }
  throw new LlmError(
    "bad-response",
    "The model output could not be parsed into the three required sections."
  );
}

export function parseReply(text: string): ReplyResult {
  const json = extractJson(text);
  if (!json || typeof json.reply !== "string" || json.reply.trim() === "") {
    throw new LlmError(
      "bad-response",
      "The model output could not be parsed into a reply."
    );
  }
  return {
    answered: json.answered === true,
    warning:
      typeof json.warning === "string" && json.warning.trim() !== ""
        ? json.warning.trim()
        : null,
    reply: json.reply.trim(),
  };
}

export interface InterpretOptions {
  model?: string;
}

/**
 * Story 4 — vision call: interpret a captured region into the three sections.
 * `base64`/`mimeType` describe the cropped PNG from the capture overlay.
 */
export async function interpretImage(
  base64: string,
  mimeType: string,
  options: InterpretOptions = {}
): Promise<InterpretResult> {
  const model = options.model ?? getActiveModel();
  const content: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: INTERPRET_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64}` },
        },
        {
          type: "text",
          text: "请分析这张截图。",
        },
      ],
    },
  ];
  const text = await complete({
    model,
    messages: content,
    thinking: thinkingParam(model),
  });
  return parseInterpret(text);
}

/** Flow A — pure text polish; returns the polished string. */
export async function polishText(text: string): Promise<string> {
  if (text.trim() === "") {
    throw new LlmError("bad-input", "Nothing to polish — the text is empty.");
  }
  const model = getActiveModel();
  const result = await complete({
    model,
    messages: [
      { role: "system", content: POLISH_SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    thinking: thinkingParam(model),
  });
  return result.trim();
}

export interface ReplyContext {
  analysis: InterpretResult;
  thread: ThreadMessage[];
  draft: string;
}

/** Flow B — judged reply: analysis + thread + new draft → English reply. */
export async function replyWithContext({
  analysis,
  thread,
  draft,
}: ReplyContext): Promise<ReplyResult> {
  if (draft.trim() === "") {
    throw new LlmError("bad-input", "Nothing to send — the draft is empty.");
  }
  const model = getActiveModel();

  const contextBlock =
    `截图分析：\n` +
    `全文翻译：${analysis.translation}\n` +
    `一句话总结：${analysis.summary}\n` +
    `值得注意的点：${analysis.notablePoints}\n\n` +
    `之前的对话：\n` +
    (thread.length === 0
      ? "（无）"
      : thread.map((m) => `${m.role === "user" ? "用户" : "助手"}：${m.content}`).join("\n"));

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: REPLY_SYSTEM_PROMPT },
    {
      role: "user",
      content: `${contextBlock}\n\n用户的新消息：${draft}`,
    },
  ];

  const text = await complete({
    model,
    messages,
    thinking: thinkingParam(model),
  });
  return parseReply(text);
}

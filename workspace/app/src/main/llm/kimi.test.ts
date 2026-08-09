import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockCreate, mockClientOptions } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockClientOptions: [] as Array<Record<string, unknown>>,
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockCreate } };
    constructor(options: Record<string, unknown>) {
      mockClientOptions.push(options);
    }
  },
}));

import {
  DEFAULT_MODEL,
  FALLBACK_MODEL,
  LlmError,
  extractJson,
  interpretImage,
  parseInterpret,
  parseReply,
  polishText,
  replyWithContext,
  setModelOverride,
} from "./kimi.js";

const IMAGE = "aGVsbG8="; // "hello"
const FIXTURE = `{
  "translation": "翻译内容。",
  "summary": "一句话总结。",
  "notablePoints": "要点一；要点二。"
}`;

function stubResponse(content: string) {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content } }],
  });
}

describe("client setup", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockClientOptions.length = 0;
    setModelOverride(null);
    process.env.MOONSHOT_API_KEY = "test-key";
  });

  it("throws missing-key when the env var is absent", async () => {
    delete process.env.MOONSHOT_API_KEY;
    const err = await interpretImage(IMAGE, "image/png").catch((e) => e);
    expect(err).toBeInstanceOf(LlmError);
    expect(err.code).toBe("missing-key");
  });

  it("reads the key at call time (no restart needed when set later)", async () => {
    delete process.env.MOONSHOT_API_KEY;
    await expect(interpretImage(IMAGE, "image/png")).rejects.toMatchObject({
      code: "missing-key",
    });
    process.env.MOONSHOT_API_KEY = "later-key";
    stubResponse(FIXTURE);
    const result = await interpretImage(IMAGE, "image/png");
    expect(result.translation).toContain("翻译内容");
    expect(mockClientOptions[0].baseURL).toBe("https://api.moonshot.ai/v1");
    expect(mockClientOptions[0].apiKey).toBe("later-key");
  });

  it("sends the vision prompt with the default model and thinking disabled", async () => {
    stubResponse(FIXTURE);
    await interpretImage(IMAGE, "image/png");
    const params = mockCreate.mock.calls[0][0];
    expect(params.model).toBe(DEFAULT_MODEL);
    expect(params.thinking).toEqual({ type: "disabled" });
    expect(params.messages[0].role).toBe("system");
    const user = params.messages[1];
    expect(user.role).toBe("user");
    expect(user.content[0].type).toBe("image_url");
    expect(user.content[0].image_url.url).toBe("data:image/png;base64,aGVsbG8=");
  });

  it("uses the model override and omits the thinking param for kimi-k2.7-code", async () => {
    setModelOverride(FALLBACK_MODEL);
    stubResponse(FIXTURE);
    await interpretImage(IMAGE, "image/png");
    const params = mockCreate.mock.calls[0][0];
    expect(params.model).toBe(FALLBACK_MODEL);
    expect(params.thinking).toBeUndefined();
  });
});

describe("parseInterpret", () => {
  it("parses a clean JSON fixture into the three sections", () => {
    const result = parseInterpret(FIXTURE);
    expect(result).toEqual({
      translation: "翻译内容。",
      summary: "一句话总结。",
      notablePoints: "要点一；要点二。",
    });
  });

  it("tolerates markdown code fences", () => {
    const fenced = "```json\n" + FIXTURE + "\n```";
    expect(parseInterpret(fenced).translation).toContain("翻译内容");
  });

  it("falls back to ### section headers", () => {
    const markdown = `### 全文翻译\n翻译内容。\n### 一句话总结\n总结内容。\n### 值得注意的点\n要点内容。`;
    const result = parseInterpret(markdown);
    expect(result.translation).toContain("翻译内容");
    expect(result.summary).toContain("总结内容");
    expect(result.notablePoints).toContain("要点内容");
  });

  it("throws bad-response on garbage", () => {
    expect(() => parseInterpret("lorem ipsum dolor")).toThrow(LlmError);
    try {
      parseInterpret("lorem ipsum");
    } catch (e) {
      expect((e as LlmError).code).toBe("bad-response");
    }
  });
});

describe("parseReply", () => {
  it("parses an answered reply", () => {
    const result = parseReply(
      '{"answered": true, "warning": null, "reply": "Sure, I can do that."}'
    );
    expect(result).toEqual({
      answered: true,
      warning: null,
      reply: "Sure, I can do that.",
    });
  });

  it("parses an unanswered reply with a warning", () => {
    const result = parseReply(
      '{"answered": false, "warning": "可能没回答对方问的交付时间", "reply": "Here is the update."}'
    );
    expect(result.answered).toBe(false);
    expect(result.warning).toContain("交付时间");
  });

  it("throws bad-response when reply is missing", () => {
    expect(() => parseReply('{"answered": true}')).toThrow(LlmError);
  });
});

describe("error mapping", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    process.env.MOONSHOT_API_KEY = "test-key";
  });

  it("maps 401 to auth", async () => {
    mockCreate.mockRejectedValue({ status: 401, message: "unauthorized" });
    await expect(polishText("hello world")).rejects.toMatchObject({ code: "auth" });
  });

  it("maps 429 to rate-limit", async () => {
    mockCreate.mockRejectedValue({ status: 429, message: "slow down" });
    await expect(polishText("hello world")).rejects.toMatchObject({ code: "rate-limit" });
  });

  it("maps connection errors to network", async () => {
    mockCreate.mockRejectedValue(
      Object.assign(new Error("fetch failed: getaddrinfo ENOTFOUND api.moonshot.ai"), {
        code: "ENOTFOUND",
      })
    );
    await expect(polishText("hello world")).rejects.toMatchObject({ code: "network" });
  });

  it("keeps LlmError codes intact", async () => {
    const err = new LlmError("bad-input", "nope");
    mockCreate.mockRejectedValue(err);
    await expect(polishText("hello world")).rejects.toMatchObject({ code: "bad-input" });
  });
});

describe("method behaviour", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    process.env.MOONSHOT_API_KEY = "test-key";
  });

  it("polishText sends a text prompt and returns the trimmed polish", async () => {
    stubResponse("  This is the polished version.  ");
    const result = await polishText("this is the original");
    expect(result).toBe("This is the polished version.");
    const params = mockCreate.mock.calls[0][0];
    expect(params.messages[0].content).toContain("English writing assistant");
    expect(params.messages[1].content).toBe("this is the original");
  });

  it("polishText rejects empty input as bad-input", async () => {
    await expect(polishText("   ")).rejects.toMatchObject({ code: "bad-input" });
  });

  it("replyWithContext sends analysis + thread + draft and parses the reply", async () => {
    stubResponse('{"answered": true, "warning": null, "reply": "Sure!"}');
    const result = await replyWithContext({
      analysis: {
        translation: "对方问交付时间",
        summary: "s",
        notablePoints: "n",
      },
      thread: [{ role: "user", content: "hi" }, { role: "assistant", content: "hello" }],
      draft: "告诉他周五",
    });
    expect(result.reply).toBe("Sure!");
    const params = mockCreate.mock.calls[0][0];
    const userContent = params.messages[1].content as string;
    expect(userContent).toContain("对方问交付时间");
    expect(userContent).toContain("用户：hi");
    expect(userContent).toContain("助手：hello");
    expect(userContent).toContain("用户的新消息：告诉他周五");
  });

  it("replyWithContext rejects an empty draft as bad-input", async () => {
    await expect(
      replyWithContext({
        analysis: { translation: "t", summary: "s", notablePoints: "n" },
        thread: [],
        draft: "",
      })
    ).rejects.toMatchObject({ code: "bad-input" });
  });
});

describe("extractJson", () => {
  it("returns null for non-JSON", () => {
    expect(extractJson("no json here")).toBeNull();
  });

  it("extracts a JSON object from surrounding prose", () => {
    const out = extractJson('Sure! Here: {"a": 1, "b": "x"} — hope that helps');
    expect(out).toEqual({ a: 1, b: "x" });
  });

  it("handles nested braces inside strings", () => {
    const out = extractJson('{"text": "a {b} c", "n": 2}');
    expect(out).toEqual({ text: "a {b} c", n: 2 });
  });
});

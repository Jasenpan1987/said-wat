import { describe, it, expect, beforeEach } from "vitest";
import {
  appendMessage,
  clearThread,
  getThread,
  popMessage,
  setThreadRoot,
  threadForLlm,
  MAX_MESSAGES,
} from "./thread-store.js";

const ANALYSIS = { translation: "t", summary: "s", notablePoints: "n" };

describe("thread-store", () => {
  beforeEach(() => clearThread());

  it("returns null before any capture", () => {
    expect(getThread()).toBeNull();
  });

  it("roots a new conversation from a capture analysis", () => {
    setThreadRoot(ANALYSIS);
    const thread = getThread();
    expect(thread?.analysis).toEqual(ANALYSIS);
    expect(thread?.messages).toEqual([]);
    expect(thread?.truncated).toBe(false);
  });

  it("appends and returns messages in order", () => {
    setThreadRoot(ANALYSIS);
    appendMessage({ role: "user", content: "第一个草稿" });
    appendMessage({ role: "assistant", content: "Reply one", answered: true, warning: null });
    const thread = getThread();
    expect(thread?.messages.map((m) => m.content)).toEqual(["第一个草稿", "Reply one"]);
    expect(threadForLlm()).toEqual([
      { role: "user", content: "第一个草稿" },
      { role: "assistant", content: "Reply one" },
    ]);
  });

  it("caps long threads and flags truncation", () => {
    setThreadRoot(ANALYSIS);
    for (let i = 0; i < MAX_MESSAGES + 5; i++) {
      appendMessage({ role: "user", content: `m${i}` });
    }
    const thread = getThread();
    expect(thread?.messages.length).toBe(MAX_MESSAGES);
    expect(thread?.truncated).toBe(true);
    expect(thread?.messages[0].content).toBe("m5");
  });

  it("popMessage rolls back the last message", () => {
    setThreadRoot(ANALYSIS);
    appendMessage({ role: "user", content: "draft" });
    expect(popMessage()?.content).toBe("draft");
    expect(getThread()?.messages).toEqual([]);
  });

  it("setThreadRoot clears previous conversation", () => {
    setThreadRoot(ANALYSIS);
    appendMessage({ role: "user", content: "old" });
    setThreadRoot(ANALYSIS);
    expect(getThread()?.messages).toEqual([]);
  });
});

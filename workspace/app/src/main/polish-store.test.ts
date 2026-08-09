import { describe, it, expect, beforeEach } from "vitest";
import {
  appendRevision,
  clearPolish,
  getPolish,
  popRevision,
  startPolish,
} from "./polish-store.js";

describe("polish-store", () => {
  beforeEach(() => {
    clearPolish();
  });

  it("returns null before any session starts", () => {
    expect(getPolish()).toBeNull();
  });

  it("starts a session with the original and no revisions", () => {
    startPolish("hello world");
    expect(getPolish()).toEqual({
      original: "hello world",
      revisions: [],
      sending: false,
      error: null,
    });
  });

  it("accumulates feedback → revision rounds in order", () => {
    startPolish("hello world");
    appendRevision("", "Hello world.");
    appendRevision("语气太生硬", "Hi there!");
    const session = getPolish();
    expect(session?.revisions).toEqual([
      { feedback: "", text: "Hello world." },
      { feedback: "语气太生硬", text: "Hi there!" },
    ]);
  });

  it("a new start replaces the previous session", () => {
    startPolish("first");
    appendRevision("", "First.");
    startPolish("second");
    const session = getPolish();
    expect(session?.original).toBe("second");
    expect(session?.revisions).toEqual([]);
  });

  it("popRevision drops the latest round", () => {
    startPolish("t");
    appendRevision("", "A.");
    appendRevision("more", "B.");
    expect(popRevision()).toEqual({ feedback: "more", text: "B." });
    expect(getPolish()?.revisions).toEqual([{ feedback: "", text: "A." }]);
  });
});

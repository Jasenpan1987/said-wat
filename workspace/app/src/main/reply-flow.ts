import type { SessionState } from "../shared/types.js";
import { replyWithContext } from "./llm/kimi.js";
import { showNote } from "./note-window.js";
import {
  appendMessage,
  getThread,
  popMessage,
  threadForLlm,
} from "./thread-store.js";
import { friendlyError } from "./ui-errors.js";

/**
 * Pushes the current thread as the note's session view, merged with transient
 * UI flags (sending, sendError).
 */
export function pushSession(overrides: Partial<SessionState> = {}): void {
  const thread = getThread();
  if (!thread) return; // no analysis yet — nothing to show
  showNote({ view: { kind: "session", state: { ...thread, ...overrides } } });
}

/**
 * Flow B (Story 7): send a draft from the reply workspace. The draft is
 * appended to the thread, the reply appended on success; on failure the draft
 * is rolled back and the note keeps the text in the box (sendError shown).
 */
export async function sendDraft(draft: string): Promise<void> {
  const text = draft.trim();
  if (!text) {
    pushSession({ sending: false, sendError: "草稿为空，请先输入内容。" });
    return;
  }
  const thread = getThread();
  if (!thread) return; // no capture — nothing to reply to

  appendMessage({ role: "user", content: text });
  pushSession({ sending: true, sendError: null });
  try {
    const result = await replyWithContext({
      analysis: thread.analysis,
      thread: threadForLlm(),
      draft: text,
    });
    appendMessage({
      role: "assistant",
      content: result.reply,
      answered: result.answered,
      warning: result.warning,
    });
    pushSession({ sending: false, sendError: null });
  } catch (err) {
    popMessage(); // roll back the user message; the draft stays in the box
    pushSession({ sending: false, sendError: friendlyError(err) });
  }
}

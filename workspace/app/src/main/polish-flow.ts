import { clipboard } from "electron";
import type { PolishState } from "../shared/types.js";
import { polishText, polishWithFeedback } from "./llm/kimi.js";
import { showNote } from "./note-window.js";
import { appendRevision, getPolish, startPolish } from "./polish-store.js";
import { friendlyError } from "./ui-errors.js";

// The feedback of the in-flight revision round. Kept across a failure so the
// note's retry re-sends the exact same request without losing it.
let pendingFeedback: string | null = null;

function pushPolish(overrides: Partial<PolishState> = {}): void {
  const session = getPolish();
  if (!session) return; // no session — nothing to show
  showNote(
    { view: { kind: "polish", state: { ...session, ...overrides } } },
    { origin: "polish" }
  );
}

/**
 * Flow A (Story 6): polish hotkey → read the clipboard → Kimi polish →
 * the note shows the original + result + feedback box (T-014 interactive
 * revisions). A fresh press always starts a new session from the current
 * clipboard. Context-free by design — never joins a conversation thread.
 */
export async function runPolishFlow(): Promise<void> {
  const text = clipboard.readText();
  if (!text.trim()) {
    showNote({
      view: {
        kind: "error",
        message:
          "剪贴板为空或不是文本，无法润色。先复制一段英文，再按 Cmd+Shift+E。",
      },
    });
    return;
  }
  startPolish(text);
  pendingFeedback = null;
  pushPolish({ sending: true, error: null });
  try {
    const polished = await polishText(text);
    appendRevision("", polished);
    pushPolish({ sending: false, error: null });
  } catch (err) {
    // First-polish failure: the error view's retry re-runs this same step.
    showNote(
      { view: { kind: "error", message: friendlyError(err) } },
      { origin: "polish" }
    );
  }
}

/** Flow A revision round (T-014): user feedback → revised version. */
export async function sendPolishFeedback(feedback: string): Promise<void> {
  const session = getPolish();
  if (!session) return; // no session — nothing to revise
  const text = feedback.trim();
  if (!text) return; // renderer guards empty input with an inline hint
  pendingFeedback = text;
  pushPolish({ sending: true, error: null });
  try {
    const revised = await polishWithFeedback(
      session.original,
      session.revisions,
      text
    );
    appendRevision(text, revised);
    pendingFeedback = null;
    pushPolish({ sending: false, error: null });
  } catch (err) {
    pushPolish({ sending: false, error: friendlyError(err) });
  }
}

/** Re-runs the last polish step (note retry / inline error retry). */
export async function retryLastPolish(): Promise<void> {
  const session = getPolish();
  if (!session) return;
  if (pendingFeedback) {
    await sendPolishFeedback(pendingFeedback);
    return;
  }
  if (session.revisions.length === 0) {
    // First polish failed — retry with the same original (clipboard may
    // have changed since; don't re-read it).
    pushPolish({ sending: true, error: null });
    try {
      const polished = await polishText(session.original);
      appendRevision("", polished);
      pushPolish({ sending: false, error: null });
    } catch (err) {
      showNote(
        { view: { kind: "error", message: friendlyError(err) } },
        { origin: "polish" }
      );
    }
  }
}

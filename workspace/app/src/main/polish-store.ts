import type { PolishRevision, PolishState } from "../shared/types.js";

// In-memory interactive polish session (T-014). Lives for the app session,
// independent of the capture thread; cleared on a new Cmd+Shift+E and on
// quit. Nothing is ever written to disk.
let original: string | null = null;
let revisions: PolishRevision[] = [];

/** A new polish hotkey press starts a fresh session (previous history dropped). */
export function startPolish(text: string): void {
  original = text;
  revisions = [];
}

/** Appends one successful feedback → revision round. */
export function appendRevision(feedback: string, text: string): void {
  revisions.push({ feedback, text });
}

/** Drops the last revision (used when a round fails to roll back). */
export function popRevision(): PolishRevision | undefined {
  return revisions.pop();
}

export function clearPolish(): void {
  original = null;
  revisions = [];
}

export function getPolish(): PolishState | null {
  if (!original) return null;
  return { original, revisions: [...revisions], sending: false, error: null };
}

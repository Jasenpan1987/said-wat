import type {
  InterpretResult,
  SessionMessage,
  SessionState,
} from "../shared/types.js";

// In-memory conversation store (Story 8). Lives for the app session; cleared
// on a new capture and on quit. Nothing is ever written to disk.
export const MAX_MESSAGES = 20;

let analysis: InterpretResult | null = null;
let messages: SessionMessage[] = [];
let truncated = false;

/** A new capture roots a fresh conversation (previous thread cleared). */
export function setThreadRoot(next: InterpretResult): void {
  analysis = next;
  messages = [];
  truncated = false;
}

export function appendMessage(message: SessionMessage): void {
  messages.push(message);
  if (messages.length > MAX_MESSAGES) {
    // Cap long threads: keep the earliest turns within the cap, note it.
    messages = messages.slice(-MAX_MESSAGES);
    truncated = true;
  }
}

/** Drops the last message (used to roll back an unsent draft on failure). */
export function popMessage(): SessionMessage | undefined {
  return messages.pop();
}

export function clearThread(): void {
  analysis = null;
  messages = [];
  truncated = false;
}

export function getThread(): SessionState | null {
  if (!analysis) return null;
  return { analysis, messages: [...messages], truncated, sending: false, sendError: null };
}

/** Current messages as plain content (what the LLM sees). */
export function threadForLlm(): Array<{ role: "user" | "assistant"; content: string }> {
  return messages.map(({ role, content }) => ({ role, content }));
}

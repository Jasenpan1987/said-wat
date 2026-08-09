import { clipboard } from "electron";
import { polishText } from "./llm/kimi.js";
import { showNote } from "./note-window.js";
import { friendlyError } from "./ui-errors.js";

/**
 * Flow A (Story 6): polish hotkey → read the clipboard → Kimi polish →
 * note shows original + polished + copy button. Context-free by design —
 * never joins a conversation thread. The clipboard is only written when the
 * user presses copy, so a failure never destroys the original.
 */
export async function runPolishFlow(): Promise<void> {
  const text = clipboard.readText();
  if (!text.trim()) {
    showNote({
      view: {
        kind: "error",
        message: "剪贴板为空或不是文本，无法润色。先复制一段英文，再按 Cmd+Shift+E。",
      },
    });
    return;
  }
  showNote({ view: { kind: "loading", label: "润色中…" } });
  try {
    const polished = await polishText(text);
    showNote({ view: { kind: "polish", original: text, polished } });
  } catch (err) {
    showNote({ view: { kind: "error", message: friendlyError(err) } });
  }
}

# Milestones — said-wat

Only M1 is committed; M2/M3 get reprioritised as reality arrives.

## M1 — "看懂对方说了啥" (MVP)

**Goal (user terms):** Press a hotkey anywhere, select a screen region WeChat-style, and get a sticky note with the full translation, one-line summary, and notable points.

**Tasks:** T-001, T-002, T-003, T-004, T-005, T-007, T-008

**Definition of done (testable):**
- The app launches to the tray with no window; a second launch focuses the existing instance.
- `Cmd+Shift+W` anywhere dims the screen; drag-select works; `Esc` cancels and restores the screen; confirm captures the region.
- The captured region produces a sticky note near the selection with the three sections; loading and error+retry states work.
- Missing API key shows a clear "set MOONSHOT_API_KEY" message; no key ever appears in the repo.
- `Cmd+W` close-window in other apps is unaffected.

## M2 — "回得了话"

**Goal (user terms):** Draft and polish a reply inside the same note — in English via the polish hotkey, or as Chinese intent that gets judged and translated — with the note remembering the whole exchange.

**Tasks:** T-006, T-009, T-010, T-011

**Definition of done (testable):**
- English draft → polish hotkey → idiomatic version with a copy button; clipboard original preserved on failure.
- Chinese intent → judged translation; a warning line appears when questions from the analysis go unanswered; English drafts are polished, not translated.
- The conversation thread survives note close/reopen within the session and renders chronologically; nothing is written to disk.
- Hotkeys and model are rebindable in settings; test-connection reports success/failure.

## M3 — "装得上的 App"

**Goal (user terms):** A packaged, verified app installed on the Mac and used daily.

**Tasks:** T-012, T-013

**Definition of done (testable):**
- A dmg installs and runs the full capture → interpret → reply loop.
- All nine stories pass the verification pass, or each failure has a filed bug task.
- First real-usage feedback lands back in `gaps.md` (G-003 context-connection design, G-001 hotkeys, G-002 model IDs).

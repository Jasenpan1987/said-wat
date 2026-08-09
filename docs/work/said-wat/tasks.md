# Tasks — said-wat

Sizing: one task = one focused coding-agent session. Statuses: backlog | ready | in-progress | done | blocked | cancelled.

### T-001: Scaffold pnpm workspace + Electron/TS/React app
- **Type:** setup
- **Status:** done (2026-08-10)
- **Requirement:** `docs/work/said-wat/requirements.md` (epic)
- **Knowledge:** `docs/knowledge/tech-conventions.md#repo-layout`, `docs/knowledge/tech-conventions.md#stack-conventions`
- **Code:** `workspace/app/`
- **Description:** Mirror Multi-Code's layout: root `package.json` (private, workspaces `./workspace/*`), main package at `workspace/app/` — Electron 35, TypeScript strict (target ES2024, ESM, `verbatimModuleSyntax`), React 19 renderer, rspack config (`rspack.renderer.config.ts`), `tsconfig.main.json`, oxlint + eslint, vitest, electron-builder config (`appId com.saidwat.app`, `productName said-wat`, dmg target, `identity: null`). Version lives only in `workspace/app/package.json`. Tray placeholder icon so the app is visible in the menu bar.
- **Acceptance:** `pnpm install && pnpm build && pnpm lint && pnpm type` all green; `pnpm start` launches and shows a tray icon with no window.
- **Blocks:** T-003 · **Blocked by:** none · **Parallel with:** none

### T-002: Kimi LLM client
- **Type:** integration
- **Status:** ready
- **Requirement:** `docs/work/said-wat/requirements.md#story-9-api-key`, `docs/work/said-wat/requirements.md#story-4-interpret`
- **Knowledge:** `docs/knowledge/architecture.md#llm-integration`
- **Code:** `workspace/app/src/main/llm/`
- **Description:** `kimi.ts` wrapping the `openai` SDK with `base_url = https://api.moonshot.ai/v1`; reads `MOONSHOT_API_KEY` from `process.env` **at call time** (no restart needed if set later). Methods: `interpretImage(base64, mimeType)` — vision call, model `kimi-k2.6`, thinking off, prompt requiring exactly three sections (full translation with untranslatable parts kept as-is / one-line summary / notable points), returns `{translation, summary, notablePoints}`; `polishText(text)` — pure text polish, returns the polished string; `replyWithContext({analysis, thread, draft})` — Flow B, returns `{answered: boolean, warning?: string, reply: string}` (English drafts → polish-with-context instead of translate). Model override from settings (default `kimi-k2.6`, fallback `kimi-k2.7-code`). Map API errors to friendly codes: `missing-key` / `auth` / `network` / `rate-limit`. Unit tests with a mocked client: section parsing, error mapping, prompt shapes.
- **Acceptance:** vitest green; no key → `missing-key`; fixture response parses into the 3-section object.
- **Blocks:** T-008 · **Blocked by:** none · **Parallel with:** T-003, T-004, T-005, T-006, T-007

### T-003: Tray + app lifecycle
- **Type:** feature
- **Status:** done (2026-08-10)
- **Requirement:** `docs/work/said-wat/requirements.md#story-1-tray-lifecycle`
- **Code:** `workspace/app/src/main/` (index.ts, tray)
- **Description:** Single-instance guard (`app.requestSingleInstanceLock`). Tray icon + menu (Open Settings, Quit). No window at launch. App stays alive when the sticky note is closed. Quit from tray ends all processes. Settings menu item is a stub until T-011.
- **Acceptance:** launch shows tray only; second launch focuses the existing instance; tray Quit exits; closing the note leaves the app running.
- **Blocks:** T-004, T-006 · **Blocked by:** T-001 · **Parallel with:** T-002, T-007

### T-004: Global hotkeys manager
- **Type:** feature
- **Status:** done (2026-08-10)
- **Requirement:** `docs/work/said-wat/requirements.md#story-2-global-hotkeys`
- **Code:** `workspace/app/src/main/hotkeys.ts`
- **Description:** Register capture hotkey (default `Cmd+Shift+W`) and polish hotkey (default `Cmd+Shift+E`) via `globalShortcut`. Capture handler dispatches to the capture overlay (T-005). Polish handler is a stub until T-009 (log/notify). Key strings come from the settings store when present (defaults otherwise). Re-registration on change must be conflict-safe (unregister before register; warn and keep previous on failure). `Cmd+W` must remain untouched.
- **Acceptance:** pressing `Cmd+Shift+W` anywhere opens the capture overlay; `Cmd+Shift+E` triggers the polish path (stub); `Cmd+W` close-window in other apps unaffected.
- **Blocks:** T-005, T-009 · **Blocked by:** T-003 · **Parallel with:** T-002, T-006, T-007

### T-005: WeChat-style capture overlay
- **Type:** feature
- **Status:** ready
- **Requirement:** `docs/work/said-wat/requirements.md#story-3-capture`
- **Knowledge:** `docs/knowledge/architecture.md#flows`
- **Code:** `workspace/app/src/main/capture/`
- **Description:** On capture hotkey: `desktopCapturer.getSources` snapshot of the display under the cursor → fullscreen frameless always-on-top overlay window(s) showing the dimmed snapshot on all displays, crosshair cursor, live selection rectangle with size readout, re-drag before confirm, `Esc` cancels, ✓/`Enter`/double-click confirms, selection clamped to visible area, zero-size click = cancel. If Screen Recording permission is missing, show a dialog explaining the need and open System Settings. Return the cropped region as a PNG buffer (base64).
- **Acceptance:** manual — WeChat-like dim + drag-select on the cursor's display; `Esc` restores the screen; confirm returns the cropped image; permission-denied path shows the dialog.
- **Blocks:** T-008 · **Blocked by:** T-004 · **Parallel with:** T-002, T-006, T-007

### T-006: Thread store (main-process memory)
- **Type:** data
- **Status:** ready
- **Requirement:** `docs/work/said-wat/requirements.md#story-8-memory`
- **Knowledge:** `docs/knowledge/architecture.md#flows`
- **Code:** `workspace/app/src/main/thread-store.ts`
- **Description:** In-memory conversation store: one active thread: `{ analysis: {translation, summary, notablePoints}, messages: Array<{role: "user"|"assistant", content, meta?}> }`. IPC: `thread-get` / `thread-append` / `thread-clear`. Survives renderer reload and note close/reopen within the session; cleared on new capture and on app quit (never written to disk). Truncation cap for very long threads with a `truncated` flag surfaced to the UI.
- **Acceptance:** unit tests — append/clear/cap; IPC round-trip; no disk writes (verify store dir untouched).
- **Blocks:** T-010 · **Blocked by:** T-003 · **Parallel with:** T-002, T-004, T-005, T-007

### T-007: Sticky-note popup shell
- **Type:** feature
- **Status:** ready
- **Requirement:** `docs/work/said-wat/requirements.md#story-5-sticky-note`
- **Code:** `workspace/app/src/renderer/` (note window), `workspace/app/src/main/note-window.ts`
- **Description:** Frameless always-on-top compact window. Shown without stealing keyboard focus (hidden/show without focus or `visibleOnAllWorkspaces` + no-activate). Draggable header; dismiss via ✕ or `Esc`. Renders the three analysis sections, a loading state, and error + retry. Single note instance reused across flows (capture/interpret, polish). Positioned near the selection on the same display, never covering the selection.
- **Acceptance:** manual — popup appears near the selection, draggable, dismissible, does not steal focus; renders a fixture 3-section analysis.
- **Blocks:** T-008, T-010 · **Blocked by:** T-001 · **Parallel with:** T-002, T-003, T-004, T-005, T-006

### T-008: Interpret flow wiring
- **Type:** integration
- **Status:** ready
- **Requirement:** `docs/work/said-wat/requirements.md#story-4-interpret`
- **Code:** `workspace/app/src/main/ipc-handlers.ts`, `workspace/app/src/main/capture/`
- **Description:** Capture confirm → cropped PNG base64 → `interpretImage` → parsed sections → note window shows them and thread store gets the analysis as root. Loading state during flight; on failure show friendly error + retry (re-send the same image). Prompt already enforces untranslatable parts kept as-is — verify passthrough, no client-side mangling.
- **Acceptance:** end-to-end with a mocked LLM — select a region → note shows the three sections; retry works; failure shows a friendly error, not a crash.
- **Blocks:** none (M1 done after this) · **Blocked by:** T-002, T-005, T-007 · **Parallel with:** none

### T-009: Flow A — clipboard polish
- **Type:** feature
- **Status:** backlog
- **Requirement:** `docs/work/said-wat/requirements.md#story-6-flow-a`
- **Code:** `workspace/app/src/main/` (polish flow), `workspace/app/src/renderer/` (result view + copy)
- **Description:** Polish hotkey → `clipboard.readText()` → `polishText` → note shows original + polished version + **copy button**; copy writes back via `clipboard.writeText()` with a brief "copied" confirmation. Empty or non-text clipboard → clear message, no request. Failure leaves the clipboard original untouched. Context-free by design (never joins a thread).
- **Acceptance:** manual with mocked LLM — copy text → hotkey → note shows polished + copy works; empty clipboard shows the message.
- **Blocks:** none · **Blocked by:** T-004, T-002, T-007 · **Parallel with:** T-010

### T-010: Flow B — draft box + judged translation
- **Type:** feature
- **Status:** backlog
- **Requirement:** `docs/work/said-wat/requirements.md#story-7-flow-b`, `docs/work/said-wat/requirements.md#intent-routing`
- **Code:** `workspace/app/src/renderer/` (draft box, thread view), `workspace/app/src/main/` (reply flow)
- **Description:** Multi-line draft box in the note (`Enter` sends, `Shift+Enter` newline — Multi-Code ComposeBox convention). Send → `replyWithContext({analysis, thread, draft})` → append result to the thread, render: judgement line ("answered" / "not answered"), the reply, and a copy button; warning line rendered when present. English draft → polish-with-context (no translation step). Empty draft → inline hint, no request. Failure keeps the draft text in the box.
- **Acceptance:** manual/mocked — Chinese intent → judged translation; unanswered questions produce the warning line; thread renders chronologically; copy works; English draft gets polished not translated.
- **Blocks:** none · **Blocked by:** T-006, T-007, T-002 · **Parallel with:** T-009

### T-011: Settings window
- **Type:** feature
- **Status:** backlog
- **Requirement:** `docs/work/said-wat/requirements.md#story-9-api-key`
- **Code:** `workspace/app/src/renderer/` (settings view), `workspace/app/src/main/settings-store.ts`
- **Description:** `settings-store.ts` — JSON under the user config dir (`~/.config/said-wat/`) holding hotkey bindings + model override. Settings window opened from the tray menu: rebind capture/polish hotkeys (conflict warning, keep previous on failure), model select (`kimi-k2.6` default / `kimi-k2.7-code`), test-connection button (tiny API ping), API-key status indicator (is `MOONSHOT_API_KEY` set in the environment?). Changes apply immediately and persist.
- **Acceptance:** rebinding a hotkey takes effect; model override flows into T-002 calls; test-connection reports success/failure; settings survive restart.
- **Blocks:** none · **Blocked by:** T-003, T-002 · **Parallel with:** T-009, T-010

### T-012: End-to-end verification pass
- **Type:** qa
- **Status:** backlog
- **Requirement:** `docs/work/said-wat/requirements.md` (all stories)
- **Code:** whole app
- **Description:** Execute every acceptance criterion (manual + mocked LLM), including permission flows and edge cases; record results; file bugs as new tasks with proper links. Companion to the epic's test-plan (qa skill owns the doc).
- **Acceptance:** every story verified, or a bug task filed for each failure.
- **Blocks:** none · **Blocked by:** T-008, T-009, T-010, T-011 · **Parallel with:** none

### T-013: Package distributable
- **Type:** setup
- **Status:** backlog
- **Requirement:** `docs/work/said-wat/requirements.md` (release)
- **Knowledge:** `docs/knowledge/tech-conventions.md#stack-conventions`
- **Code:** `workspace/app/` (electron-builder config)
- **Description:** App icon, `electron-builder` dmg target (`identity: null`, asar, `files: dist/**`), follow the version-bump rule (`chore: bump version to X.Y.Z`, patch default). Verify the packaged app runs capture + polish on a clean machine.
- **Acceptance:** dmg builds and installs; packaged app runs the full capture → interpret → reply loop.
- **Blocks:** none · **Blocked by:** T-012 · **Parallel with:** none

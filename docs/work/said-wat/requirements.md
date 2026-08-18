# Requirements — said-wat

> **Purpose:** What said-wat delivers, in testable user stories.
> **Status:** Current
> **Version:** 1.4 · 2026-08-18
> **Sources:** `docs/knowledge/project.md`, `docs/knowledge/architecture.md`, `docs/records/meetings/2026-08-09_alignment-said-wat.md`, `docs/records/decisions/ADR-001-stack-and-provider.md`

## 1. What this delivers and why

A macOS menu-bar-resident Electron utility, driven by two global hotkeys, that solves two daily frictions for a solo user working in English chats:

1. **Understanding long English messages** — press a hotkey, select a screen region (WeChat-desktop-screenshot style), get a sticky-note popup with the full translation, a one-line summary, and the notable points (subtext, ambiguity, things needing a reply).
2. **Writing dependable English replies** — from the same sticky note, draft a reply in English (polish it via hotkey) or state your intent in Chinese (have the AI judge whether you answered the questions, translate it, and warn if you missed something).

Both parts share one skeleton: hotkey invoke → capture/read → Kimi (Moonshot, non-thinking) → always-on-top sticky-note popup with a reply workspace and multi-turn memory.

## 2. Background

The builder reads tens-of-lines English messages from colleagues (Teams work groups) and English web pages daily, and writes English replies under risk of non-idiomatic phrasing or ambiguity. Screenshots are cheap for the chosen model (hundreds–low thousands of image tokens each), so cost is not a concern; thinking mode is deliberately off because these are single-step tasks. The capture interaction must clone the WeChat desktop screenshot UX exactly; code style follows the builder's Multi-Code project.

## 3. Users

A single user (the builder): macOS, daily English group chats and browsing, cost-sensitive, wants the app invisible until a hotkey summons it.

## 4. User stories

### Intent routing — the app never guesses {#intent-routing}

Intent is determined by **trigger and language, never inferred**:

| Input | Trigger | Intent | Context |
|---|---|---|---|
| Screen region | Capture hotkey (`Cmd+Shift+S`) | "What did they say" → interpret | New conversation rooted at the capture |
| Selected text (frontmost app, T-017) or clipboard | Polish hotkey (`Cmd+Shift+E`) | "Fix my English" → polish | None — always context-free |
| Text in the note's draft box | Send (`Enter`) | Chinese → judge + translate; English → polish-with-context | The open note's full conversation |

A note is **one conversation**: everything sent inside it carries the capture analysis plus all prior exchanges. A new capture starts a **new** conversation (previous thread cleared). Polish is standalone and never joins a thread.

### Story 1 — Tray-resident lifecycle, no window at launch {#story-1-tray-lifecycle}

As the user, I want the app to live silently in the menu bar (tray) after launch, with no window opening, so it never interrupts my work.

**Acceptance criteria:**
- Launching the app shows a tray icon only; no window appears.
- The tray menu offers: open settings, quit.
- The app keeps running when the sticky-note popup is closed.
- Quitting via the tray menu ends all processes.

**Edge cases:**
- Launch while another instance runs → single instance, focus existing (or quit second instance).

### Story 2 — Configurable global hotkeys {#story-2-global-hotkeys}

As the user, I want two global hotkeys — one for screenshot capture, one for clipboard polish — that work from any app, so I never have to switch to the utility first.

**Acceptance criteria:**
- Defaults (proposed, configurable): capture `Cmd+Shift+S`, polish `Cmd+Shift+E` (G-001 resolved 2026-08-10: `Cmd+Shift+W` collided with WeChat). Neither collides with the universal `Cmd+W` close-window shortcut.
- Both are rebindable in settings; a rebound key takes effect immediately.
- Pressing capture anywhere opens the capture overlay; pressing polish anywhere polishes the current clipboard text.
- If the same combination is already held by the system, settings warns and keeps the previous binding.

**Edge cases:**
- Conflicts with other apps' shortcuts are the user's choice to accept; warn once in settings, not per-press.
- Hotkey pressed while the capture overlay is already open → ignored (or cancels overlay — pick one, default: ignored).

### Story 3 — WeChat-style screen capture {#story-3-capture}

As the user, I want the capture hotkey to dim the whole screen and let me drag-select a rectangle, exactly like the WeChat desktop screenshot, so selecting a chat bubble or a paragraph is muscle-memory easy.

**Acceptance criteria:**
- Pressing capture dims the full screen (all displays) with a crosshair cursor and shows selection coordinates/size readout while dragging.
- Drag draws a live rectangle; the region can be re-selected by dragging again before confirming.
- `Esc` cancels and restores the screen; confirming (✓ click, `Enter`, or double-click) accepts the region and dismisses the overlay.
- The overlay appears on the display containing the cursor when multiple displays are present.
- After confirmation, the selected region's pixels are captured and handed to analysis (Story 4).
- If Screen Recording permission is missing, the app shows a clear dialog explaining what's needed and opens System Settings.

**Edge cases:**
- Zero-size click (no drag) → treated as cancel.
- Selection that extends off the screen edge → clamped to the visible area.
- During capture, clicks land on the overlay, never on the app underneath.

### Story 4 — Screenshot interpretation → sticky note {#story-4-interpret}

As the user, I want the captured region sent to the AI and the result shown in a sticky-note popup with three sections — full translation, one-line summary, notable points — so I understand a long English message in seconds.

**Acceptance criteria:**
- The captured image is sent to Kimi (vision, non-thinking, `kimi-k2.6` default) with a prompt requiring exactly three output sections:
  1. **Full translation** of the text in the region; untranslatable parts (names, product names, code, URLs, numbers) kept as-is.
  2. **One-line summary** of what the content is about.
  3. **Notable points**: subtext, ambiguity, and anything requiring a reply.
- The sticky note shows a loading state while the request is in flight, then the three sections.
- The note is shown on the same display as the captured region, positioned near it but never covering the selection.
- On API failure (auth, network, rate limit) the note shows a readable error and a retry button.

**Edge cases:**
- Region contains no text → the model still describes what it sees; if nothing meaningful, the note says so rather than inventing content.
- Very long messages → the full translation stays complete (no truncation by the app).

### Story 5 — Sticky-note popup {#story-5-sticky-note}

As the user, I want the result in a small always-on-top popup that stays while I work, so I can read and reply without losing context.

**Acceptance criteria:**
- Frameless, always-on-top, compact window; dismissible via ✕ or `Esc`.
- Contains, top to bottom: the three analysis sections (Story 4), the conversation thread (Story 8), and the multi-line draft box (Stories 6–7).
- The user can reposition the note by dragging its header.
- The note does not steal keyboard focus from the app underneath when first shown unless the user interacts with it (mirrors Multi-Code's non-focus-stealing popup behavior).

**Edge cases:**
- Multiple sequential captures → the newest analysis starts a fresh thread (the previous thread is cleared) — deliberate: a new capture means a new conversation context.

### Story 6 — Flow A: selected-text / clipboard polish {#story-6-flow-a}

As the user, I want to select any English text and press the polish hotkey to get an idiomatic version with a copy button — without needing to copy it first — so I can paste a dependable reply back into my chat.

**Acceptance criteria:**
- Pressing the polish hotkey reads the text **selected in the frontmost app** (T-017; via macOS Accessibility) and sends it to Kimi (text, non-thinking) for English polishing. If nothing is selected, it falls back to the current clipboard text.
- The result appears in the sticky-note popup (creating it if none is open) with: the original, the polished version, and a **copy button**.
- **The note also shows a feedback box (interactive revision, T-014):** the user can ask for a rewrite (e.g. "语气太生硬", "需要说得更细一点"), the model revises using the original + previous revision history, and each round appears as a new version with its own copy button. Rounds accumulate until the user copies a version they like.
- Copying puts the polished text on the clipboard; a brief "copied" confirmation shows in the note.
- If the clipboard is empty or non-text **and nothing is selected**, the note says so and does nothing further.

**Edge cases:**
- Text already well-formed → polish returns a lightly touched version (never returns "no changes needed" as a dead end; it still provides a usable copy).
- Clipboard holds an image → treated as empty-text case with a clear message (image polish is out of scope).
- Network failure mid-request → error in the note, clipboard untouched (original text preserved).
- A revision request fails → the feedback stays in the box, an error + retry shows; retry re-sends the same feedback. The polish session never joins the capture thread (context-free stays context-free).
- A new polish hotkey press starts a fresh session from whatever is now selected / on the clipboard (previous revision history discarded, in-memory only).

**Edge cases (T-017):**
- Reading another app's selection requires macOS Accessibility permission: when missing, said-wat shows a dialog (once, mirroring the Screen Recording flow) explaining how to enable it in System Settings → Privacy & Security → Accessibility, and keeps the clipboard path working.
- The simulated-Cmd+C fallback (apps that don't expose the AX attribute) briefly replaces the clipboard; the previous text/image is restored before the request starts.

### Story 7 — Flow B: Chinese intent → judged translation {#story-7-flow-b}

As the user, I want to type my reply intent in Chinese in the draft box, send it, and get an English reply that the AI first checks answers the questions from the screenshot — warning me if it doesn't.

**Acceptance criteria:**
- The draft box is multi-line: `Enter` sends, `Shift+Enter` inserts a newline (Multi-Code ComposeBox convention).
- Sending runs the context-aware step: Kimi receives the note's analysis plus the accumulated conversation thread and:
  1. Judges whether the user's message answers the questions/points raised in the analysis.
  2. Produces an English reply (translating the intent, or polishing if already English).
  3. If the judgement finds unanswered points, **still returns the translation**, plus a warning line naming what may be missing (e.g. "注意：可能没回答对方问的交付时间").
- The reply is appended to the conversation thread with a **copy button**.
- The note shows a short judgement line (answered / not answered) so the user sees why the warning exists.

**Edge cases:**
- Draft is empty on send → no request; brief inline hint.
- Draft is already English → polish-with-context instead of translate (no translation step).
- Send fails → error in the note, draft text preserved in the box.
- User keeps sending follow-ups → each send uses the full thread (Story 8).

### Story 8 — Multi-turn conversation memory {#story-8-memory}

As the user, I want the note to remember every exchange I've had in it, so follow-up questions and corrections keep context.

**Acceptance criteria:**
- The thread contains: the original analysis, each sent draft, and each AI reply, in order.
- Every new send (Story 7) includes the full thread; the AI's judgement and reply can reference earlier exchanges.
- The thread is held in **main-process memory**; closing and reopening the note within the app session keeps it (survives renderer reloads). Quitting the app clears it — nothing is written to disk.

**Edge cases:**
- Long threads near context limits → cap the thread (keep earliest turns) and note the truncation in the note rather than failing.

### Story 9 — API key via environment variable + settings {#story-9-api-key}

As the user, I want the API key read from `MOONSHOT_API_KEY` and a small settings surface, so secrets never live in the repo and I can adjust hotkeys/model.

**Acceptance criteria:**
- The app reads `MOONSHOT_API_KEY` from the environment at startup; no key storage in app config, no key in code or repo.
- If the key is missing or a call returns auth errors, the note shows a clear "set MOONSHOT_API_KEY" message with the exact instruction.
- Settings (from tray menu) shows: both hotkeys with rebinding, the model override (default `kimi-k2.6`; fallback `kimi-k2.7-code`), and a test-connection button that reports success/failure.
- Changing settings persists across restarts.

**Edge cases:**
- Key set after launch (e.g. exported in a new terminal) → retry reads the current environment; no restart required.

### Story 10 — Multi-provider model support {#story-10-multi-provider}

As the user, I want to pick any mainstream model provider in Settings and paste its API key there, so I'm not locked into Kimi and can switch providers without touching code or environment variables.

> **Status: recorded draft — NOT yet implemented.** Four design decisions are still open (see below); the task is T-015. Do not treat this story as current behaviour.

**Acceptance criteria:**
- Settings shows a provider list (v1 scope: OpenAI / Kimi / DeepSeek / Qwen / GLM — all OpenAI-compatible, one SDK) and choosing a provider filters the model dropdown.
- Each provider has an API-key field in Settings; a pasted key is saved securely (storage decision pending — see open decisions) and used by all LLM calls for that provider.
- Test-connection validates the selected provider's key and base URL.
- A stored key takes precedence; the environment-variable key (MOONSHOT_API_KEY, OPENAI_API_KEY…) remains the dev fallback when nothing is stored.
- Capture/interpret needs a vision-capable model; a text-only model (e.g. DeepSeek) is selectable for polish/reply but capture shows a clear "当前模型不支持图片" message instead of failing silently.
- The model list lives in one config file (`providers.ts`); adding a model = one line, no code changes elsewhere.
- Switching provider/model applies immediately to the next call (like the current model override) and persists across restarts.

**Open decisions (need builder sign-off before T-015 implementation):**
1. Key storage: macOS Keychain via Electron `safeStorage` (recommended — also solves the packaged-app env problem) vs plaintext in settings.json.
2. Provider scope v1: OpenAI-compatible only (recommended — one SDK, small change) vs also Anthropic/Gemini (different protocols, roughly double the work).
3. Non-vision model + capture: clear error message (recommended) vs automatic model fallback.
4. Key precedence: stored key wins, env fallback (recommended).

**Initial model list (config-driven, exact IDs/capabilities to be verified at implementation):** OpenAI `gpt-4.1` / `gpt-4.1-mini` (vision); Kimi `kimi-k2.6` / `kimi-k2.7-code` (vision); DeepSeek `deepseek-v4-pro` / `deepseek-v4-flash` (text-only); Qwen `qwen-plus` / `qwen3-vl-plus` (vl = vision); GLM `glm-4.7` / `glm-4.6`.

## 5. Non-functional requirements

- **Performance:** cold start to tray icon ≤ 5s; capture → analysis shown ≤ 15s on a typical selection (network permitting).
- **Footprint:** Electron-level idle memory is accepted by the builder (~200–300MB).
- **Privacy:** the API key and captured images leave the machine only to `api.moonshot.cn`; nothing is logged or stored beyond the in-memory note thread.
- **Reliability:** all AI calls time out with a readable error; retries available; original clipboard/draft content is never destroyed by a failed run.
- **UI copy:** Chinese (matches the user); code, comments, and commit messages in English (project convention).

## 6. Technical constraints

- Electron 35 + TypeScript (strict, ES2024, ESM) + React 19, rspack renderer build, tsc main build, oxlint/eslint, vitest — per `docs/knowledge/tech-conventions.md`.
- Kimi API via `openai` SDK with `base_url = https://api.moonshot.cn/v1` (builder's key is on the Chinese platform — verified 2026-08-10); model `kimi-k2.6` non-thinking by default, `kimi-k2.7-code` selectable.
- Capture: fullscreen overlay window + `desktopCapturer` snapshot; requires macOS Screen Recording permission.
- Global hotkeys via Electron `globalShortcut`; clipboard via Electron `clipboard`.
- Zero native dependencies.

## 7. Dependencies

- `MOONSHOT_API_KEY` from the builder at first live test (G-002) — blocks live verification, not development.
- macOS Screen Recording permission granted on the dev machine.
- Reference conventions from Multi-Code (`docs/knowledge/tech-conventions.md`).

## 8. Explicitly out of scope

- **Suggested replies** — rejected by the builder in alignment.
- **OCR pipeline** — unnecessary; the model reads images directly.
- **Thinking mode** — deliberately off for both tasks.
- **Multi-provider support** — ~~Kimi only~~ moved to Story 10 (2026-08-10), no longer out of scope.
- **Standalone input window** (original scheme A) — superseded by the sticky-note draft box.
- **Capture annotation toolbar** (pen/arrow/undo etc.) — WeChat clone covers dim + select + cancel/confirm only. ⚠️ *Call to confirm: the builder said "一模一样", which could include annotations.*
- **Thread persistence across app restarts** — memory only (main process); threads are cleared when the app quits. Decided 2026-08-09.
- **Auto-launch at login** — v1 starts the app manually. ⚠️ *Assumption to confirm.*
- **Image polish / image-in-clipboard handling** — text only.
- **Cross-platform** — macOS only.

## Changelog

- **1.4 (2026-08-18):** Story 6 — Flow A source is now the selected text first, clipboard fallback (T-017). §6 hotkey line updated.

- **1.3 (2026-08-10):** Story 10 — multi-provider model support recorded as a draft (not implemented; T-015 backlog, 4 open decisions pending builder sign-off). §8 multi-provider exclusion removed.

- **1.2 (2026-08-09):** Intent-routing rules locked (§ Intent routing — trigger and language decide, never guessed); context-connection design explicitly parked as G-003 to revisit after real usage.
- **1.1 (2026-08-09):** Story 8 — thread storage settled as main-process memory (survives note close/reopen in-session, cleared on quit, nothing on disk); Story 5 — new capture starts a fresh thread (decided); §8 — persistence-across-restart call resolved. Discussed with builder.

- The builder understands a long English chat message in seconds using capture + the three-section note, without reading the raw text.
- An English reply (drafted in English or as Chinese intent) is produced, judged, and copied in under a minute.
- The capture interaction feels identical to WeChat desktop screenshot.
- No API key ever appears in the repo; hotkeys never break `Cmd+W`.

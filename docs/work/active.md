# Active Work

> **Purpose:** Where the project stands and what's next — the handoff artifact for the next session.
> **Status:** Current
> **Updated:** 2026-08-10

## Current focus

**Stage: M1 + M2 features built and demoed live on the builder's machine; T-011 settings window done (2026-08-10).**
**Epic:** `docs/work/said-wat/` — macOS LLM companion: screenshot interpret + English drafting workspace.
**Task list:** `docs/work/said-wat/tasks.md` (T-001…T-011 done, T-012/T-013 backlog).

## What works now (verified live 2026-08-10)

- Tray-resident app, single instance; hotkeys `Cmd+Shift+S` (capture) / `Cmd+Shift+E` (polish).
- WeChat-style capture: dim → drag-select → ✓/Enter/**double-click anywhere** confirms, Esc cancels; failsafes prevent the black-screen trap; real 2-display capture verified.
- Capture → Kimi vision (default `kimi-k2.6` non-thinking, ~13s) → sticky note 翻译/总结/要点, each copyable.
- Reply workspace: draft box (Enter send / Shift+Enter newline), Chinese intent → judged English reply ("已回答 ✓"/"未回答 ⚠" + warning), thread memory (cap 20 + truncated flag), copy buttons on every text block.
- Flow A: select text in any app → `Cmd+Shift+E` → polished version + copy (T-017: no Cmd+C needed; clipboard fallback; needs Accessibility permission — dialog explains once when missing, clipboard still works).
- `.env` workflow (`.env.example` committed, `.env` gitignored, dev loader), key never in repo.
- **Settings window (T-011):** tray → Settings… — hotkey rebinding (press-the-combo; conflicts keep previous + show reason; ⌘W/⌘Q reserved), model select (kimi-k2.6 default / kimi-k2.7-code), test-connection (models ping), API-key status indicator. Persisted to `~/Library/Application Support/said-wat/settings.json` (Multi-Code userData convention).
- **Interactive polish (T-014):** Flow A now has a feedback box AFTER the first automatic result — multi-round revisions, each version copyable; first round shows a centered animated "润色中…" indicator; `Cmd+Shift+E` starts a fresh session.
- **Packaged app (T-013):** `release/said-wat-0.1.1-arm64.dmg` (unsigned, psyduck icon). Packaged builds load the API key from `~/Library/Application Support/said-wat/.env` (env.ts; repo `.env` copied there during packaging — key NOT inside the DMG). Packaged bundle needs its OWN Screen Recording grant on first capture.
- **GitHub:** `https://github.com/Jasenpan1987/said-wat` (PUBLIC). **Builder preference: never create/set repos public again — keep private.** Local `origin` points there; README default is Chinese (`README.md` zh, `README.en.md` en).

## Handoff notes for the next session

**Environment facts (don't re-derive):**
- API key lives in repo-root `.env` (gitignored) — `MOONSHOT_API_KEY`, filled by the builder.
- Base URL is `https://api.moonshot.cn/v1` — the builder's key is on the Chinese platform; `api.moonshot.ai` returns 401 (G-002 resolved).
- Default model `kimi-k2.6` non-thinking. **The builder does NOT want `kimi-k3` (expensive — thinking always on).** `SAIDWAT_MODEL` env is an opt-in test knob only.
- Screen Recording is already granted for the dev Electron binary on this machine.
- The app is currently RUNNING (k2.6 default, current build) — rebuild + restart after changes.
- Probes that import modules directly must call `loadDotEnv()` first (probes bypass index.ts's startup env loading).
- Checks: `pnpm build && pnpm lint && pnpm type && pnpm test` (51 tests). Commit messages English.

**Next tasks (pick with the builder):**
0. **T-017 done 2026-08-18** — Flow A polish reads the selected text (no Cmd+C); verify live: grant Accessibility to the app, select text in an app, press `Cmd+Shift+E` (was working on clipboard before).
1. **T-015 Multi-provider model support (recorded, NOT started)** — Story 10 in `requirements.md`: provider list (OpenAI/Kimi/DeepSeek/Qwen/GLM) + model dropdown + paste-API-key-in-Settings. 4 open design decisions pending builder sign-off (key storage, provider scope, non-vision model behaviour, key precedence) — see story 10 / G-004. Builder explicitly said don't start yet.
1. **T-012 qa boundary review** (next): manual items accumulated — tray Quit click, note focus behaviour, real capture UX on the builder's dual monitors, judgement accuracy, settings window walk-through, **packaged-app env story — note: a stored API key (Story 10) would also solve this**.
2. **T-013 Package dmg** — after qa; needs the icon + version bump chore convention.

**Open questions for the builder:** T-015's 4 multi-provider decisions (G-004 / story 10); judgement/warning quality feedback from real usage; G-003 (cross-capture context) stays deferred until real usage.

## Open items (gaps.md)

- G-001 resolved (Cmd+Shift+S / Cmd+Shift+E). G-002 resolved (.cn platform, models verified). G-003 deferred.

## Incident record

- Capture overlay black-screen trap (2026-08-10) — path bugs + fixes + failsafes: `docs/records/investigations/2026-08-10_overlay-black-screen.md`.

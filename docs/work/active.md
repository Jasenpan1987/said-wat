# Active Work

> **Purpose:** Where the project stands and what's next.
> **Status:** Current
> **Updated:** 2026-08-10

## Current focus

**Stage: M1 + M2 features built and demoed live. M2 remains 1/4 (T-011 settings).**
**Epic:** `docs/work/said-wat/` — macOS LLM companion: screenshot interpret + English drafting workspace.

## What works now (verified live 2026-08-10)

- Tray-resident app, single instance, hotkeys `Cmd+Shift+S` (capture) / `Cmd+Shift+E` (polish).
- WeChat-style capture: dim → drag-select → ✓/Enter/**double-click anywhere** confirms, Esc cancels; failsafes prevent the black-screen trap; real 2-display capture verified.
- Capture → Kimi vision (default `kimi-k2.6`, non-thinking, ~13s; `.cn` base URL) → sticky note with 翻译/总结/要点, each copyable.
- Reply workspace: draft box (Enter send / Shift+Enter newline), Chinese intent → judged English reply ("已回答 ✓"/"未回答 ⚠" + warning), thread memory (cap 20, truncated flag), copy buttons everywhere.
- Flow A: copy text → `Cmd+Shift+E` → polished version + copy; clipboard untouched until user copies.
- `.env` workflow (template + gitignored local file, dev loader), key never in repo.

## Next move

1. `work` T-011 — settings window (rebind hotkeys, model select, test-connection, API-key status).
2. `qa` — M1+M2 boundary review (manual items piling up: see below).
3. `work` T-013 — package the dmg (after qa).

## Open items

- G-003 deferred — context-connection design, revisit after real usage.
- Manual qa items: tray Quit click, note focus behaviour, real capture UX on the user's two monitors, judgement accuracy, hotkey conflict warning flow, packaged-app env story (story 9 vs Finder-launched app).
- Requirements changelog: hotkey default `Cmd+Shift+S`, base URL `api.moonshot.cn`, copy/dbl-click UX refinements landed in code — docs updated where factual.

## Progress log

- T-001…T-010 done (2026-08-10). T-011/T-012/T-013 backlog.
- Live demo (k3→k2.6 default), real capture + reply loop working on the user's machine.
- Incidents: capture overlay black-screen (path bugs) — fixed + failsafes, record in `docs/records/investigations/`.

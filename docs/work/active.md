# Active Work

> **Purpose:** Where the project stands and what's next.
> **Status:** Current
> **Updated:** 2026-08-10

## Current focus

**Stage: M1 complete (2026-08-10) — awaiting `qa` boundary review.**
**Epic:** `docs/work/said-wat/` — macOS LLM companion: screenshot interpret + English drafting workspace.

## Next move

1. `qa` boundary review of M1 (manual items: tray Quit, real capture on a granted-permission machine, note focus behaviour, first live capture→interpret on the real screen).
2. M2: T-006 thread store, T-009 clipboard polish, T-010 reply workspace, T-011 settings.

## Decisions locked (alignment 2026-08-09 — record: `docs/records/meetings/2026-08-09_alignment-said-wat.md`, ADR-001)

- Electron + TS + React; Kimi single provider, `kimi-k2.6` non-thinking; `MOONSHOT_API_KEY` env var.
- Sticky note = analysis + reply workspace; 3-section output; Flow A/B; multi-turn memory; no thinking mode.
- Capture = WeChat desktop screenshot UX clone. Style follows Multi-Code.

## Progress

- T-001 scaffold, T-003 tray+lifecycle, T-004 hotkeys, T-005 capture overlay, T-002 Kimi client, T-007 note shell, T-008 interpret wiring — all done 2026-08-10, suite green (45 tests). Judgment calls in `.omt/judgment-calls-T-*.md`.
- **M1 complete.** Live verification 2026-08-10: key works on `api.moonshot.cn` (not .ai) — docs updated; `kimi-k2.6` + `kimi-k3` vision both parse 3 sections. Demo mode: `SAIDWAT_DEMO=1` (+ optional `SAIDWAT_MODEL=kimi-k3`) analyzes a bundled sample screenshot end-to-end.

## Open items

- G-001 hotkey keybindings — configurable, low impact.
- G-002 resolved 2026-08-10 (models verified on .cn; `kimi-k2.7-code` untested).
- G-003 deferred — revisit after real usage.
- Manual qa items for M1 review: see `docs/work/said-wat/test-plan.md`.

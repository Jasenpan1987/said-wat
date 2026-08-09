# Active Work

> **Purpose:** Where the project stands and what's next.
> **Status:** Current
> **Updated:** 2026-08-10

## Current focus

**Stage:** M1 build in progress — scaffold done, feature chain next.
**Epic:** `docs/work/said-wat/` — macOS LLM companion: screenshot interpret + English drafting workspace.
**Current milestone:** M1 (`docs/work/said-wat/milestones.md`).

## Next move

1. `work` T-003 → T-004 → T-005 → T-008 (M1 chain), with T-002 (Kimi client, parallel) and T-007 (note shell) landing before T-008.
2. M1 done → `qa` boundary review → M2.

## Decisions locked (alignment 2026-08-09 — record: `docs/records/meetings/2026-08-09_alignment-said-wat.md`, ADR-001)

- Electron + TS + React; Kimi single provider, `kimi-k2.6` non-thinking; `MOONSHOT_API_KEY` env var.
- Sticky note = analysis + reply workspace; 3-section output; Flow A/B; multi-turn memory; no thinking mode.
- Capture = WeChat desktop screenshot UX clone. Style follows Multi-Code.

## Progress

- T-001 scaffold done 2026-08-10: pnpm workspace + Electron 35 / TS strict (ESM main) / React 19 / rspack / oxlint+eslint / vitest; tray placeholder runs via `pnpm start`. Judgment calls: `.omt/judgment-calls-T-001.md`.

## Open items

- Hotkey keybindings (G-001) and model ID confirmation at first test (G-002) — `docs/work/said-wat/gaps.md`.

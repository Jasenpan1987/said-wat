# Epic: said-wat — macOS LLM companion

> **Purpose:** Context pack — the first file to read when working on this epic.
> **Status:** Requirements drafted, awaiting review → kanban.
> **Updated:** 2026-08-09

## Goal

A menu-bar-resident Electron utility: hotkey screenshot interpretation (WeChat-style capture → Kimi → sticky note with translation / summary / notable points) plus a reply workspace in the same note (English polish via hotkey, Chinese-intent judged translation, multi-turn memory).

## Current state

- Alignment interview complete (2026-08-09) — all product decisions locked.
- Requirements drafted: `requirements.md` (9 stories) — **pending builder review**.
- No code yet. No tasks yet.

## Next action

1. Builder reviews requirements (confirm the three ⚠️ out-of-scope calls in §8).
2. `kanban` → break stories into tasks and milestones.

## Key knowledge links

- Product: `docs/knowledge/project.md`
- Stack & flows: `docs/knowledge/architecture.md`
- Conventions (from Multi-Code): `docs/knowledge/tech-conventions.md`
- Provider decision: `docs/records/decisions/ADR-001-stack-and-provider.md`
- Open items: `gaps.md` (G-001 hotkeys, G-002 model IDs)

## Primary modules (planned)

- `workspace/app/src/main/` — tray, global hotkeys, capture overlay, Kimi client, IPC (mirrors Multi-Code layout)
- `workspace/app/src/renderer/` — sticky-note popup UI (analysis, thread, draft box)
- `workspace/app/src/shared/` — shared types

## Constraints

- `MOONSHOT_API_KEY` env var only; zero native deps; no thinking mode; capture clones WeChat desktop UX.

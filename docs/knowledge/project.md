# Project — said-wat

> **Purpose:** What said-wat is, who it's for, and what it does.
> **Status:** Current
> **Verified against:** Alignment interview 2026-08-09 (source: `docs/records/meetings/2026-08-09_alignment-said-wat.md`)
> **Primary code:** not yet created — greenfield

## Summary

said-wat is a macOS menu-bar-resident Electron utility driven by global hotkeys. It solves two daily pain points: understanding English chat messages and web pages ("what did they say?") and writing idiomatic English replies ("fix my English"). Screenshot capture clones the WeChat desktop screenshot interaction; results appear in an always-on-top sticky-note popup that doubles as a reply drafting workspace with multi-turn AI memory. Single LLM provider (Kimi/Moonshot), thinking mode off.

## Product definition

- **For:** Jasen Pan (solo user) — daily English work-group chats (Teams) and English web browsing.
- **Part 1 — screenshot interpret:** global hotkey → dim screen → drag-select region → image → Kimi (vision, non-thinking) → sticky note with three sections: full translation (untranslatable parts kept as-is), one-line summary, notable points.
- **Part 2 — reply workspace (same note):** multi-line draft box below the analysis. Flow A: English draft → copy → polish hotkey → idiomatic English. Flow B: Chinese intent → judge whether the screenshot's questions are answered → translate; if not answered, translate anyway + warning line. Copy button. Multi-turn memory across the note's lifetime.
- **Explicitly out:** suggested replies, OCR pipeline, thinking mode, multi-provider, standalone input window.

## Key constraints

- API key only via `MOONSHOT_API_KEY` env var — never in repo.
- Zero native dependencies.
- Code style follows Multi-Code conventions (`docs/knowledge/tech-conventions.md`).

# Alignment Interview — said-wat product definition

**Date:** 2026-08-09
**Type:** alignment
**Participants:** Jasen Pan (builder)
**Source:** provided in chat (live interview, no material)

## Summary

Greenfield idea pinned down into a two-part macOS utility: (1) hotkey-driven screenshot interpretation ("what did they say") and (2) English drafting/polish ("fix my English"), both presented in an always-on-top sticky-note popup that doubles as a reply workspace with multi-turn memory. Stack settled: Electron + TypeScript + React, single LLM provider (Kimi/Moonshot) in non-thinking mode. Screenshot capture must clone the WeChat desktop screenshot interaction exactly. Code style follows the builder's existing Multi-Code project.

## Key Decisions

- **Electron (TypeScript, React) as the framework** — decided by Jasen Pan; reason: small project, JS comfort, background-resident hotkey-triggered app. Tradeoff accepted: ~200–300MB idle RAM. Alternatives considered: SwiftUI, Tauri 2.
- **Kimi (Moonshot) as single vision-capable provider, thinking mode OFF** — decided by Jasen Pan; reason: DeepSeek's official V4 API is text-only (would force an OCR pipeline), and "it just fixes English — no thinking needed". Default model `kimi-k2.6` (non-thinking); `kimi-k2.7-code` ("Kimi 2.7", thinking always on) kept as fallback for hard screenshot interpretation.
- **API key via environment variable** (`MOONSHOT_API_KEY`), never in repo, no hardcoding — builder supplies at first local test.
- **Screenshot interpretation output = 3 sections**: (1) full translation, untranslatable parts (names, code, URLs) kept as-is; (2) one-line summary; (3) notable points (subtext, ambiguity, things needing a reply). No suggested reply.
- **Sticky note = reply workspace**: multi-line draft box below the analysis. Flow A: English draft → copy → polish hotkey → idiomatic English. Flow B: Chinese intent → judge whether the screenshot's questions are answered → translate to English; if not fully answered, translate anyway + append a warning line. Result carries a copy button.
- **Multi-turn memory**: the note keeps the full conversation thread as context for each new send; follow-up questions accumulate.
- **WeChat desktop screenshot UX is the capture spec** — exact clone (dim screen, drag-select, complete/cancel interaction).
- **Code style follows Multi-Code** (`/Users/jasenpan/code/apra/multi-code`): pnpm workspace, Electron 35 + TS strict ES2024 ESM + React 19 + rspack + oxlint/eslint + vitest, contextBridge IPC, English-only code.
- The original "scheme A" standalone input area is superseded by the sticky-note draft box; not built separately.

## Facts Learned

- DeepSeek official V4 API is text-only; legacy `deepseek-chat`/`deepseek-reasoner` retired 2026-07-24 (researched).
- Kimi API is OpenAI-compatible at `https://api.moonshot.ai/v1`; vision via `image_url` base64 content blocks; image tokens counted dynamically by resolution (cheap — hundreds to low thousands per screenshot).
- Kimi vision-capable models: `kimi-k3` (flagship, thinking always on), `kimi-k2.6` (thinking switchable — v1 pick), `kimi-k2.7-code`/`-highspeed` (thinking always on).
- Electron can clone WeChat-style capture via a fullscreen overlay window + `desktopCapturer` (requires macOS Screen Recording permission).
- Multi-Code conventions captured in `docs/knowledge/tech-conventions.md`.

## Open Questions

- [ ] Final hotkey keybindings (placeholders Cmd+W / Cmd+E conflict with universal close-window; 3-key combos recommended) — configurable, low impact.
- [ ] Confirm exact model IDs (`kimi-k2.6` vs `kimi-k2.7-code`) at first live test with the API key.

## Action Items

- [ ] Builder: supply `MOONSHOT_API_KEY` at first local test.

## New Terms

| Term | Meaning | Example |
|------|---------|---------|
| Sticky note / 便签 | Always-on-top popup showing analysis + draft box | Result of a screenshot interpretation |
| Flow A | English draft → copy → polish hotkey → idiomatic English | Drafting a reply inside the note |
| Flow B | Chinese intent → judge + translate (+ warning) → copy | "这个项目两个月内完不成，原因有…" |

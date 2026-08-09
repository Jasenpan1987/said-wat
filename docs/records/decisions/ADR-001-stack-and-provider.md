# ADR-001: Electron stack + single Kimi provider

**Date:** 2026-08-09
**Status:** accepted
**Decision makers:** Jasen Pan (builder), research by the assistant
**Supersedes:** n/a

## Context

Greenfield macOS utility (hotkey screenshot interpretation + English drafting). The builder preferred not to write Swift; the app is small, background-resident, and hotkey-triggered. DeepSeek was the first provider choice, but its official V4 API is text-only — screenshot understanding would have required a local OCR pipeline. The builder instead chose a single vision-capable model and explicitly rejected thinking mode ("it just fixes English").

## Decision

- **Electron 35 + TypeScript (strict, ES2024, ESM) + React 19 + rspack + oxlint/eslint + vitest**, following the builder's Multi-Code project conventions.
- **Kimi (Moonshot) as the single LLM provider**, default model `kimi-k2.6` in non-thinking mode, for both parts. `kimi-k2.7-code` kept as a fallback for hard screenshot interpretation.
- API key via `MOONSHOT_API_KEY` env var only — never in repo.

## Consequences

- (+) One provider, one auth, one pipeline; no OCR step; image inputs cheap.
- (+) Fastest shipping for a JS-fluent builder; conventions already proven in Multi-Code.
- (−) ~200–300MB idle RAM from Electron (accepted by the builder).
- (−) Thinking mode off caps quality on hard interpretation tasks; mitigated by the k2.7-code fallback.
- (−) macOS screen capture requires Screen Recording permission and careful overlay handling.

## Alternatives Considered

- **SwiftUI native** — most native, lowest footprint; rejected: builder does not want Swift.
- **Tauri 2** — light, hotkey/clipboard plugins; rejected: builder chose Electron for simplicity and familiarity.
- **DeepSeek + local OCR** — viable but rejected once Kimi was chosen; the OCR step is eliminated.
- **Dual model (Kimi vision + DeepSeek text)** — considered; rejected for single-provider simplicity.

## Evidence

- Kimi API docs (platform.kimi.ai) and DeepSeek API docs (api-docs.deepseek.com), verified 2026-08-09.
- Multi-Code conventions at `/Users/jasenpan/code/apra/multi-code`.
- Alignment record: `docs/records/meetings/2026-08-09_alignment-said-wat.md`

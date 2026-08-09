# said-wat

> macOS menu-bar AI companion: hotkey screenshot interpretation + an English drafting workspace — powered by Kimi (Moonshot).

said-wat lives in the menu bar and stays out of your way until a hotkey summons it. It solves two daily frictions for anyone working in English chats:

1. **Understanding long English messages** — press `Cmd+Shift+S`, drag-select the message (WeChat-desktop-screenshot style), get a sticky note with the full translation, a one-line summary, and the notable points (subtext, ambiguity, things that need a reply).
2. **Writing dependable English replies** — from the same sticky note, draft a reply in English (polish it via hotkey) or state your intent in Chinese (the AI judges whether you answered the questions, translates it, and warns if you missed something).

## Features

- **Tray-resident** — single instance, no window at launch; quit from the tray.
- **Global hotkeys** — `Cmd+Shift+S` capture / `Cmd+Shift+E` clipboard polish; rebindable in Settings.
- **WeChat-style capture** — dim the screen, drag-select, ✓/Enter/double-click to confirm, Esc to cancel; multi-display aware.
- **Three-section note** — full translation / one-line summary / notable points, each copyable.
- **Interactive polish (Flow A)** — copy text → `Cmd+Shift+E` → idiomatic version, then keep iterating: tell it “语气太生硬” or “说得更细一点” and it revises, keeping every version copyable.
- **Judged replies (Flow B)** — Chinese intent → judged English reply, with a warning when something’s missed; multi-turn thread memory (capped at 20).
- **Settings window** — hotkey rebinding, model select, test connection, API-key status.
- **Privacy** — the API key only ever lives in your environment (`.env`), never in the repo; nothing is logged or stored beyond the in-memory note thread.

## Requirements

- macOS (currently the only supported platform)
- Node.js 20+ and pnpm

## Quick start

```bash
# 1. install
pnpm install

# 2. configure your API key (Moonshot / Kimi)
cp .env.example .env
# edit .env and fill in MOONSHOT_API_KEY

# 3. run
pnpm start
```

First launch needs Screen Recording permission (required for the capture overlay) — said-wat opens System Settings for you when it’s missing.

## Usage

| Hotkey | Action |
| --- | --- |
| `Cmd+Shift+S` | Capture a screen region → translate / summarize / notable points |
| `Cmd+Shift+E` | Polish the current clipboard text (interactive revisions) |

In the note: `Enter` sends, `Shift+Enter` inserts a newline. Every text block has a copy button.

## Configuration

- **API key** — `MOONSHOT_API_KEY` in `.env` (or your shell environment). Read at call time — setting it later needs no restart.
- **Model** — default `kimi-k2.6` (non-thinking, cost-conscious); `kimi-k2.7-code` selectable in Settings. `SAIDWAT_MODEL` is a dev-only override.
- **Hotkeys** — rebind in Settings (tray → Settings…); `Cmd+W` / `Cmd+Q` stay reserved for the system.
- Settings persist in `~/Library/Application Support/said-wat/settings.json`.

## Development

```bash
pnpm build   # rspack renderer + tsc main
pnpm lint    # oxlint + eslint
pnpm type    # tsc --noEmit
pnpm test    # vitest
```

Demo mode without Screen Recording: `SAIDWAT_DEMO=1 pnpm start` runs the real pipeline against a bundled sample screenshot.

## Tech stack

Electron 35 · TypeScript (strict, ESM) · React 19 · rspack · vitest · OpenAI-compatible Kimi API (`api.moonshot.cn`)

## Project structure

- `workspace/app/src/main/` — tray, hotkeys, capture overlay, LLM client, flows, IPC
- `workspace/app/src/renderer/` — note popup, capture overlay, settings
- `workspace/app/src/shared/` — shared types

## Roadmap

- Multi-provider model support (OpenAI / DeepSeek / Qwen / GLM …) with in-app API-key entry — recorded as Story 10.

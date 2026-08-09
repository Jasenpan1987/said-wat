# Tech Conventions — said-wat

> **Purpose:** Conventions this project follows, sourced from the builder's Multi-Code project.
> **Status:** Current
> **Verified against:** `/Users/jasenpan/code/apra/multi-code`, 2026-08-09
> **Primary code:** not yet created — greenfield

## Reference project

The builder directed that code and style follow **Multi-Code** (`/Users/jasenpan/code/apra/multi-code`). Follow it for structure, naming, and approach; deviate only when this product's requirements force it.

## Repo layout

- pnpm workspace monorepo; `workspace/app/` is the main package; root `package.json` is private (workspaces + scripts only).
- Main process: `workspace/app/src/main/` (index.ts, ipc-handlers.ts, preload.ts, `*-store.ts`, managers).
- Renderer: `workspace/app/src/renderer/` (App.tsx, components/, hooks/, styles/global.css).
- Shared types: `workspace/app/src/shared/types.ts`.

## Stack conventions

- Electron 35, TypeScript strict, target ES2024, ESM (`"type": "module"`, `verbatimModuleSyntax`), React 19.
- rspack config for the renderer (`rspack.renderer.config.ts`); tsc for main (`tsconfig.main.json`).
- oxlint + eslint; vitest with tests colocated as `*.test.ts`.
- Version lives only in `workspace/app/package.json`; release bump commit `chore: bump version to X.Y.Z`.

## IPC pattern

- Preload uses `contextBridge.exposeInMainWorld("electronAPI", …)`.
- Renderer → main: `ipcRenderer.invoke("channel-name", …args)`; handlers registered in `ipc-handlers.ts`.
- Fire-and-forget: `ipcRenderer.send(...)`; main → renderer events: `webContents.send(...)`.

## Code style

- All project files (code, comments, commit messages) in English.
- No unnecessary abstractions — keep it simple and direct.
- Prefer editing existing files over creating new ones.
- UI stays compact and information-dense.

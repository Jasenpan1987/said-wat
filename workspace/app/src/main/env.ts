import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// Candidate locations for a `.env`:
// 1. repo root via the current working directory (dev: `pnpm start` runs from workspace/app)
// 2. repo root via the compiled bundle location (dist/main → four levels up)
// 3. the app's user-data dir — `~/Library/Application Support/said-wat/.env` —
//    so a Finder-launched packaged build (no shell environment) can still find
//    the API key. Same location the dev build falls back to when the repo
//    `.env` is absent.
const CANDIDATES = [
  path.join(process.cwd(), ".env"),
  path.resolve(import.meta.dirname, "../../../../.env"),
  path.join(os.homedir(), "Library", "Application Support", "said-wat", ".env"),
];

/** Parses KEY=VALUE lines. Empty lines and `#` comments are skipped. */
export function parseEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    let value = line.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    out[line.slice(0, eq).trim()] = value;
  }
  return out;
}

/**
 * Loads a `.env` into `process.env` without overriding variables the
 * environment already defines. Dev builds read the repo `.env`; packaged
 * builds read `~/Library/Application Support/said-wat/.env` (no shell env).
 */
export function loadDotEnv(): void {
  for (const file of CANDIDATES) {
    if (!existsSync(file)) continue;
    for (const [key, value] of Object.entries(parseEnv(readFileSync(file, "utf8")))) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
    return;
  }
}

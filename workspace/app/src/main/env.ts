import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Candidate locations for a dev `.env`: repo root via the current working
// directory (dev: `pnpm start` runs from workspace/app), and repo root via
// the compiled bundle location (dist/main → four levels up).
const CANDIDATES = [
  path.join(process.cwd(), ".env"),
  path.resolve(import.meta.dirname, "../../../../.env"),
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
 * Loads a dev `.env` into `process.env` without overriding variables the
 * environment already defines. No-op in packaged builds (no `.env` ships).
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

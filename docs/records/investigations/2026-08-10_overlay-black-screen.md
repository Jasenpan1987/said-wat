# Investigation — capture overlay black-screen trap (2026-08-10)

**Reported:** First real capture (hotkey Cmd+Shift+W) after granting Screen
Recording → entire screen went black; no clicks, Esc dead; app had to be killed.

**Root cause (two compounding path bugs in `src/main/capture/`):**

1. `overlay-window.ts` compiled to `dist/main/capture/`, but its paths were
   written as if it lived in `dist/main/`:
   - `loadFile("../renderer/overlay.html")` → resolved
     `dist/main/renderer/overlay.html` → **ERR_FILE_NOT_FOUND** (this was the
     log line that cracked the case).
   - `preload: "../../preload.cjs"` → resolved `dist/preload.cjs` (missing) →
     preload silently failed.
2. Result: a fullscreen `screen-saver`-level window on a `#000` background with
   no renderer logic — no Esc, no clicks, no cancel. Exactly the reported trap.

**Why T-005's verification missed it:** the probe loaded `overlay.html` directly
with an absolute preload path, never exercising `createOverlayWindow`'s real
paths. The real end-to-end (hotkey → overlay) only ran once permission was
granted — on the user's machine.

**Fixes (committed):**

- Correct paths: `../preload.cjs`, `../../renderer/overlay.html` (one level for
  preload, two for renderer output).
- Failsafes so a broken overlay can never trap the user again:
  - `did-fail-load` (main frame) → tear down + resolve null.
  - `render-process-gone` → tear down + resolve null.
  - Ready handshake: renderer sends `capture-ready` after mounting + receiving
    init; a 6s watchdog tears the overlay down if it never arrives (catches
    preload failures and renderer JS crashes, which are not process crashes).
- Runtime capture logs (`[capture] overlay ready / confirmed / cancelled`) so
  future issues are visible in stdout.

**Verified after fix:** real capture on the live machine (2 displays): overlay
renders real snapshots (2940×1912, 2940×1654), ready handshake passes, drag +
Enter yields a correct cropped PNG (e.g. 864×216, 360KB).

**Lesson for qa:** end-to-end manual tests must run the REAL hotkey → overlay
path on a permission-granted machine, not probe-built windows.

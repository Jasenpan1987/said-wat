# Gaps — said-wat

| ID | Question | Impact | Ask | Status |
|----|----------|--------|-----|--------|
| G-001 | Final hotkey keybindings? (placeholders Cmd+W / Cmd+E conflict with universal close-window; 3-key combos recommended) | Determines the capture/polish trigger UX | Jasen Pan | open — configurable, low impact |
| G-002 | Confirm exact model IDs at first live test (`kimi-k2.6` non-thinking default vs `kimi-k2.7-code` fallback) | Defaults the LLM call | Jasen Pan (at test) | resolved 2026-08-10 — key works on `api.moonshot.cn`; `kimi-k2.6` (thinking disabled) and `kimi-k3` both verified live; `kimi-k2.7-code` untested |
| G-003 | How should "current context" connect to previous contexts? (e.g. reply grounded in two screenshots, or carry a thread across captures) | May reshape the note/multi-conversation UX in v2 | Jasen Pan | deferred — v1 rule locked in requirements §intent-routing (one note = one conversation rooted at the capture; new capture = new conversation; polish = context-free); revisit after real usage, builder wants the most convenient tool |

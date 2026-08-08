# AGENTS.md

## Context Routing

This project runs on the OMT knowledge base. Before any docs task, read `docs/README.md` and read only what the task needs — never scan whole directories.

- `docs/knowledge/` — current truth about product, business, architecture, conventions.
- `docs/work/` — active requirements, gaps, tasks, test plans (what we're doing now).
- `docs/records/` — decisions, meetings, investigations, completed work. History, not current behaviour.
- `docs/sources/` — raw evidence. `sources/inbox/` is an unprocessed queue; empty means caught up. Never treat sources as current truth.
- `docs/runbooks/` — repeatable operational procedures.
- `docs/local/` and `.omt/` — gitignored private material. Never link shared docs to them.

Shared docs are written in English. Chat and `docs/local/` may use any language.

Full OMT protocol: `~/.pi/agent/skills/omt/KNOWLEDGE.md` (one artifact one owner, gap protocol, ADR rules).

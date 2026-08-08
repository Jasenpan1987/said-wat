# OMT Knowledge Base — said-wat

> **Purpose:** Question-to-file routing table. Scan before any docs task.
> **Status:** Current
> **Last verified:** 2026-08-09

## Current truth → `docs/knowledge/`

| Question | File |
|---|---|
| What is this product, for whom? | `knowledge/project.md` |
| What business/domain context matters? | `knowledge/business.md` |
| How is it built, what stack? | `knowledge/architecture.md` |
| Coding conventions? | `knowledge/tech-conventions.md` |

## Active work → `docs/work/`

| Question | File |
|---|---|
| Where are we now, what's next? | `work/active.md` |
| Active epic: requirements? | `work/said-wat/requirements.md` |
| Open questions / gaps? | `work/said-wat/gaps.md` |
| Task list? | `work/said-wat/tasks.md` |
| Test plan? | `work/said-wat/test-plan.md` |

## History & evidence → `docs/records/`, `docs/sources/`

- `records/` — decisions (ADR), meetings, investigations, completed work. Evidence, not current truth.
- `sources/inbox/` — unprocessed input queue. Empty means caught up.
- `sources/transcripts|business-docs|screenshots|legacy/` — processed raw material.

## Private

- `docs/local/` and `.omt/` — gitignored; personal drafts and non-English material. Never link from shared docs.

## Protocol

- One artifact, one owner; unknowns live in `work/<epic>/gaps.md`; significant decisions get an ADR.
- Full protocol: `~/.pi/agent/skills/omt/KNOWLEDGE.md`

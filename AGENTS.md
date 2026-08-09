# Agent notes — Floatdesk

Canonical brief: [`CLAUDE.md`](./CLAUDE.md). Keep this file aligned when changing agent rules (Cursor loads `AGENTS.md`).

## Codebase orientation

1. Read [`docs/wiki/INDEX.md`](docs/wiki/INDEX.md) first.
2. For code relationships, use `graphify-out/` (regenerate with graphify if missing).
3. Historical slice specs/plans: `docs/superpowers/` — not the live handbook.
4. Status queue: [`ROADMAP.md`](ROADMAP.md).

## Product / UX

- Player-facing copy is **Italian**.
- Disabled or non-obvious controls must explain **why** and **what to do** (`Hint` / `title` / label). See `src/components/ui/Hint.tsx`, `src/ui/controlHints.ts`.
- Do not invent tax/banking legal claims — didactic sim only.

## Creative / multi-step work

Brainstorm → approved design in **claude-mem** (not `docs/superpowers/specs|plans` unless the user asks) → implement. Do not code ambiguous large features without that gate.

## Before opening or merging a PR

1. Run locally: `npm run lint && npm test && npm run build`
2. Open a PR against `main` — do not push commits directly to `main`
3. Wait for GitHub Action **CI / check** to go green
4. Do not merge (or ask to merge) while CI is red or pending
5. One concern per branch/PR (`feat/` / `fix/` / `docs/` from updated `main`)

## Do not commit

- `.superpowers/sdd/*`, local session reports/diffs
- Secrets / `.env`

## ROADMAP

- **Done** only after merge to `main` (use **Next** or `in PR #N` while open).

## Tests & code

- Vitest is **node** (no RTL). Prefer pure helpers + unit tests for copy/logic.
- Sim constants from `src/config` + tests — no invented formulas without spec/tests.
- Comments only where rules aren’t obvious from UI copy. Surgical diffs.

## Merge gate

`main` is protected by a ruleset: pull request required, status check **CI / check** required, no force-push, no branch deletion. Admins may bypass only for hotfixes.

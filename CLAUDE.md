# Floatdesk — agent brief (CLAUDE.md)

Concise rules for agents working in this repo. [`AGENTS.md`](./AGENTS.md) is a stub pointer (Cursor loads it); edit this file only.

## Product

- Educational Italian business sim (SRL semplificata). **Player-facing UI copy is Italian.**
- Not live tax/banking advice — keep didactic tone; don’t invent legal claims.
- Prefer clarity over cleverness: disabled controls must say **why** + **what to do** (`Hint`, `title`, or visible label). See hybrid Hint pattern in `src/components/ui/Hint.tsx` + `src/ui/controlHints.ts`.

## Orientation

1. Live handbook: [`docs/wiki/INDEX.md`](docs/wiki/INDEX.md).
2. Code map: `graphify-out/` (regenerate with graphify if missing). Never `graphify update .` on unrelated monorepos.
3. Slice history: `docs/superpowers/specs/` + `plans/` — not the live wiki.
4. Status queue: [`ROADMAP.md`](ROADMAP.md).

## Creative / multi-step work (Superpowers)

For new features or non-trivial UX (not typo fixes):

1. **Brainstorm** — clarify scope; get approval before coding.
2. **Design** — store the approved design in **claude-mem** (project `liquidazi`, type `decision`). Do **not** write `docs/superpowers/specs/` or `plans/` by default (saves tokens). Formal spec/plan files only if the user explicitly asks.
3. **Implement** task-by-task (TDD where logic exists); verify; PR. Pull design from mem if needed (`search` / observation).

Do not skip to implementation on ambiguous “make everything clearer / build X” requests.

## Git & PRs

1. Branch from updated `main`: `feat/…`, `fix/…`, or `docs/…`. One concern per PR.
2. Before opening/asking to merge: `npm run lint && npm test && npm run build`.
3. PR against `main`; wait for **CI / check** green; do not merge while red/pending.
4. Never push straight to `main`. No force-push to `main`. Admin ruleset bypass = hotfixes only.
5. Commit only when the user asks (or explicitly says “vai / fai commit / apri PR”).
6. **Do not commit:** `.superpowers/sdd/*`, local session diffs/reports, secrets, `.env`.
7. **Release:** update [`CHANGELOG.md`](CHANGELOG.md) (Keep a Changelog) + `package.json` version **before** tagging; merge to `main`, then `npm run release` (tag + GitHub Release + deploy prod). Wiki = how-to; changelog = what changed.

## ROADMAP

- Add a **Next** line when starting a tracked slice; move to **Done** only after merge to `main` (or note `in PR #N` while open).
- Link plan + spec paths when they exist.

## Code & tests

- **Sim numbers:** take from `src/config/*` and existing tests — do not invent balances, multipliers, or cooldowns.
- **No silent formula changes** without spec + tests.
- Vitest runs in **`environment: "node"`** — no React Testing Library. Prefer pure helpers (e.g. hint copy) + unit tests; UI wiring verified by lint/tsc/build (and Playwright only if the user asks).
- Comments: only on non-obvious rules at the touch site — not repo-wide JSDoc dumps.
- Match existing patterns (panels CSS modules, Zustand store, Italian logs/toasts).
- Keep diffs surgical; no drive-by refactors.

## Language

- If the user writes in Italian, respond in Italian (unless they ask otherwise).
- Code identifiers stay English; user-visible strings Italian.

## Execution preferences

- Default: work on a feature branch in this checkout (worktrees under `.worktrees/` if isolation is requested).
- Prefer one clear clarifying question over speculative multi-path implementation when scope is huge (“all UI”, “comment everything”).
- If the design is already approved in this chat (or the user says «ok / procedi / implementa come approvato»): skip Superpowers brainstorm, wiki INDEX, graphify, and claude-mem search. Implement from this thread.
- Do not re-read this file, the wiki, or skill docs mid-slice once the task is clear.

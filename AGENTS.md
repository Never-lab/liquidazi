# Agent notes — Liquidazi

## Codebase orientation

1. Read [`docs/wiki/INDEX.md`](docs/wiki/INDEX.md) first.
2. For code relationships, use `graphify-out/` (regenerate with graphify if missing).
3. Historical slice specs/plans: `docs/superpowers/` — not the live handbook.

## Before opening or merging a PR

1. Run locally: `npm run lint && npm test && npm run build`
2. Open a PR against `main` — do not push commits directly to `main`
3. Wait for GitHub Action **CI / check** to go green
4. Do not merge (or ask to merge) while CI is red or pending

## Merge gate

`main` is protected by a ruleset: pull request required, status check **CI / check** required, no force-push, no branch deletion. Admins may bypass only for hotfixes.

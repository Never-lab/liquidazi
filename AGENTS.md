# Agent notes — Liquidazi

## Before opening or merging a PR

1. Run locally: `npm run lint && npm test && npm run build`
2. Open a PR against `main` — do not push commits directly to `main`
3. Wait for GitHub Action **CI / check** to go green
4. Do not merge (or ask to merge) while CI is red or pending

## Merge gate

`main` is protected by a ruleset: pull request required, status check **CI / check** required, no force-push, no branch deletion. Admins may bypass only for hotfixes.

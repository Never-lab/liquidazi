# Liquidazi wiki

**Start here** for agents and humans. Specs/plans under `docs/superpowers/` are history; this wiki describes **current** shipped behavior.

## Edit rules

1. Edit files in this folder in git (`docs/wiki/`).
2. Run `npm run wiki:sync-help` after changing `help/`.
3. Mirror to GitHub Wiki with `npm run wiki:sync-github` (do not treat the Wiki UI as source of truth).

## Agent map

| Page | Topic |
|------|--------|
| [architecture.md](architecture.md) | Stack, folders, screens, store |
| [sim-loop.md](sim-loop.md) | Month close, cash, shocks, comfort |
| [fiscal.md](fiscal.md) | F24, mora, cartella, enforcement |
| [staff-ops.md](staff-ops.md) | Hiring, oneri, capacity, projects |
| [holding.md](holding.md) | Flip / acquisitions |
| [ui-feedback.md](ui-feedback.md) | HUD, inbox, toast vs log |
| [deploy.md](deploy.md) | Railway / build |

## Player help (also in-game Guida)

| Page | Topic |
|------|--------|
| [help/come-si-gioca.md](help/come-si-gioca.md) | Core loop |
| [help/fisco-e-f24.md](help/fisco-e-f24.md) | Taxes & collection |
| [help/personale-e-capacita.md](help/personale-e-capacita.md) | Staff & capacity |
| [help/finanza.md](help/finanza.md) | Loans & emergency cash |
| [help/faq.md](help/faq.md) | Common blockers |

## Graphify

After regenerate: see `graphify-out/GRAPH_REPORT.md` and `graphify-out/wiki/` (if present).  
Regenerate: install `graphifyy`, then from repo root run the graphify full pipeline and `graphify . --wiki` (see [deploy.md](deploy.md)).

## GitHub Wiki

Public mirror: `https://github.com/Never-lab/liquidazi/wiki` (Home should match this INDEX).

**One-time:** if `npm run wiki:sync-github` cannot clone `*.wiki.git`, open [Create the first page](https://github.com/Never-lab/liquidazi/wiki/_new), save a stub Home, then re-run the sync.

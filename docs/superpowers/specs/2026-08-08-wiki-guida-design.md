# Wiki + Guida + Graphify â€” Design

**Date:** 2026-08-08  
**Branch:** `docs/wiki-guida` (suggested)  
**Status:** Approved for implementation  
**Goal:** Cut AI re-read cost with a curated wiki, mirror it on GitHub Wiki, refresh graphify, and ship an in-game Guida that reuses player help pages.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Help location | B â€” markdown wiki + in-game Guida (tutorial stays) |
| Architecture | Approach 1 â€” curated `docs/wiki/` + generated graphify + Guida from `help/` |
| Source of truth | `docs/wiki/` in the git repo (PR / review / history) |
| GitHub Wiki | Mirror of `docs/wiki/` on the repo Wiki tab â€” never a second source |
| Guida content | Only `docs/wiki/help/*`; agent pages stay out of the app |
| Help â†’ app | Committed `src/content/guidePages.ts` (+ optional `npm run wiki:sync-help`) |
| Graphify | Full rebuild + `--wiki`; complement to curated wiki, not a replacement |

## Non-goals

- English localization
- Full-text search in Guida
- Auto graphify on every CI push
- Rewriting the 3-step Tutorial
- Editing pages only via GitHub Wiki UI (always edit `docs/wiki/` first)

## Architecture (three layers)

1. **`docs/wiki/`** â€” curated markdown (agents + players).
2. **`graphify-out/`** â€” generated knowledge graph + `--wiki` community articles; linked from the curated INDEX.
3. **Guida in-game** â€” `screen: "guide"` reading the synced help bundle.

Agent entry: `AGENTS.md` points to `docs/wiki/INDEX.md` first; graphify second for code relationships.

`docs/superpowers/specs|plans` remain historical design/plan artifacts. The wiki summarizes **current** shipped behavior, not plan diffs.

## Wiki page inventory

| Path | Audience | Content |
|------|----------|---------|
| `INDEX.md` | agent + human | Map, start-here, links to GitHub Wiki + graphify |
| `architecture.md` | agent | Stack, `src/` layout, store, screens |
| `sim-loop.md` | agent | Month close, cash, invoices, shocks, comfort |
| `fiscal.md` | agent | F24, mora, cartella, enforcement, lose |
| `staff-ops.md` | agent | Hiring, oneri, capacity, projects |
| `holding.md` | agent | Flip / acquisition (as shipped) |
| `ui-feedback.md` | agent | HUD, inbox, toast vs log, `lastUiHint` |
| `deploy.md` | agent | Railway / build |
| `help/come-si-gioca.md` | player | Core loop (cash â‰  profit, close month) |
| `help/fisco-e-f24.md` | player | Banner, penalties, cartella in plain IT |
| `help/personale-e-capacita.md` | player | Staff, contract limits |
| `help/finanza.md` | player | Loans, emergency fund, comfort |
| `help/faq.md` | player | Common â€œwhy canâ€™t Iâ€¦?â€ |

Update `docs/README.md` to list `wiki/` as the living product/agent handbook.

## GitHub Wiki mirror

- Enable / use the repository Wiki on GitHub.
- Sync **from** `docs/wiki/` **to** `*.wiki.git` (script or documented `gh`/git steps in the plan).
- Same page set (agent + help). Home / sidebar should point at INDEX.
- README or `docs/wiki/INDEX.md` states: edit in-repo only, then sync.
- CI auto-sync is optional / later; first ship may be a documented one-shot sync in the PR checklist.

## Guida in-game

**UX**

- Menu item **Guida** next to Tutorial â†’ `screen: "guide"`.
- Chapter list + body (markdown-lite: headings + paragraphs). Reuse `MenuScreen` styles; no new design system.
- Available from menu without an active game.
- Tutorial unchanged (onboarding); Guida = reference.

**Content pipeline**

- Source: `docs/wiki/help/*.md`.
- Runtime: `src/content/guidePages.ts` as `{ id, title, body }[]` (committed).
- Optional: `npm run wiki:sync-help` regenerates the TS file after help edits.
- Agent-only wiki pages are never bundled into the app.

## Graphify

- Install `graphifyy` if missing; run full pipeline on repo root; also `--wiki`.
- Version policy (implementation plan picks one after size check):
  - Prefer committing useful outputs agents need (`GRAPH_REPORT.md`, wiki index under `graphify-out/`, maybe `graph.json` if size is acceptable).
  - Exclude huge viz blobs via `.gitignore` if they bloat the repo.
- Curated `docs/wiki/INDEX.md` links to graphify outputs with a one-line â€œregenerateâ€ note.

## Files (expected)

- `docs/wiki/**` â€” new
- `docs/README.md`, `AGENTS.md` â€” pointers
- `src/store/gameStore.ts` â€” `"guide"` on `Screen`
- `src/App.tsx`, `src/screens/MenuScreen.tsx`, `src/screens/GuideScreen.tsx`
- `src/content/guidePages.ts` (+ sync script if added)
- `graphify-out/**` â€” generated (subset committed)
- Sync notes/script for GitHub Wiki (e.g. `scripts/sync-github-wiki.mjs` or docs section)

## Testing

- `guidePages` has â‰¥ 1 chapter; Guida screen mounts.
- `npm run lint && npm test && npm run build` green before PR.

## Done when

- Curated wiki exists and is the agent start-here
- GitHub Wiki mirrors `docs/wiki/` (documented sync; executed at least once)
- Graphify refreshed; INDEX links it
- In-game Guida shows help chapters from the same source as `docs/wiki/help/`
- Feature work unrelated to this PR stays out


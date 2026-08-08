# Audit integrity + UX polish — Design

**Date:** 2026-08-08  
**Branch:** `feat/audit-integrity-ux`  
**Status:** Approved for implementation  
**Goal:** Fix fiscal double-pay / involuntary condono, align lose toast, reduce demand-popup spam, centralize save migrate, light hygiene.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| F24 during collection | **C** — block payF24 in `cartella` / `enforcement` / `terminal`; allow in `rateazione` only for liabilities **not** in cartella snapshot |
| Close case | Mark paid **only** snapshot liability ids |
| Demand popup | Edge-trigger: show only when regime is secca/boom **and** changed vs previous month |
| Persist | `migrateGameState` on load (slots/cloud) |
| Hygiene | Rival response helper; drop unused `"overdue"` stage; stop tracking heavy `graphify-out/graph.json` if present |

## Fiscal

On `maybeOpenCartella`, set `collectionCase.liabilityIds` to ids of overdue liabilities that form `principal`.

`payF24`:
- if `collectionCase?.stage` in `cartella|enforcement|terminal` → no-op (store toast explains)
- else pay due liabilities whose id is **not** in `liabilityIds` (when rateazione) or all due (when no case)

`markOverdueLiabilitiesPaid` / close / successful `pay_all`: only ids in snapshot (fallback: all overdue if snapshot missing on legacy saves).

HUD / TaxPanel: disable F24 CTA when stage blocks pay.

## Toast / popup / migrate / hygiene

- Lose toast branches on `loseReason === "fiscal"`.
- Store keeps `prevDemandRegime` (or compare before refresh) for edge-trigger popup.
- `migrateGameState` consolidates `??=` defaults used in `advanceMonth`.
- Deduplicate rival anchor-clear; remove dead `CollectionStage` member; gitignore/untrack `graphify-out/graph.json` if tracked.

## Done when

- Tests cover double-pay blocked + snapshot close + new F24 payable in rateazione
- Fiscal lose toast correct; demand popup not every secca/boom repeat
- `npm run lint && npm test && npm run build` green

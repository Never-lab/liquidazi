# Ads stub (light placements) — Design

**Date:** 2026-08-08  
**Status:** Approved (brainstorming)  
**Goal:** Ship non-invasive ad *placeholders* so monetization can start later without paywalls, pay-to-win, or third-party scripts. Real ad networks are out of scope for this slice.

## Locked decisions

| Decision | Choice |
|----------|--------|
| Placement | **C** — desktop side rails in-game + banner on end screen |
| Provider (now) | **D** — visual stub only (“Spazio advertiser”); wire AdSense/ethical later |
| Intensity | Light; never inside the month loop (board / Chiudi mese) |
| Economy | No effect on sim, cash, leaderboard, or unlocks |

## Approach

Single reusable `AdSlot` component with a `placement` id. Stub UI only. Kill switch via Vite env so ads can be hidden in local/dev without code edits.

## Placements

| Id | Where | When visible | Suggested size |
|----|--------|--------------|----------------|
| `rail-left` | Beside game desk (left) | Desktop wide only (e.g. `min-width: 1200px`) | ~120–160 × 240–600 |
| `rail-right` | Beside game desk (right) | Same breakpoint | Same |
| `end-banner` | `EndScreen` (lost **and** won) | Always on that screen (all viewports) | ~320×50 mobile / up to ~728×90 desktop fluid |
| `landing-mid` | `LandingScreen` below “Cosa simuli” | Layout reserve; on unless `VITE_ADS_STUB=0` | ~full content width × ~90 |
| `landing-footer` | `LandingScreen` above Classifiche/Tutorial | Same | Same |

**Mobile:** no rails; only `end-banner` after the run ends. Landing stubs stay visible on all viewports (marketing layout).

**Not allowed:** overlays on Commesse, sticky HUD actions, event/project modals, or any control that advances the month.

## Stub UI

- Bordered surface labeled **“Spazio advertiser”** (Italian).
- Optional secondary line: “Supporta Liquidazi” or “Diventa sponsor” linking to a configurable URL (`VITE_ADS_SPONSOR_URL`) — if unset, no link.
- No iframes, no external ad scripts, no cookies from ad networks.
- Visually quiet: match existing surface/border tokens; no animation spam, no fake “X” that looks like a close for a real ad network.

## Kill switch

- `VITE_ADS_STUB` — default **on** in production builds when unset is acceptable, or default **off** in dev: prefer **default on only when `import.meta.env.PROD`**, and allow explicit `VITE_ADS_STUB=0` to force off / `=1` to force on.
- When off: `AdSlot` renders `null` (no empty gap that breaks layout — rails simply absent).

## Layout notes

- GameHUD: wrap desk in a row; rails are siblings outside the main `desk` column so they never steal touch targets.
- Narrow viewports: CSS hides rails; no JS required beyond the breakpoint class/media query.
- EndScreen: one banner below the outcome summary, above primary CTAs (or immediately below CTAs if summary+form is crowded — prefer **below summary, above post-mortem form** so the result stays first).

## Out of scope

- Google AdSense / EthicalAds / any third-party tag
- CMP / cookie consent banner for ads
- Paid remove-ads SKU / Plus plan
- Frequency capping, fill rates, revenue dashboards
- Changing educational disclaimer beyond a one-line “gli spazi advertiser sono segnaposto” if needed in Guida (optional, not required for v1)

## Done when

- Five placements exist behind `AdSlot` + env kill switch (`landing-*` on unless forced off).
- Rails visible only on wide desktop; end banner on KO and win; landing mid+footer on marketing door.
- No third-party scripts; lint/test/build green.
- No sim / progression changes.

## Self-review

- Locked C + D consistent.
- Mobile behavior explicit (no rails).
- Future network swap = replace stub body inside `AdSlot` only.

# Public landing (competitive bet B1) — Design

**Date:** 2026-08-08  
**Status:** Approved (brainstorming)  
**Parent:** [competitive-bets](./2026-08-08-competitive-bets-design.md) — bet **B1**  
**Goal:** Give cold visitors a Capital-Rift-grade *door*: brand-first public landing before auth, with clear Italian positioning and a path to play — without building a live stats API yet.

## Locked decisions

| Decision | Choice |
|----------|--------|
| Placement | New `LandingScreen`; store screen `"landing"` **before** auth |
| Stats | Hybrid **C** — stub UI slots; static/`—` until public API later |
| Primary CTA | **Gioca gratis** → `AuthScreen` (guest/login/register unchanged) |
| Logged-in rehydrate | Skip landing → existing `intro` / `menu` |
| Logout | Prefer return to **landing** (not raw auth) |

## Approach

Dedicated React screen in the existing SPA (same Railway deploy). No separate marketing site. Minimal store/routing changes: add `"landing"` to `Screen`, default cold `screen: "landing"`, wire `App.tsx`.

## Flow

```
cold start (no auth)     → landing
CTA Gioca gratis         → auth
CTA “Ho già un account”  → auth (optional second button; same screen)
logged-in rehydrate      → intro | menu (unchanged via screenAfterAuth / cloud)
logout                   → landing
```

Secondary links on landing (text/ghost): Guida (or Tutorial), Classifiche — only if reachable **without** auth today (leaderboard is public via API; guide may require being in app — if Guida needs auth context, link to Tutorial or open Guida after auth; prefer **Classifiche** + short “Cos’è” section on-page).

## First viewport (one composition)

Must pass brand test: without nav chrome, still read as Liquidazi.

| Element | Content |
|---------|---------|
| Brand | **Liquidazi** hero-level (not eyebrow-only) |
| Headline | Working: *L’unico sim che ti fa sentire l’F24.* |
| Support | One short sentence: SRL italiana, cassa, F24 — educational, not MMO |
| CTA group | Primary **Gioca gratis**; optional secondary **Ho già un account** |
| Visual | Atmosphere via existing tokens (gradient/pattern); optional soft stylized HUD silhouette as **full-bleed / background plane** — no inset card collage, no floating promo chips on the hero |

Respect product frontend rules: one job in hero; no stat strip *in* the first viewport (stats go below).

## Below fold

1. **Three points** (one section): F24 / cartella · loop mese (rosso / sopravvivenza) · geo Italia (comuni ISTAT).  
2. **Ad stub mid** (`landing-mid`) — blank “Spazio advertiser” via shared `AdSlot` (layout reserve; no network).  
3. **Stats stub row** (not hero): three labeled slots  
   - Run (periodo)  
   - Mesi medi al KO  
   - Record sopravvivenza  
   Values: em dash or honest static placeholder copy (“Presto live”); structure ready for `GET /api/public/stats` later.  
4. Disclaimer one-liner (educational model).  
5. **Ad stub footer** (`landing-footer`) — second blank slot above secondary links.

## Store / persist

- `Screen` union includes `"landing"`.
- Initial state for new installs: `screen: "landing"`.
- `partialize`: do not persist `"landing"` as a trap if odd; prefer persisting `auth` and on rehydrate if `auth` → skip to post-auth screen; if no auth → `"landing"`.
- `bareShell` in `App.tsx` includes `"landing"` (no app header chrome).

## Visual / CSS

- New `LandingScreen.tsx` + `LandingScreen.module.css` (or reuse `MenuScreen.module.css` tokens carefully without turning menu into marketing).
- Expressive type already in app where possible; avoid introducing Inter/Roboto stacks.
- Motion: 2–3 subtle (brand fade/slide, CTA appear) — not noise.

## Out of scope

- Real public stats endpoint  
- EN i18n, trailer video, paywall  
- B2 first-win / B3 share card (separate bets)  
- Redesign of AuthScreen beyond receiving traffic from landing  

## Done when

- Cold visitor sees landing first; CTA reaches auth; logged-in users never stuck on landing.
- Hero matches positioning + brand-first composition.
- Stats stub visible below fold.
- `npm run lint && npm test && npm run build` green.

## Self-review

- Locked A/B/C from brainstorming reflected.
- Hero vs below-fold stats separation explicit.
- Persist/rehydrate edge cases named.

# Competitive bets (post Capital Rift scan) — Design

**Date:** 2026-08-08  
**Status:** Approved — **B1 landing** chosen first ([landing design](./2026-08-08-landing-design.md))  
**Goal:** Turn market research into a short list of bets Liquidazi should win — without copying Capital Rift’s shared-world MMO model.

## Research summary (locked context)

### Category map

| Lane | Examples | Player buy |
|------|----------|------------|
| A. Shared-world economy | Capital Rift, Tradez.eu, Virtonomics, Vabrik | Persistence, other players, live prices |
| B. Tycoon / startup / idle | Capitalism Lab, Founderox | Scale fantasy, long sessions |
| C. Edu / school / “feel the books” | CONFAO Business Game, Simulimpresa, VBC | Didactics, tournaments, plausible compliance |

**Liquidazi position:** lane **C** with some **B** systems (holding, rival, demand regimes).  
**Capital Rift position:** lane **A** (closed beta, Google auth, ~$5 access, live GDP/commodity ticker).

### Strategic rule

Do **not** compete head-to-head on shared commodity MMO. Compete on **Italian SRL feel + clarity + memorable month loop**, and steal **growth/UX patterns** from A/B (landing spectacle, time-to-first-win, shareables).

### Moat already owned

F24 / cartella / payroll withholdings / IRES–IRAP / ISTAT geography / Euribor+Fondo PMI — rare among browser tycoons.

### Where we lose today

1. Marketing / first impression (repo vs “live world” landing)
2. Time-to-fun vs homework feel before first clear win
3. Live social proof on the door (not only post-run leaderboards)
4. Light social retention (share / weekly challenge)
5. Classroom packaging for Italian schools/ITS
6. Perceived polish vs glamorous betas

### Evidence limits

Capital Rift in-game client not fully played (Google + paid gate). Landing + `/api/access/status` inspected 2026-08-08 (~230/300 online, `priceCents: 500`, commodity board).

---

## Locked product bets

### P0 — ship next (competitive table stakes)

| Id | Bet | Success metric (directional) |
|----|-----|------------------------------|
| **B1** | **Public landing** — Italian claim, 3 screenshots/gifs, “Gioca gratis”, one live-ish stat (runs this week / median months-to-KO) | Visit → play click rate; bounce down |
| **B2** | **Time-to-first-win ≤ ~8 min** — guided first month celebrates a clear win (first invoice accepted and/or first F24 paid) before stacking midgame systems | % of new runs that pay first F24 or close month 1 without rage-quit signal |
| **B3** | **Shareable end card** — KO/win summary image or deep-linkable text (months, cause, city, difficulty) | Shares / copy clicks; return visits from shared links |

**Positioning line (working):** *“L’unico sim che ti fa sentire l’F24.”*  
Not: “world’s largest economy simulator.”

### P1 — durable advantage

| Id | Bet |
|----|-----|
| **B4** | Classroom lite — class code, N slots, teacher-facing summary |
| **B5** | Weekly challenge — fixed seed/difficulty, weekly board (social without MMO) |
| **B6** | Mobile/PWA usable on core month loop |

### P2 — defer (lane A cost)

Shared player markets, commodity exchange, persistent multiplayer world — only after P0/P1 have users and a monetization path (Plus / classroom / light ads already started).

### Monetization alignment

Prefer **free core + Plus/classroom** and light end/rail ads. Optional soft paid event later; avoid hard CR-style gate that blocks edu/guest discovery.

---

## Delivery shape

1. Approve this design.
2. Pick **one** P0 bet to implement first (recommended order: **B2 → B3 → B1**, or **B1 first** if growth/top-of-funnel is the bottleneck).
3. Spec detail + plan for that bet only (small PR).
4. Measure with Controllo / simple counters where cheap; no heavy analytics platform required in v1.

## Out of scope for this design doc

Implementing Capital Rift features, rewriting the sim core, or committing to MMO infrastructure.

## Done when (this slice of work)

- This file approved.
- ROADMAP **Next** lists “Competitive bets (P0)” with link here.
- First chosen P0 has its own implementation plan and is in progress or shipped.

## Self-review

- Lane rule explicit (don’t chase CR world).
- Moat and gaps listed.
- P0/P1/P2 separated; metrics light but named.
- No TBD on strategy; implementation detail deferred to per-bet plans.

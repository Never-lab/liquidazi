# Holding — acquisizioni, miglioramento, flip + plusvalenza IRES — Design

**Date:** 2026-08-07  
**Branch:** `feat/holding-flip-acq`  
**Status:** Approved for planning  
**Goal:** Transform the lite 3-slot subsidiary portfolio into a proper holding loop: buy, improve (drift + CAPEX), list/auction-sell, and tax capital gains via year-end IRES.

## Context

Today (`src/sim/acquisitions.ts`, `InvestmentsPanel`): max 3 subsidiaries, monthly EBITDA drip, integration risk, board every 3 months. No sell, no improve, no EBITDA growth, no `purchasePrice` stored. Copy already admits “portfolio lite / non seconda SRL fiscale.” Feedback: useless as a holding; need flip + management + scalable slots + plusvalenza on sale.

Chosen fantasy: **hybrid** (drip + improve + flip). Delivery: **dedicated Holding module** (not a patch inside Investimenti alone).

## Requirements

1. Player can buy targets, hold for drip, improve EBITDA over time, and sell (flip) via a short auction.
2. On sale, capital gain vs purchase price feeds **year-end IRES** (not a spot F24).
3. Holding slots start small and **scale** (base 4 → max 8) via milestone/upgrade — not a hard forever-3.
4. Management UI is a dedicated Holding surface (ops tab or panel under Crescita), separate from treasury/growth invest.
5. Saves migrate safely; Italian didactic copy; no new npm deps; keep educational disclaimer (no PEX / real M&A law).

## Non-goals

- Full second SRL books / consolidated fiscal group / PEX exemption modeling
- Multi-buyer negotiation UI beyond 1–2 offers
- Infinite slots or soft-only caps without a hard max
- Spot capital-gains F24 at sale time
- Reworking treasury / growth-slot invest (they stay in Investimenti)

## Design decisions (locked)

| Topic | Choice |
|-------|--------|
| Loop | Hybrid: drip + CAPEX + passive drift + sell |
| Slots | Scalable: base **4**, max **8** |
| Plusvalenza | Into FY **IRES** base (option B) |
| Improve | Passive drift **and** paid CAPEX (option C) |
| Sale | Auction lite: list → 1–2 offers in 1–2 months (option C) |
| Scope | Dedicated Holding module (approach 2) |

---

## 1. Loop and data model

### Monthly loop

1. Acquisition board refreshes every 3 months → **Acquista** (cash out, 1 slot).
2. Each month: EBITDA drip → cash + `ytd.revenue`; slow EBITDA drift; integration risk (existing, lightly retuned).
3. **CAPEX**: pay cash → boost EBITDA (and thus estimated value); cooldown.
4. **Metti in vendita** → over 1–2 months, 1–2 `SaleOffer`s appear; accept → cash; reject/expire → stays in portfolio.
5. `gain = max(0, salePrice − purchasePrice)` accumulates in YTD capital gains → IRES at FY close. Net YTD gains floored at 0 for tax base. No cash refund on losses.

### Types

```ts
interface Subsidiary {
  id: number;
  name: string;
  sector: SectorId;
  monthlyEbitda: number; // mutable
  capacityBonus: number;
  monthsOwned: number;
  risk: AcquisitionRisk;
  purchasePrice: number;
  listedUntilMonthIdx: number | null; // null = not listed
  capexCooldownMonths: number; // 0 = can CAPEX
}

interface SaleOffer {
  id: number;
  subsidiaryId: number;
  price: number;
  expiresMonthIdx: number;
}

// GameState additions / changes
holdingSlotCap: number; // default 4, max 8
saleOffers: SaleOffer[];
// YearToDate + YearReport
capitalGains: number; // YTD net (or raw; tax uses max(0, …))
```

Replace hard `MAX_SUBSIDIARIES = 3` with `holdingSlotCap` (constant `HOLDING_SLOT_BASE = 4`, `HOLDING_SLOT_MAX = 8`). Buy blocked when `subsidiaries.length >= holdingSlotCap`.

### Estimated value

`estimateSubsidiaryValue(sub) ≈ monthlyEbitda * multiple(risk, monthsOwned)`  
Multiple band ~8–14× monthly EBITDA, worse risk → lower multiple. Used for UI hints and offer generation (offers land ~70–110% of estimate).

---

## 2. UI and IRES fiscal

### UI

- New ops tab **Holding** (preferred) or dedicated `HoldingPanel` under Crescita.
- `InvestmentsPanel`: treasury + growth reinvestment only (strip acquisition UI).
- Per subsidiary: name, risk, EBITDA, estimated value, purchase price, months owned, actions **CAPEX** / **Metti in vendita** / listing state.
- Active offers: Accetta / Rifiuta + expiry.
- Didactic hint: plusvalenza entra nell’utile IRES a fine anno (modello semplificato, no PEX).

### Fiscal

- On accept sale: `cash += salePrice`; remove subsidiary + related offers;  
  `ytd.capitalGains = round2(ytd.capitalGains + (salePrice − purchasePrice))` (can go negative YTD; IRES uses `max(0, capitalGains)` contribution or fold into profit carefully — see below).
- FY close (`month === 12`):  
  `profit = revenue - purchases - payrollCost - interest - otherCosts + max(0, capitalGains)`  
  (v1: losses on portfolio sales do not reduce operating profit; only positive net YTD gains increase IRES base. Document in UI.)
- IRES unchanged formula: `max(0, profit) * ires_rate`.
- Report panel: line **Plusvalenze partecipate**.
- CAPEX: cash out + `ytd.otherCosts` (not free fiscally).
- EBITDA drip: remains `ytd.revenue` (current behavior).

### Edge cases

- Full slots → no buy (toast).
- While listed → no CAPEX, no second list.
- Expired offers removed on month advance; if listing window ends with no accept, clear listing flag.
- Insufficient cash → no-op + toast.

---

## 3. Actions, numbers, migration, tests

### Actions (sim + store)

| Action | Effect |
|--------|--------|
| `buyAcquisition` | Existing + persist `purchasePrice`; respect `holdingSlotCap` |
| `investSubsidiaryCapex(id)` | Cost ≈ 6× monthly EBITDA; +12–20% EBITDA; cooldown 6 months |
| `listSubsidiaryForSale(id)` | Set listing window; queue offer generation in advanceMonth |
| `acceptSaleOffer(id)` / `rejectSaleOffer(id)` | Cash + gains / discard offer |
| Slot unlock | Milestone and/or upgrade bumps `holdingSlotCap` by 1 up to 8 |

`advanceMonth`: drift, offer spawn/expiry, listing cleanup, board refresh, existing drip/risk.

### Tunables (config module, e.g. `src/config/holding.ts`)

| Knob | v1 |
|------|-----|
| Slot base / max | 4 / 8 |
| Drift | ~±0.5–1.5%/month by risk |
| CAPEX | cost 6× EBITDA/mo → +12–20% EBITDA, CD 6 mo |
| Offers | 1–2 within 2 months of listing; 70–110% of estimate |
| Value multiple | 8–14× monthly EBITDA × risk factor |

### Migration

- Missing `purchasePrice` → `round2(monthlyEbitda * 10)`.
- `holdingSlotCap` default 4; if `subsidiaries.length > cap`, keep all (no auto-sell); block new buys until unlock or sale.
- `ytd.capitalGains` / report field default 0; `saleOffers` default `[]`; listing/cooldown defaults.

### Tests

- buy → list → offer → accept → cash + `capitalGains`.
- Positive gain increases December IRES vs identical year without sale.
- CAPEX raises EBITDA and sets cooldown; blocked while listed / on cooldown / no cash.
- Slot cap blocks buy; unlock raises cap.
- `quietMode`: drip yes, no integration hits (preserve).
- Migration fixtures for old subsidiaries without `purchasePrice`.

---

## Architecture sketch

```
HoldingPanel (UI)
    → gameStore actions
        → sim/acquisitions.ts (+ sell/capex/list) + config/holding.ts
        → advanceMonth (drift, offers, drip)
        → FY close uses ytd.capitalGains in profit
InvestmentsPanel — treasury + growth only
```

Keep logic in sim (testable); UI thin. Prefer extending `acquisitions.ts` (or split `holding.ts` if file grows past ~250 lines) over scattering rules in the store.

## Out of scope follow-ups (ROADMAP)

- PEX didactic toggle / partial exemption
- Buyer sectors / synergy with player sector
- Holding-only compliance events
- Soft cap above 8 via prestige endgame
```

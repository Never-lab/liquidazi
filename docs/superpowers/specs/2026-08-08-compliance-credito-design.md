# Compliance recovery + Credito (multi-mutuo) — Design

**Date:** 2026-08-08  
**Status:** Approved for implementation  
**Goal:** Compliance recovers when taxes are in order; credit panel/caps are clearer and midgame-viable; up to 2 mortgages with refinance (sostituzione semplificata).

## Scope

In scope:
- Monthly compliance +3 when in fiscal order
- Loan caps / fido formula / Credito UI copy
- `loans: Loan[]` max 2 + refinance (new principal extinguishes old residual; cash gets net)
- Migrate legacy `loan` → `loans`
- Tests + wiki/help finanza + ROADMAP note

Out of scope:
- Full Italian banking law / multi-step surroga / mortgages on real estate
- >2 simultaneous loans
- Changing late-F24 malus (−10) or spread band thresholds (+100/+200 bps)

## Compliance

End of month (after F24 penalty / mora / collection ticks), if:

- `collectionCase` is null **or** stage is `rateazione` only (not `cartella|enforcement|terminal`), **and**
- `monthsTaxOverdue === 0`

then `compliance = min(100, compliance + 3)`.

Responsabile (+2 each) and gestionale F24 Lv2/3 bonuses unchanged. Late F24 still applies `compliance_malus_late` (10).

TaxPanel + LoanPanel: short note that staying in regola recovers +3/mese.

## Credit caps

| Item | Value |
|------|--------|
| `loan_max_principal_base` | 35_000 |
| `loan_max_principal_fondo` | 75_000 |
| Offer cards | 10k / 30k / Fondo 60k (36m) |
| `FIDO_MAX` base | 25_000 |
| Fido if compliance ≥ 70 | `min(40_000, round(cash * 0.5 + 10_000))` then still ≤ that; apply existing &lt;70 / &lt;40 multipliers on the **base** 25k path: prefer compute `raw = compliance≥70 ? min(40k, round(cash*0.5+10k)) : 25k`, then if compliance &lt;40 → `round(raw*0.5)`, elif &lt;70 → `round(raw*0.75)` |
| Spread penalty | unchanged (&lt;40 → +200 bps, &lt;70 → +100) |

## Loans: max 2 + refinance

### State

- Prefer `loans: Loan[]` on `GameState` (max length 2).
- Migrate: if legacy `loan` present and `loans` missing/empty, `loans = [loan]`; then clear or leave `loan` unused (`loan` deprecated / removed from new writes; migrate on load + `migrateGameState`).

### Rules

- `loanRefusalReason`: reject if `loans.length >= 2` (unless refinance targeting one id).
- Monthly: for each loan with `outstanding > 0`, run existing amortization step (same as today’s single-loan block).
- Rescue offer: allowed if `loans.length < 2`.

### Refinance (sostituzione)

UI: pick existing loan id + new request (or “Rifinanzia con…” on a card).

On success:

1. `residual = target.outstanding`
2. Require `req.principal >= residual` (else refuse: importo troppo basso per chiudere).
3. Remove target from `loans`.
4. Disburse `net = principal - residual` to cash (can be 0).
5. Push new `Loan` with full `principal` outstanding starting at `principal`… **Correction:** outstanding of new loan = `principal` (bank funds full amount; `residual` is paid to extinguish old; cash += `principal` then cash -= `residual`, i.e. cash += net). YTD interest unchanged at signature.
6. `loans.length` after: old removed + new added (count may stay same).

If not refinancing: append new loan when `loans.length < 2`; cash += principal as today.

### Credito UI

- List each open loan (outstanding, rata, mesi).
- Offers + personalizza: if 1 loan open, show refinance toggle / select which to replace.
- Banner: compliance, spread bps, fido cap, `mutui aperti n/2`.

## Done when

- Paying on time from compliance 0 recovers +3/month in tests
- Two loans can coexist; third refused; refinance closes one and nets cash
- Caps match table; `npm run lint && npm test && npm run build`
- Help/wiki finanza updated briefly

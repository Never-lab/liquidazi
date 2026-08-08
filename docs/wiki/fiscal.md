# Fiscal (F24 + riscossione)

Educational pipeline — not live tax law. Constants: `src/config/collection.ts`. Logic: `src/sim/collection.ts`, wired from `advanceMonth`. Integrity rules: `payF24` / `f24BlockedByCollection` in `actions.ts` + `collection.ts`.

## Monthly F24

IVA liquidation and withholdings from the prior month come due (UI banner). Paying clears **due** liabilities; **skipping** triggers the existing one-shot penalty path (`penalized`) plus compliance hit (bank spread).

### F24 vs open collection case

On cartella open, `collectionCase.liabilityIds` snapshots the overdue ids that form `principal`.

| Stage | `payF24` |
|-------|----------|
| `cartella` / `enforcement` / `terminal` | **No-op** (CTA disabled; toast explains) |
| `rateazione` | Pays due liabilities **not** in the snapshot (new F24 OK; cartella debt stays in the plan) |
| no case | Pays all due liabilities |

Closing the case (`pay_all` success, rateazione done, enforcement clear) marks paid **only** snapshot ids (legacy saves without snapshot: all overdue).

## Mora

While tax is overdue and no open `collectionCase`, monthly mora accrues at **`MONTHLY_MORA_RATE = 0.01`**. `monthsTaxOverdue` tracks continuous overdue months.

## Cartella

At **`MONTHS_BEFORE_CARTELLA = 6`** continuous overdue months → open cartella (`pendingEvent` id `fiscal_cartella`). Choices:

| Choice | Effect (summary) |
|--------|------------------|
| Paga tutto | Clear case if cash allows; compliance recovery |
| Rateizza | **12** months plan, **10%** fee (`RATEATION_*`) |
| Ignora | Compliance hit; enforcement path |

While `collectionCase != null`, do not open a second cartella; case tick owns principal/plan.

## Enforcement → lose

- Enforcement aggio **`ENFORCEMENT_AGGIO = 0.08`**
- **`ENFORCEMENT_MONTHS_TO_TERMINAL = 4`** then terminal stage
- **`TERMINAL_MONTHS_TO_LOST = 3`** → `status` lost with **`loseReason: "fiscal"`** (toast: insolvenza fiscale, not “12 mesi in rosso”)
- Lost threshold helper: `lostThreshold(ytdRevenue) = max(2000, 5% ytd)`

## Boss months

June / November IRES–IRAP style payments remain separate from collection (see README / fiscal snapshot). Collection is about unpaid F24 / cartella.

Tests: `src/sim/phase-collection.test.ts`, `phase4.f24.test.ts`.

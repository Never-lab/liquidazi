# Staff & operations

## Roles and capacity

Staff roles and pay math live in `src/config/staffPay.ts`. Monthly capacity for accepting work comes from `monthlyCapacity` in `src/sim/events.ts` (staff + contracts + supplies + pressures).

Board soft cap: `BOARD_MAX_OPS = 10` sale/supply lines.

## Accept rejects (UI hints)

Blocked accepts set `lastUiHint` (toast only — not `game.log`):

- Already **2** active contracts
- Capacity full (contracts or monthly slots)
- No free slot (contracts / pressure / zero supplies)

See [ui-feedback.md](ui-feedback.md).

## Payroll

Monthly payroll in `advanceMonth` (`runPayroll`): gross, INPS, IRPEF withholdings → liabilities; December didactic 13ª (2×).

## Annual staff oneri

Each **December**, `totalAnnualStaffOneri(employees)` debits cash (balance pass #1). Logged as “Oneri annuali personale”. Shown in year report fields (`staffAnnualOneri`). Tests: `phase-staff-oneri.test.ts`.

## Morale / resignation

`src/sim/morale.ts` — drift and resignation rolls during the month pipeline.

## Projects & upgrades

Annual project draws (`drawProjectOptions` / `src/sim/projects.ts`) and upgrade levels (`src/config/upgrades.ts`, `migrateUpgrades`) are midgame progression — see tests `phase-projects.test.ts`, `phase-staff-upgrades.test.ts`.

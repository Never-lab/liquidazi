# Task 5 report — ROADMAP + verify gate

## Status

**Complete.** Balance pass #5 (shock timing) and #1 (oneri staff) marked shipped in ROADMAP.

## ROADMAP changes

- **Done:** added row for balance pass #5+#1 with plan/spec links.
- **Next:** item 1 updated to remaining backlog (#2 domanda, #3 scorte, #4 rep, #6 shock senza stock).
- **Backlog bilanciamento:** items #1 and #5 struck through with "→ shipped"; suggested attack order rows 1–2 updated.

## Verify gate

```
npm run lint   → exit 0 (5 pre-existing oxlint warnings, no errors)
npm test       → 240 passed / 41 files
npm run build  → exit 0 (chunk size advisory only)
```

No code fixes required.

## Commit

- `docs: mark balance pass #5+#1 shipped in ROADMAP` (ROADMAP.md only)

## Concerns

- Treasury settlement (+1 month lag) from backlog #5 was **not** shipped; only shock-at-month-open timing. ROADMAP attack-order note reflects this.
- Remaining balance backlog (#2–#4, #6) still in Next.

## Branch

`feat/balance-pass-shock-staff` — 7 commits ahead of `origin/main` after this commit.

## Whole-branch review fixes

- Report UI now separates annual staff oneri from the residual “Altri costi” total.
- Treasury bailout on event resolution is limited to shock definitions; ordinary choices leave treasury untouched.
- Immediate-shock toasts prefer the shock log when an emergency-fund log was added afterward.
- Shock tests remove the dead quake setup and fragile universal cash-drop assertion; a regression test covers ordinary choices.
- ROADMAP clarifies that settlement +1 remains deferred.

## Fix verification

```
npx vitest run src/sim/phase-shocks.test.ts src/sim/phase-staff-oneri.test.ts src/config/staffPay.test.ts
→ 17 passed / 3 files

npm test
→ 241 passed / 41 files
```

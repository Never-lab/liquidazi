### Task 7 report: UI Credito (offerte + piano + fido)

**Status:** Done.

**Commits:** `2669f72` — "Rewrite Credito UI with offers, schedule, and clearer fido." (5 files: LoanPanel.tsx, panels.module.css, sim/actions.ts, sim/advanceMonth.ts, sim/types.ts)

**Tests/build:** `npm run build` ✅, `npm test -- --run` ✅ (20 files, 116 tests passed).

**What changed:**
- `LoanPanel.tsx` rewritten: compliance warning kept; rescue card ("Offerta di salvataggio") wired to `acceptLoanOffer`/`declineLoanOffer` (already exported by `gameStore`, no store changes needed); active loan shows stats + a scrollable amortization table via `remainingSchedule`; no-loan state maps `buildLoanOffers(game)` to cards with TAN/rata and disables "Richiedi" per `disabledReason`; added a "Personalizza mutuo" toggle with live `frenchPayment`/`loanRefusalReason` preview; Fido card now shows `lastInterest`.
- `types.ts`: added `Fido.lastInterest?: number`.
- `advanceMonth.ts`: sets `next.fido.lastInterest = interest` when charging fido interest.
- `actions.ts`: exported previously-private `spreadForGuarantee` so the panel can compute the live-preview TAN for arbitrary custom principal/guarantee (mirrors `buildLoanOffers` logic exactly).
- `panels.module.css`: added `.tableWrap`/`.table` (sticky-header scrollable schedule table) and `.toggle` (link-style button) classes; no new deps.

**Concerns:** `spreadForGuarantee` export is a minor scope addition beyond the 3 listed files, needed since it was previously module-private and there was no other way to preview TAN for custom guarantee/principal combos — behavior itself is unchanged. No `LoanPanel` unit tests existed before or were added; coverage relies on existing `actions.ts` tests plus build/typecheck.

**Path:** `C:\Users\nicho\Documents\liquidazi`

---

### Follow-up: non-positive principal in personalizza

**Status:** Done.

**Commits:** `0c002d9` — "Disable personalizza loan request for non-positive principal."

**What changed:**
- `loanRefusalReason`: returns `"Inserisci un importo positivo"` when `principal <= 0` (after active-loan check).
- `LoanPanel` personalizza already disables "Richiedi mutuo" and shows `customRefusal` — no UI changes needed once sim helper is hardened.
- `phase-loan-schedule.test.ts`: test for `principal` 0 and negative.

**Tests:** `npm test -- --run src/sim/phase-loan-schedule.test.ts` ✅ (15 tests).

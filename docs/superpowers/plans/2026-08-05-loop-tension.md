# Loop tension (pressioni / contratti / rivale) Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Rompere la ripetizione del loop mensile con pressioni trimestrali, contratti multi-mese e un rivale locale, senza nuovi sistemi fiscali.

**Architecture:** Tre moduli puri (`pressures.ts`, `contracts.ts`, `rival.ts`) agganciati a `advanceMonth` / `events` / `actions`. UI = chip + badge.

**Tech Stack:** Vite, React, Zustand, Vitest (esistente).

## Global Constraints

- Branch `fix/loop-tension-clarity`
- No nuove dipendenze npm
- Ponytail: niente seconda SRL, niente UI kit
- `quietMode` salta rival steal e roll pressione aggressiva (calendario pressione sì, o skip totale in quiet — preferisci skip rival+pressure roll in quiet)
- `npm test` deve restare verde

---

### Task 1: Tipi + pressures

- [ ] Aggiungere a `GameState`: `quarterPressure`, `activeContracts`, `rival`
- [ ] Init in `createInitialGameState` / seed
- [ ] Creare `src/sim/pressures.ts` con ids, `rollPressure`, `tickPressure`, helpers modifiers
- [ ] Test: roll setta monthsLeft=3; tick decrementa

### Task 2: Contratti

- [ ] `Opportunity.contractMonths?: number`
- [ ] `generateOpportunities`: ~25% sale con contractMonths=3
- [ ] `acceptOpportunity` → push `activeContracts`
- [ ] `monthlyCapacity` sottrae slot contratti
- [ ] `tickContracts` in advanceMonth (tranche + monthsLeft)
- [ ] Test: accept riduce capacity; dopo 3 tick contratto sparisce

### Task 3: Rivale

- [ ] Seed rival in seedNewGame
- [ ] `applyRivalBoardSteal` dopo refreshMarketBoard
- [ ] Heat update semplice in accept/decline o fine mese
- [ ] Test: con heat alto e non-quiet, board può perdere una sale

### Task 4: Wiring + UI + harden

- [ ] advanceMonth: tick pressure, contracts, harden mid-game
- [ ] hireEmployee blocca se hiring_freeze
- [ ] GameHUD chip; OpportunitiesPanel badge Contratto
- [ ] `npm test` + `npm run build`

---

**Done when:** test verdi; chip pressione visibile in partita nuova; contratto e rivale coperti da test.

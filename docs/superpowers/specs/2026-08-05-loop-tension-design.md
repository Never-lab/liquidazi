# Loop tension — pressioni, contratti, rivale

**Date:** 2026-08-05  
**Status:** approved  
**Branch:** `fix/loop-tension-clarity`

## Problem

Il loop mensile è chiaro ma ripetitivo: tabellone → accetta → chiudi → (a volte scelta). Dopo ~6–10 mesi le decisioni sono sempre uguali, la partita diventa facile una volta capito il trucco, e manca narrazione memorabile.

## Goals

1. **Stesse azioni, regole diverse** — pressioni trimestrali cambiano vincoli/payoff.
2. **Decisioni più pesanti** — contratti multi-mese bloccano capacità.
3. **Narrazione locale** — un rivale nella provincia ruba deal e genera feed/scelte.
4. **Anti-exploit mid-game** — dopo mese 8, scorte e acquisizioni più dure su Normale/Difficile.

## Non-goals

- Nuova UI kit / rewrite HUD
- Seconda SRL fiscale
- Multiplayer / story campaign a capitoli
- Rivalità con bilanci completi del competitor

## Design

### A. Pressioni trimestrali

`quarterPressure: { id, label, monthsLeft } | null` su `GameState`.

All’ingresso nei mesi 1/4/7/10 (dopo advance, calendario nuovo), se `monthsLeft` esaurito o null → `rollPressure(state)`.

| id | Effetti |
|----|---------|
| `cash_crunch` | affitto ×1.15; spread mutuo +50 bps effettivi via compliance-like o flag |
| `pa_wave` | `paChance` boost in generateOpportunities; capacity −1 se `supplyMonths===0` |
| `inspection` | `compliance_malus` ×2 su F24 saltati; log all’ingresso |
| `hiring_freeze` | `hireEmployee` no-op + toast |
| `boom` | ticket ×1.12; defaultChance ×0.7; supply consume 2× |

Ogni chiusura mese: `monthsLeft--`. A 0, log “Fine pressione X”.

HUD: chip “Q· label · Nm”.

### B. Contratti multi-mese

`Opportunity.kind` resta sale/supply; flag `contractMonths?: 3` su Opportunity.

- ~25% delle sale generate sono contratto (termine 3, titolo “Contratto · …”).
- Accettare: crea `activeContracts: { id, netPerMonth, monthsLeft, slotCost: 1 }[]`.
- Capacity: `monthlyCapacity -= sum(slotCost)` degli attivi.
- Ogni advanceMonth: per ogni contratto, emetti AR netto (o cash tranche didattica) e `monthsLeft--`.
- Max 2 contratti attivi.

### C. Rivale locale

```ts
rival: { name: string; heat: number /*0-100*/ } | null
```

Seed in `seedNewGame` / `createInitialGameState` con opts: nome da comune + “Competitor”.

Ogni refresh board (non quiet): se `heat > 40` e rand, rimuovi 1 sale dal board e log “{rival} ha preso una commessa”.  
Heat: +2 se rifiuti molte sale / mese passivo; −3 se accetti ≥ capacity/2 o campagna marketing.  
Scelta evento riusa pool o aggiungi 1 choice “rispondi al rivale”.

Milestone: opzionale `rival_contained` se heat &lt; 40 a mesiPlayed≥12 — skip se troppo: solo feed.

### D. Mid-game hardening

Se `difficulty !== easy` && `monthsPlayed >= 8`:

- Consume scorte anche con soli dipendenti (già parziale) + se staff&gt;0 sempre −1 (già)  
- Integration risk ×1.25 se compliance &lt; 70

## Files

| File | Change |
|------|--------|
| `src/sim/types.ts` | pressure, contracts, rival |
| `src/sim/pressures.ts` | NEW roll/apply modifiers |
| `src/sim/contracts.ts` | NEW accept/tick |
| `src/sim/rival.ts` | NEW heat/steal |
| `src/sim/events.ts` | PA boost, contract ops, capacity |
| `src/sim/advanceMonth.ts` | tick pressure/contracts/rival |
| `src/sim/actions.ts` | hiring_freeze guard |
| `src/screens/GameHUD.tsx` | chip pressione |
| `src/components/OpportunitiesPanel.tsx` | badge contratto |
| tests | pressures, contracts, rival |

## Verification

- `npm test` verde  
- Play: mesi 1–3 chip pressione; contratto blocca slot; rivale nel feed  

## Self-review

- No placeholders TBD  
- Scope capped: rival is feed+steal only  
- No contradiction with existing supply/F24 systems  

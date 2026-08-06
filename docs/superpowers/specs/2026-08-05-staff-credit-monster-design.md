# Staff ruoli + stipendi CCNL-lite + credito “mostro”

**Date:** 2026-08-05  
**Status:** approved (design conversation)  
**Scope:** personale differenziabile, retribuzioni per settore/scatti, UI credito con offerte + piano ammortamento + fido chiaro

## Problem

1. **Ruoli inutili** — Operaio / Impiegato / Responsabile differiscono solo sul lordo; `monthlyCapacity` conta `employees.length`. Impiegato e Responsabile sono strettamente peggiori.
2. **Stipendi non realistici** — preset fissi 1800 / 2200 / 3000, commento esplicito “non tabelle CCNL”.
3. **Credito opaco** — `LoanPanel` è un form grezzo (importo + select + bottone) senza preview rata, senza piano, senza messaggi di rifiuto utili; mutuo e fido confusi.

## Goals

1. Ogni ruolo ha un **effetto di gioco distinto** (capacità / lead-ticket / compliance).
2. Lordi **per settore** + **scatti anzianità** in ordine di grandezza CCNL PMI (didattico).
3. UI Personale e Credito spiegano **cosa ottieni** e **cosa paghi**.
4. Credito: **3 offerte precalcolate** + rata stimata + opzionale personalizza + **piano ammortamento** a mutuo attivo + fido leggibile.
5. Cedolino resta sullo snapshot fiscale semplificato (INPS/IRPEF/TFR già in `advanceMonth`).

## Non-goals

- Software paghe / CU / 730 / CCNL ufficiale certificato
- Multi-mutuo contemporanei (resta **un** mutuo a piano + **un** fido)
- Nuova UI kit globale / rewrite HUD intero
- Seconda SRL / bilanci IAS completi
- Calcolo rata INPS reale o curve di merito creditizio bancario

## Design

### A. Modello dipendente

Estendere `Employee`:

```ts
role: "Operaio" | "Impiegato" | "Responsabile"
grossMonthly: number          // lordo corrente (base settore + scatti)
hireMonthIdx: number
tfrAccrued: number
senioritySteps: number        // 0, 1, 2… (+4% ciascuno ogni 24 mesi di servizio)
```

`PRESET_ROLES` lascia il posto a `STAFF_ROLES` + tabella `CCNL_BASE_GROSS[sector][role]`.

#### Effetti per ruolo (capacità a pezzi)

Usare un helper `staffCapacityPoints(state): number` (float arrotondato in basso in `monthlyCapacity`):

| Ruolo | Punti capacità | Extra |
|--------|----------------|--------|
| Operaio | +1.0 | — |
| Impiegato | +0.35 | +1 sale target in `generateOpportunities`; `ticketCeiling` += 1200 per Impiegato |
| Responsabile | +0.5 | ogni advance: `compliance = min(100, compliance + 2)`; se `rival`, `heat = max(0, heat - 1)` |

Sostituire `const staff = state.employees.length` / core–extra 6+1/3 con somma punti ruolo, poi stesso soft-cap anti-spam: primi 6 punti 1:1, excess `floor(extra/3)` **oppure** equivalente su punti (documentare in implementazione: preferire “primi 6 **punti** full, excess /3” per non far tornare 100 operai = 100 slot).

`hiring_freeze` e fire/TFR invariati.

#### Stipendi base (lordo mensile, anno 0)

Ordine di grandezza 2024/25 PMI; fattori settore moltiplicano la riga `servizi`:

| Ruolo | servizi | commercio | artigianato | ristorazione |
|--------|---------|-----------|-------------|--------------|
| Operaio | 1650 | 1600 | 1700 | 1550 |
| Impiegato | 2150 | 2100 | 2050 | 2000 |
| Responsabile | 3450 | 3400 | 3300 | 3200 |

All’assunzione: `grossMonthly = base(sector, role)`.

**Scatti:** ogni 24 mesi di servizio (`monthsPlayed` calendar delta da `hireMonthIdx`), `senioritySteps++` e `grossMonthly = round2(base * (1.04 ** steps))` ricalcolato da base (non composto su composto sporco). Cap soft `steps <= 5` (≈ +21.7%).

UI mostra: effetto, lordo, **costo azienda stimato** ≈ `gross * (1 + inps_employer_rate) + gross * tfr_accrual_factor` (stesso snapshot), prossimo scatto.

### B. Personale UI

`PayrollPanel` (o rename copy “Personale”):

- Tre bottoni Assumi con blurb effetto + lordo + costo azienda.
- Lista dipendenti: ruolo, lordo, punti/effetto, scatto, Licenzia (+TFR).
- Ultimo cedolino + fondo TFR come oggi.

### C. Credito — modello

Nessun cambiamento al fatto che esiste al massimo un `loan` e un `fido`. Estendere utilità:

```ts
estimateInstallment(principal, tenorMonths, annualRate): { payment, firstInterest, firstPrincipal }
buildLoanSchedule(loan, asOfMonthsPaid): { month, interest, principal, residual }[]
buildLoanOffers(state): LoanOfferCard[]  // 3 carte
```

**Tre offerte default** (clampate a tetti snapshot + garanzia):

1. Piccolo — 10 000 € / 12m / none / fisso  
2. Medio — 25 000 € / 24m / none o fideiussione se serve tetto / fisso  
3. Fondo PMI — min(40 000, `loan_max_principal_fondo`) / 36m / `fondo_garanzia_pmi` / fisso  

Spread = `spreadForGuarantee` + `complianceSpreadPenaltyBps`. Rata = piano francese semplificato (rata costante su `outstanding` iniziale).

**Personalizza:** stesso form attuale ma con **live preview** rata/TAN/messaggio rifiuto (`canRequestLoan` + copy).

**Mutuo attivo:** lista debito, TAN, garanzia, ultima rata; sotto tabella **piano residuo** (rate rimanenti: interesse, capitale, residuo).

**Fido:** card — Accordato / Utilizzato / Disponibile / interessi mese (da `last` se tracciati, altrimenti formula); Preleva; copy rimborso auto.

**Rescue `loanOffer`:** render come carta “Salvataggio banca” con stessi campi rata.

Messaggi rifiuto espliciti:

- “Hai già un mutuo attivo”
- “Importo oltre il tetto senza garanzia / Fondo PMI”
- “Tetto fido ridotto (compliance)”

### D. Credito UI

Riscrittura `LoanPanel` (stesso file ok):

1. Sezione Mutuo — carte offerte **oppure** stato attivo + piano  
2. Toggle “Personalizza importo”  
3. Sezione Fido  

Niente dipendenze chart nuove; tabella HTML/CSS moduli esistenti.

### E. Test

- Capacità: 1 Operaio ≠ 1 Impiegato ≠ 1 Responsabile; mix somma punti.  
- Impiegato alza sale count / ticket ceiling.  
- Responsabile alza compliance su `advanceMonth`.  
- Scatto a 24 mesi aggiorna lordo.  
- `estimateInstallment` + schedule: somma capitali = principal; residuo finale ~0.  
- Offerte: 3 carte; request da carta = stesso path `requestLoan`.  
- Regressione payroll phase3 + loan phase6.

### F. Build order

1. Ruoli + tabella stipendi + scatti + `monthlyCapacity` / opportunities / compliance tick + UI Personale + test.  
2. Offerte credito + estimate rata + messaggi + fido UI + test.  
3. Piano ammortamento + personalizza live + test.

## Constraints

- No nuove npm deps.
- Copy italiano.
- Sim pura in `src/sim/*`; UI in components.
- Snapshot fiscale unico (`fiscalYearSnapshot`).
- Diff minimo fuori da staff/credito (no rewrite GameHUD salvo wiring sheet Operazioni).

## Success

- Assumere un Impiegato o Responsabile non è mai strettamente peggiore di un Operaio a parità di obiettivo (volume vs lead vs compliance).
- Giocatore vede rata e piano prima/durante il mutuo.
- `npm test` verde; stipendi e offerte documentati in questo spec.

# Balance pass — tesoreria shock timing + oneri annuali staff — Design

**Date:** 2026-08-08  
**Branch:** `feat/balance-pass-shock-staff` (provvisorio)  
**Status:** Approved for planning  
**Goal:** Chiudere due item P0 del backlog bilanciamento: (5) shock % non eludibili con azioni pre-ack, tesoreria solo come fondo emergenza; (1) costo annuale per testa sullo staff.

## Context

Backlog in [`ROADMAP.md`](../../../ROADMAP.md) § Backlog bilanciamento. Playtest Normale: (a) deposito tesoreria prima di accettare lo shock % sulla sola cassa; (b) mass-hire Operai senza onere annuale per testa oltre al payroll mensile.

Oggi: `tryQueueShock` mette uno shock in `pendingEvent`; l’hit cash avviene solo in `apply` al click. `shockCash` usa solo `company.cash`. Payroll mensile + soft-cap sì; niente addebito annuale headcount.

## Goals

1. Shock forced a **apertura mese**: danno applicato subito; messaggio (log + toast); player non può agire prima del hit.
2. Shock % colpisce **solo la cassa**. Tesoreria intatta salvo copertura emergenza se `cash < 0` dopo l’automatismo.
3. A **dicembre**, oneri annuali personale didattici = f(RAL × rate, floor), visibili in report/Bilancio.
4. Slice piccolo: un PR, niente boom/secca, scorte/rep, settlement deposito, % diretta su tesoreria.

## Non-goals

- Settlement +1 mese su deposito/prelievo
- Includere `treasury` nella base % dello shock
- Soft-cap / morale / ticket non lineari extra (alternativa B del backlog)
- Item backlog #2–#4–#6
- Rewrite UI kit o catalogo eventi completo

## Design decisions (locked)

| Topic | Choice |
|-------|--------|
| Approccio | Minimo (#5 timing + bailout; #1 addebito annuale) |
| Shock % base | Solo `company.cash` |
| Tesoreria | Fondo emergenza: prelievo automatico solo se cassa &lt; 0 dopo lo shock |
| UX shock mono-opzione | Nessuna card bloccante “Paga…”; log + toast (danno già fatto) |
| Comfort / cooldown shock | Invariati |
| Oneri staff | Addebito annuale a dicembre (non seconda paga mensile) |
| Formula oneri | `max(floorRuolo, RAL × rate)` per testa; `RAL = grossMonthly × 13` |
| Rate / floor | `rate = 0.035`; floor Operaio 400 / Impiegato 550 / Responsabile 700 € |
| Contabilizzazione | Cash out a dicembre + `ytd.otherCosts` + campo dedicato su `YearReport` |

---

## 1. Shock a apertura mese + fondo emergenza

### Flusso

1. In `advanceMonth` / pipeline eventi (come oggi): se `tryQueueShock` vince, si sceglie la def dal `SHOCK_POOL`.
2. **Subito** si esegue l’effetto dell’unica opzione (stessa logica `apply` attuale), senza lasciare il danno in sospeso.
3. Helper post-hit: se `company.cash < 0` e `treasury > 0`, trasferisci `min(treasury, -cash)` da tesoreria a cassa; log “Fondo emergenza…”.
4. `pushLog` + toast con titolo/importo; **non** impostare `pendingEvent` per shock a opzione unica (il mese resta giocabile subito, col danno già applicato).
5. `lastShockAt` / cooldown / `comfortLevel` invariati.

### `shockCash`

Invariato nella base: `hit = max(floor, max(0, cash) * pct)` poi `cash -= hit`. La copertura tesoreria è **dopo**, condivisa per tutti gli shock forced che possono mandare cassa negativa (non solo %).

### Deposit / withdraw

Restano istantanei. Nessun pending settlement.

### Copia

- Toast/log shock: come oggi (“Terremoto: riparazioni −X €”).
- Se bailout: “Fondo emergenza: −Y € dalla tesoreria per coprire la cassa.”
- Se tesoreria insufficiente e cassa resta &lt; 0: nessun magic fill; restano le regole game-over / liquidità esistenti.

### Scopo catalogo

Tutti gli entry `SHOCK_POOL` a **una sola opzione** seguono apply-immediato + no `pendingEvent`. Eventuali choice multi-opzione fuori da questo pool non cambiano in questo slice.

---

## 2. Oneri annuali personale

### Quando

Dicembre, nel blocco annual events di `advanceMonth` (stesso passaggio di IRES/IRAP / reset YTD), **prima** del reset `ytd` così gli oneri entrano in `otherCosts` dell’anno che si chiude.

### Formula

```ts
// config (staffPay o fiscalYearSnapshot)
ANNUAL_STAFF_ONERI_RATE = 0.035
ANNUAL_STAFF_ONERI_FLOOR: Record<StaffRole, number> = {
  Operaio: 400,
  Impiegato: 550,
  Responsabile: 700,
}

RAL(emp) = emp.grossMonthly * 13
oneri(emp) = max(floor[role], RAL(emp) * rate)
totale = sum(oneri)  // 0 se nessun dipendente
```

Ruolo sconosciuto → floor Operaio. Nessun fattore settore extra in v1 (il lordo CCNL per settore è già nel gross).

### Effetti

1. `company.cash -= totale`
2. `ytd.otherCosts += totale`
3. `YearReport.staffAnnualOneri = totale` (nuovo campo; 0 se assente in save vecchi)
4. Log: “Oneri annuali personale: −Z € (N dipendenti).”
5. UI Report / Bilancio: riga “Oneri annuali personale”.

Non è liability F24 separata in v1 (come diritto camerale: cash immediato). Non modifica base IRAP/IRES oltre all’effetto via `otherCosts` sul profit IRES.

### Tuning

Rate e floor sono costanti config; dopo una run Normale si possono ritoccare senza cambiare il flusso.

---

## 3. Files (indicativi)

| Area | Path |
|------|------|
| Shock apply + bailout | `src/sim/eventCatalog.ts`, eventuale helper piccolo in `actions.ts` o `eventCatalog` |
| Toast inizio mese | store / coach path esistente per log→toast |
| Oneri config | `src/config/staffPay.ts` (o snapshot fiscale se si preferisce accanto ad aliquote) |
| Dicembre charge | `src/sim/advanceMonth.ts` |
| Types / report | `src/sim/types.ts`, `src/components/ReportPanel.tsx` |
| Test | `src/sim/phase-shocks.test.ts`, test advance dicembre staff |
| Indice | `ROADMAP.md` (Done / backlog note) |

## 4. Testing

1. Shock %: dopo `advanceMonth` che coda lo shock, cassa già ridotta; `pendingEvent` null; tesoreria invariata se cassa ≥ 0.
2. Cassa bassa + tesoreria alta + shock forte: cassa torna a 0 (o meno negativa), tesoreria scende del delta.
3. Dicembre, 0 dipendenti → oneri 0; 1 Operaio → ≈ `max(400, RAL×0.035)`; 50 Operai → scala lineare sul totale.
4. Regressione: interessi tesoreria, payroll mensile, IRES/IRAP path, deposito/prelievo istantanei.

## 5. Out of scope follow-up

Balance pass restante (#2 domanda, #3 scorte, #4 rep, #6 shock senza stock) resta in ROADMAP Next / backlog.

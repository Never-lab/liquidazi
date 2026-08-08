# Riscossione fiscale — cartella, rateazione, pignoramento — Design

**Date:** 2026-08-08  
**Branch:** `feat/fiscal-collection` (provvisorio)  
**Status:** Approved for planning  
**Goal:** Chiudere l’exploit “F24 saltato → debito eterno senza conseguenze” con una pipeline adulta, lenta ma inevitabile: interessi, cartella con scelte, pignoramento, lost fiscale.

## Context

Oggi (`advanceMonth` § skipped F24s, `phase4.f24.test.ts`): alla prima scadenza non pagata si applica **una sola** volta `amount × (1 + penalty_late_pct + interest_late_pct)`, `penalized = true`, compliance −10, morale −3. I mesi successivi **non** crescono il debito. Esiste solo un evento random “Ispezione / cartella soft” (multa flat) se compliance &lt; 50, slegato dal debito aperto. Game over = cassa &lt; 0 per 12 mesi. Saltare F24 resta spesso razionale.

Direzione prodotto: sim PMI **adulto** (modello di gioco, non commercialista live / non consulenza), non tutorial per bambini. Scelte locked in brainstorming: caso aggregato (approccio 1); scelte alla cartella (B); timeline lenta (C); fine = pignoramento poi lost (C).

## Goals

1. Debito F24 scaduto non pagato accumula **interessi di mora mensili** (oltre la sanzione one-shot al primo salto).
2. Dopo insoluto continuo prolungato → **cartella** con choice: paga tutto / rateizza / ignora.
3. Rateazione con fee; saltare una rata → enforcement.
4. **Pignoramento**: prelievo forzato cassa → tesoreria + aggio; se residuo alto → countdown **lost fiscale**.
5. UI/TaxPanel/HUD/EndScreen comunicano stage e rischio in tono adulto.

## Non-goals (v1)

- Ravvedimento operoso completo, rottamazione, condono, definizione agevolata
- Cartelle separate per ogni tributo (IVA vs INPS vs …)
- Riscrittura aliquote IRES/IRAP / snapshot fiscale live
- Settlement tesoreria o balance-pass #2–#6
- Softening “cartella soft” come unica conseguenza

## Design decisions (locked)

| Topic | Choice |
|-------|--------|
| Unità di stato | Caso aggregato `collectionCase` (non stage per liability) |
| Cartella | Pending choice: paga / rateizza / ignora |
| Timeline | Lenta: cartella ~**6 mesi** di insoluto aggregato continuo |
| Rateazione | **12 mesi**, fee sul totale ~**10%** |
| Enforcement | Prelievo forzato cassa poi tesoreria + aggio ~**8%** sul prelevato |
| Terminal | Dopo **4 mesi** in enforcement con residuo &gt; soglia → countdown **3 mesi** → lost fiscale |
| Sanzione one-shot | **Resta** al primo `!penalized` (comportamento attuale) |
| Interessi dopo | Mora mensile su unpaid `!paid` (vedi numeri) |

---

## 1. Data model

```ts
type CollectionStage =
  | "overdue"     // tracking pre-cartella (opzionale in stato; può essere implicito)
  | "cartella"    // choice pending
  | "rateazione"
  | "enforcement"
  | "terminal";

interface CollectionPlan {
  installment: number;
  monthsLeft: number;
  totalMonths: number;
}

interface CollectionCase {
  stage: CollectionStage;
  /** Debito in gestione dal fisco (include mora/fee già capitalizzate nel caso). */
  principal: number;
  monthsInStage: number;
  firstOverdueIdx: number;
  plan?: CollectionPlan;
}

// GameState
collectionCase: CollectionCase | null;

// Game over
loseReason?: "cash" | "fiscal" | null; // cash = path attuale 12m rosso
```

Save migration: `collectionCase ??= null`; `loseReason` assente = comportamento attuale.

Le `TaxLiability` restano la fonte di verità per “cosa è dovuto”. Il caso aggrega quanto è in riscossione / piano.

---

## 2. Pipeline mensile

Eseguita in `advanceMonth` **dopo** la sanzione one-shot esistente (blocco skipped F24s), prima o a fianco degli eventi mondo — ordine consigliato: sanzione one-shot → mora mensile → tick `collectionCase` → (più tardi) world events.

### 2.1 Mora su liability aperte

Per ogni `l` con `!l.paid && l.dueIdx < idx` (già scaduta da almeno un mese chiuso):

- `l.amount *= (1 + MONTHLY_MORA_RATE)` ogni mese (anche se `penalized`).
- `MONTHLY_MORA_RATE` config ≈ **0.01** (1%/mese didattico — ordine di grandezza, non tasso legale live).

La sanzione one-shot (`penalty_late_pct + interest_late_pct`) resta **solo** al passaggio `!penalized → penalized`.

### 2.2 Apertura cartella

Sia `overdueTotal` = somma `amount` delle liability `!paid && dueIdx <= idx`.

Sia `monthsContinuousOverdue` = mesi consecutivi in cui `overdueTotal > 0` (contatore su GameState, es. `monthsTaxOverdue`, reset a 0 quando overdueTotal = 0).

Se `collectionCase == null` e `monthsTaxOverdue >= 6`:

1. Crea caso: `stage: "cartella"`, `principal: overdueTotal`, `monthsInStage: 0`, `firstOverdueIdx: idx`.
2. Imposta pending choice cartella (blocca Chiudi mese come `pendingEvent`).
3. Compliance −15 (config).
4. Log/toast: cartella di pagamento / affidamento riscossione.

Se il player azzera tutte le liability con `payF24` **prima** dei 6 mesi → `monthsTaxOverdue = 0`, nessuna cartella.

### 2.3 Scelte cartella

| Opzione | Effetto |
|---------|---------|
| **Paga tutto** | Addebito `principal` da cassa; se cassa insufficiente, preleva il resto dalla tesoreria (fondo emergenza fiscale). Segna paid le liability coperte / azzera overdue. Chiude `collectionCase`. Compliance +5. Se nemmeno cassa+tesoreria bastano: paga il massimo, `principal` residuo, stage → `enforcement`. |
| **Rateizza** | `total = principal × (1 + RATEATION_FEE)` (fee **0.10**); `installment = total/12`; `stage: "rateazione"`, `plan: { installment, monthsLeft: 12, totalMonths: 12 }`. Liability sottostanti restano aperte ma “in piano” (non ri-aprono una seconda cartella). |
| **Ignora** | `stage: "enforcement"`, `monthsInStage: 0`, compliance −20. |

### 2.4 Rateazione (tick mensile)

Se `stage === "rateazione"`:

- Tenta addebito `plan.installment` da cassa (poi tesoreria se cassa &lt; rata).
- Se pagata: `monthsLeft--`; se 0 → chiudi caso, marca liability paid / azzera, compliance +8.
- Se **non** pagabile (cassa+tesoreria &lt; rata): rata saltata → `stage: "enforcement"`, compliance −10, log.

### 2.5 Enforcement (pignoramento)

Ogni mese in `enforcement`:

1. `take = min(principal, cash)`; cash − take; se `principal` ancora &gt; 0, `take2 = min(residuo, treasury)`; treasury − take2.
2. `gross = take + take2`; `aggio = gross × 0.08`; se possibile scala altro cash/treasury per l’aggio (o capitalizza aggio su `principal` se liquidità finita).
3. Riduci `principal` del solo `gross` (non dell’aggio se capitalizzato — in v1: aggio esce da liquidità; se manca, aggiungi ad `principal`).
4. `monthsInStage++`.
5. Se `principal <= 0` → chiudi caso (compliance +3).
6. Se `monthsInStage >= 4` e `principal > LOST_THRESHOLD` → `stage: "terminal"`, `monthsInStage: 0`.
   - `LOST_THRESHOLD = max(2000, round2(ytd.revenue * 0.05))` (floor 2000).

### 2.6 Terminal → lost fiscale

Ogni mese in `terminal`:

- Continua un prelievo enforcement ridotto (stessa logica) + log countdown (`3 − monthsInStage` mesi alla chiusura).
- `monthsInStage++`; a `monthsInStage >= 3` con `principal > 0`: `status = "lost"`, `loseReason = "fiscal"`.

Path cassa attuale invariato (`loseReason = "cash"` quando scatta il 12m rosso).

---

## 3. UI

- **TaxPanel:** lista liability + blocco “Riscossione” (stage, principal, mesi, rata se piano).
- **HUD:** banner distinto per cartella / enforcement / terminal (più grave del giallo F24).
- **Pending cartella:** tre bottoni; blocca advance come oggi con `pendingEvent`.
- **EndScreen:** se `loseReason === "fiscal"` → copy dedicata (insolvenza / riscossione), non il testo dei 12 mesi in rosso.
- Copia: italiana, adulta; disclaimer snapshot già in README resta (non consulenza).

---

## 4. Config (valori locked v1)

| Key | Value |
|-----|-------|
| `MONTHLY_MORA_RATE` | 0.01 |
| `MONTHS_BEFORE_CARTELLA` | 6 |
| `RATEATION_MONTHS` | 12 |
| `RATEATION_FEE` | 0.10 |
| `ENFORCEMENT_AGGIO` | 0.08 |
| `ENFORCEMENT_MONTHS_TO_TERMINAL` | 4 |
| `TERMINAL_MONTHS_TO_LOST` | 3 |
| `LOST_THRESHOLD_FLOOR` | 2000 |
| `LOST_THRESHOLD_YTD_PCT` | 0.05 |
| Compliance: open cartella / ignore / skip rata / close pay / close rateazione | −15 / −20 / −10 / +5 / +8 |

---

## 5. Files (indicativi)

| Path | Role |
|------|------|
| `src/config/collection.ts` | Costanti sopra |
| `src/sim/collection.ts` | Tick, open cartella, apply choice, enforcement |
| `src/sim/types.ts` | `CollectionCase`, `collectionCase`, `loseReason`, `monthsTaxOverdue` |
| `src/sim/advanceMonth.ts` | Wire mora + tick |
| `src/store/gameStore.ts` | Resolve scelte cartella; advance gated |
| `src/components/TaxPanel.tsx` | UI caso |
| `src/screens/GameHUD.tsx` | Banner |
| `src/screens/EndScreen.tsx` | Motivo fiscale |
| `src/sim/phase-collection.test.ts` | Test pipeline |
| `ROADMAP.md` | Next / Done |

## 6. Testing

1. Skip F24 → after first penalty, amount grows each further month (mora).
2. 6 months continuous overdue → cartella pending; cannot advance without choice.
3. Pay all with enough cash → case null, liabilities paid.
4. Rateize → 12 installments; miss one → enforcement.
5. Enforcement drains cash then treasury; aggio applied.
6. Residual above threshold after 4 enforcement months → terminal → lost with `loseReason: "fiscal"` after 3 more.
7. Clear all dues before month 6 → no cartella.
8. Regression: one-shot penalty still once; cash-loss path still works.

## 7. Out of scope follow-up

Ravvedimento, rottamazione, rateazione personalizzata, interesse legale calibrato AdE, multi-cartella per ente.

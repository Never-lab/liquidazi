# Impresa Italia — Piano MVP

Business sim educativo (non AAA): gestisci un’azienda tipo **SRL** in Italia, mese per mese, con tasse, liquidità e credito plausibili.

**Disclaimer UI obbligatorio:** modello educativo semplificato — non consulenza fiscale.

---

## Obiettivo del prodotto

Far *sentire* la pressione reale di:

1. Cash vs utile (fatture non pagate, IVA, stipendi)
2. Scadenze F24 (~16 del mese)
3. Acconti IRES/IRAP (giugno / novembre)
4. Costo del debito (Euribor + spread, garanzie)

Non modellare l’intera economia italiana.

---

## Phase 0 — Documentation Discovery (completata)

### Stack scelto

| Scelta | Perché | Fonti |
|--------|--------|--------|
| **Vite + React + TypeScript** | SPA client-only, HMR veloce, zero SSR inutile | https://vite.dev/guide/ ; template `react-ts` |
| **Zustand + persist → localStorage** | Stato fuori da React (motore sim), save game semplice | https://zustand.docs.pmnd.rs/ |
| **Sim pura in `src/sim/`** | `advanceMonth(state) → nextState` testabile senza UI | convenzione lean |

**Comando scaffold (Phase 1):**

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install zustand
```

**Allowed APIs**

- `npm create vite@latest … -- --template react-ts` — Vite Getting Started
- `create<T>()((set, get) => …)` + selectors — Zustand `create`
- `persist(…, { name, partialize, version, migrate })` — Zustand persist
- `localStorage` via default `createJSONStorage` — MDN + Zustand
- React `createRoot` — template `main.tsx`

**Anti-pattern**

- Next.js “perché React” (SSR non serve al sim)
- Redux / XState day-one
- Logica fiscale dentro i componenti React
- Hardcodare aliquote come “legge eterna” (usare `FiscalYearSnapshot`)

### Modello fiscale MVP (educational)

Fonti: Agenzia Entrate (IVA/F24/IRES/ritenute), INPS (contributi), pattern IRAP acconti, MIMIT Fondo di Garanzia PMI, BdI tassi (tuning).

| Bucket | Ruolo in gioco | Cadenza |
|--------|----------------|---------|
| IVA | output − input; credito a riporto | mensile, F24 ~16 |
| IRPEF dipendente (sostituto) | trattenuta → Erario | mensile, F24 ~16 |
| INPS | quota datore + trattenuta dipendente | mensile, F24 ~16 |
| Stipendi netti | cash out | mensile |
| TFR | liability (accrual) | mensile |
| IRES | imposta su utile semplificato | saldo+acconti ~giu/nov |
| IRAP | base diversa (semplificata) | stesso ritmo IRES |
| Diritto camerale | fee annuale piccola | annuale |
| Prestito | Euribor+spread, rata, garanzia opzionale | mensile rata |

**Escludere da MVP:** consolidato, reverse charge edge cases, ISA/CPB, CCNL completi, UniEmens/CU, IRPEF soci su dividendi, accertamenti, multi-region IRAP, transfer pricing.

**Regola d’oro:** un file `docs/fiscal-snapshot/fyXXXX.json` per campagna; mai “questa è la legge live”.

---

## Phase 1 — Repo + Vite scaffold + shell UI

### Cosa implementare

1. Scaffold Vite `react-ts` nella root del repo (sostituire placeholder se presenti).
2. Dipendenza `zustand`.
3. Struttura cartelle:

```
src/
  main.tsx
  App.tsx
  screens/          # Menu, GameHUD (anche stub)
  components/
  store/gameStore.ts
  sim/              # types + advanceMonth stub
  config/fiscalYearSnapshot.ts
docs/fiscal-snapshot/
plans/
```

4. Schermata minima: nome azienda, cash, mese/anno, bottone **Avanza 1 mese** (no-op o +1 mese).
5. Disclaimer fisso in footer.
6. README aggiornato con `npm run dev`.

### Riferimenti doc

- https://vite.dev/guide/
- https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts
- Zustand beginner TS: https://zustand.docs.pmnd.rs/learn/guides/beginner-typescript

### Verifica

- [ ] `npm run dev` apre UI
- [ ] `npm run build` passa
- [ ] Click “Avanza mese” incrementa il mese in store
- [ ] Nessuna logica fiscale nei componenti (solo lettura store)

### Anti-pattern

- Non aggiungere React Router finché non servono URL reali
- Non installare UI kit pesanti day-one

---

## Phase 2 — Motore sim: Cash + Fatture + IVA

### Cosa implementare

1. Tipi: `Company`, `Invoice`, `VatAccount`, `GameState`.
2. Azioni giocatore (MVP): emetti fattura cliente, registra costo fornitore (o generatore semplice di domanda).
3. `advanceMonth`: matura scadenze, incassi/pagamenti probabilistici o fissi, liquida IVA del mese → `TaxLiability` IVA con `due_month = next`.
4. Snapshot: `iva_standard_rate` da config.

### Riferimenti

- AdE: liquidazione IVA mensile / F24 — concetto “debito = IVA vendite − IVA acquisti”
- Piano § Phase 0 tabella bucket

### Verifica

- [ ] Test unitario (vitest): mese con sola vendita → nasce liability IVA
- [ ] Credito IVA se acquisti > vendite
- [ ] Cash non cambia per IVA finché non si paga F24 (Phase 4)

### Anti-pattern

- Non modellare codici tributo F24
- Non fare calendario giorni/festività

---

## Phase 3 — Personale + cedolino semplificato

### Cosa implementare

1. `Employee` (gross mensile), `PayrollRun`.
2. Da snapshot: `inps_employer_rate`, `inps_employee_rate`, `irpef_withholding_simplified_*`.
3. Ogni mese: paga netto; accantona IRPEF + INPS come liability; accantona TFR liability.
4. UI: lista dipendenti, assunzione/licenziamento minimale (1–3 ruoli fissi ok).

### Verifica

- [ ] Test: gross 2000 → net + contributi + IRPEF coerenti con snapshot
- [ ] Cash scende del netto nel mese di competenza
- [ ] Liability F24 crescono (pagamento ancora Phase 4)

### Anti-pattern

- Non importare tabelle CCNL complete
- Non fare 13ª/14ª finché il loop base non gira

---

## Phase 4 — F24 mensile + sanzioni soft

### Cosa implementare

1. Evento “Scadenza F24” (flag giorno 16 nel mese successivo alle competenze).
2. Azione giocatore: **Paga F24** (batch IVA + IRPEF + INPS dovuti).
3. Se salti: interesse/sanzione % da snapshot + malus “reputazione/compliance”.
4. Persist Zustand: salvataggio automatico a fine mese.

### Riferimenti

- Zustand persist: https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data
- AdE/INPS: versamenti entro il 16

### Verifica

- [ ] Pagarlo azzera liability e scende cash
- [ ] Skip → penalty applicata al mese dopo
- [ ] Reload pagina → stato ripristinato (`localStorage` key stabile)

### Anti-pattern

- Non simulare ravvedimento operoso completo
- Non persistere funzioni/actions (`partialize`)

---

## Phase 5 — IRES / IRAP annuali + diritto camerale

### Cosa implementare

1. Chiusura FY: utile fiscale semplificato → IRES; base IRAP semplificata (due knobs distinti).
2. Giugno: saldo N-1 + 1° acconto; Novembre: 2° acconto (split da snapshot, default 40/60).
3. Fee CCIAA annuale flat da snapshot.
4. Report fine anno: P&L semplificato + cash bridge.

### Verifica

- [ ] Partita di 12 mesi produce liability IRES/IRAP
- [ ] Mesi 6 e 11 generano cash out se si paga
- [ ] UI mostra “boss month” chiaramente

### Anti-pattern

- Non unificare IRES e IRAP nella stessa base senza dirlo in UI
- Non calcolare IRPEF dei soci

---

## Phase 6 — Credito (un prestito) + win/lose

### Cosa implementare

1. Entità `Loan`: principal, tenor, fixed|floating, `index`+`spread_bps`, garanzia (`none` | `fondo_garanzia_pmi` | `fideiussione`).
2. Fondo garanzia = migliora approvazione / spread — **non è un contributo a fondo perduto**.
3. Condizioni fine: fallimento liquidità (cash &lt; 0 oltre overdraft); obiettivo 24 mesi survivable / target cash.
4. Schermata tutorial 5 bullet “come funziona l’Italia in questo gioco”.

### Riferimenti

- MIMIT Fondo di Garanzia PMI (garanzia ≠ erogazione cash)
- Snapshot: path Euribor di scenario

### Verifica

- [ ] Rata mensile riduce outstanding e cash
- [ ] Floating: cambio indice in snapshot scenario cambia rata
- [ ] Game over se cash sotto soglia N mesi

### Anti-pattern

- Non modellare Confidi + ipoteca + covenants bancari tutti insieme
- Non scaricare tassi “live” da internet in MVP

---

## Phase 7 — Verification finale

1. `npm run build` + test sim verdi.
2. Grep anti-pattern: niente aliquote magiche fuori da `FiscalYearSnapshot`; niente logica fiscale in `components/`.
3. README: come giocare, cosa è semplificato, link disclaimer.
4. Tag `v0.1.0-mvp` quando il loop 24 mesi è giocabile end-to-end.

---

## Roadmap post-MVP (non fare ora)

- Più settori / generatori di domanda
- Clienti PA (tempi di pagamento lunghi)
- Professionisti + ritenuta d’acconto
- Modalità “anno fiscale 20XX pack” scaricabile
- Multi-save slot / export JSON
- Tutorial scenario guidato (liquidità vs crescita)

---

## Decisioni aperte (da chiudere in Phase 1)

| Domanda | Default proposto |
|---------|------------------|
| Nome display gioco | **Impresa Italia** |
| Forma giuridica MVP | Solo SRL-like |
| Settore iniziale | Commercio/servizi generico (markup + costi fissi) |
| Difficoltà | Una sola + seed eventi |
| Lingua UI | Italiano |
| Licenza | MIT |
| Repo | https://github.com/Never-lab/impresa-italia |

---

## Come eseguire le fasi

Ogni fase è autocontenuta: apri una chat nuova, punta al repo, digli di eseguire **Phase N** di `plans/01-mvp.md` (skill `/do` se disponibile). Non saltare la verifica di fase.

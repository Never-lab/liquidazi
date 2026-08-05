# Liquidazi

Business simulation game (educational): run an Italian **SRL-like** company — cash flow, IVA, payroll, F24, IRES/IRAP, loans.

> **Disclaimer:** modello educativo semplificato. Non è consulenza fiscale né software commercialista.

## Come si gioca

Sopravvivi **24 mesi** con la cassa in ordine. 3 mesi consecutivi in rosso = game over.

1. **Scegli regione e città.** Stock imprese InfoCamere (provincia/ATECO) e popolazione ISTAT del comune determinano la densità competitiva; l'affitto usa medie €/mq di mercato × 80 mq.
2. **Fattura e compra.** Emetti fatture clienti e registra costi fornitori: il lordo (imponibile + IVA) entra/esce il mese successivo.
3. **Assumi con giudizio.** Ogni dipendente costa il netto in busta subito, più ritenute IRPEF, contributi INPS e TFR che diventano debiti da versare.
4. **Paga l'F24.** Ogni mese l'IVA liquidata e le ritenute del mese prima scadono (giorno 16). Saltare il versamento costa sanzione + interessi + reputazione.
5. **Supera i mesi boss.** A giugno saldo IRES/IRAP dell'anno precedente + 1° acconto + diritto camerale; a novembre il 2° acconto.
6. **Usa il credito con testa.** Un prestito a Euribor + spread; il Fondo di Garanzia PMI alza il tetto e abbassa lo spread, ma non regala niente.

## Come eseguire

```bash
npm install
npm run dev      # server di sviluppo con hot reload
npm run build    # build di produzione (type-check + bundle in dist/)
npm test         # test del motore di simulazione (vitest)
npm run preview  # serve la build di produzione in locale
```

Il salvataggio è automatico in `localStorage` (chiave `liquidazi-save`).

## Cosa è semplificato (di proposito)

- **IVA**: liquidazione mensile per competenza sul mese di emissione, credito a riporto; niente pro-rata, reverse charge, esigibilità differita.
- **Cedolino**: ritenuta IRPEF flat e contributi INPS a percentuale unica dallo snapshot; niente scaglioni, detrazioni, CCNL, 13ª/14ª.
- **F24**: un solo batch mensile senza codici tributo; la sanzione per omesso versamento è una tantum (niente ravvedimento operoso).
- **IRES/IRAP**: utile fiscale = ricavi − costi; base IRAP = ricavi − acquisti (personale e interessi indeducibili). Acconti conteggiati quando addebitati.
- **Mercato:** stock imprese da InfoCamere (Dic 2025, provincia); popolazione comune ISTAT; affitto = media annunci €/mq × 80 mq (non quotazione OMI zona-per-zona). La densità è un proxy di pressione, non i rivali della stessa via. Pack in `src/config/marketPack.json`.
- **Incassi/pagamenti**: deterministici a 30 giorni, niente insoluti.
- **Prestito**: quota capitale costante, Euribor da un path di scenario fisso (nessun dato live).
- **Diritto camerale**: importo flat pagato a giugno.

Tutte le aliquote vivono in [`src/config/fiscalYearSnapshot.ts`](src/config/fiscalYearSnapshot.ts) (specchiato in `docs/fiscal-snapshot/`): sono un pacchetto educational per l'anno di campagna, **mai "la legge live"**.

## Stack

- Vite + React + TypeScript
- Zustand + persist (stato di gioco e salvataggio)
- Motore di simulazione puro in `src/sim/` (testato con vitest, zero React)

## Struttura

```
src/
  main.tsx                      # entry point React
  App.tsx                       # switch schermate: menu/tutorial/gioco/fine
  screens/                      # Menu, Setup (zona/settore), Tutorial, GameHUD, End
  components/                   # pannelli HUD (fatture, personale, fisco, credito, bilancio)
  store/gameStore.ts            # stato Zustand + persist (localStorage)
  sim/                          # tipi, azioni, mercato, advanceMonth + test
  config/fiscalYearSnapshot.ts  # rates educational per l'anno di campagna
  config/market.ts              # zone, settori, rivalità, affitti
docs/fiscal-snapshot/           # snapshot JSON di riferimento (non "legge live")
plans/                          # piano di sviluppo a fasi
```

## Status

Phases 1–6 completate (MVP core giocabile) — see [`plans/01-mvp.md`](plans/01-mvp.md).

## License

MIT (to be confirmed).

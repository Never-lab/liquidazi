# Liquidazi

Business simulation game (educational): run an Italian **SRL-like** company — cash flow, IVA, payroll, F24, IRES/IRAP, loans.

> **Disclaimer:** modello educativo semplificato. Non è consulenza fiscale né software commercialista.

## Stack

- Vite + React + TypeScript
- Zustand (game state; local save in Phase 4)
- Pure simulation engine in `src/sim/`

## Come eseguire

```bash
npm install
npm run dev      # server di sviluppo con hot reload
npm run build    # build di produzione (type-check + bundle in dist/)
npm run preview  # serve la build di produzione in locale
```

## Struttura

```
src/
  main.tsx                     # entry point React
  App.tsx                      # layout: header brand + HUD + footer disclaimer
  screens/GameHUD.tsx           # cassa, mese/anno, bottone "Avanza 1 mese"
  components/DisclaimerFooter.tsx
  store/gameStore.ts            # stato Zustand (company, calendar)
  sim/                          # tipi + advanceMonth (motore puro, no React)
  config/fiscalYearSnapshot.ts  # rates educational per l'anno di campagna
docs/fiscal-snapshot/           # snapshot JSON di riferimento (non "legge live")
plans/                          # piano di sviluppo a fasi
```

## Status

Phase 1 (scaffold + shell UI) completata — see [`plans/01-mvp.md`](plans/01-mvp.md).

## License

MIT (to be confirmed).

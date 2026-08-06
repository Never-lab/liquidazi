# Liquidazi

Business simulation game (educational): run an Italian **SRL-like** company — cash flow, IVA, payroll, F24, IRES/IRAP, loans.

> **Disclaimer:** modello educativo semplificato. Non è consulenza fiscale né software commercialista.

## Come si gioca

Sopravvivi all'infinito con la cassa in ordine. **12 mesi consecutivi in rosso** = game over.
In difficoltà la banca ti propone un prestito di salvataggio.

Difficoltà Facile/Normale/Difficile, guide in-game, 3 slot salvataggio, toast + beep a chiusura mese.

1. **Scegli regione e comune ISTAT** (tutti i ~7.900 comuni). La concorrenza usa lo stock InfoCamere della provincia; l'affitto medie €/mq × 80 mq.
2. **Fattura e compra.** Emetti fatture clienti e registra costi fornitori: il lordo (imponibile + IVA) entra/esce il mese successivo.
3. **Assumi con giudizio.** Ogni dipendente costa il netto in busta subito, più ritenute IRPEF, contributi INPS e TFR che diventano debiti da versare.
4. **Paga l'F24.** Ogni mese l'IVA liquidata e le ritenute del mese prima scadono (giorno 16). Saltare il versamento costa sanzione + interessi + reputazione.
5. **Supera i mesi boss.** A giugno saldo IRES/IRAP dell'anno precedente + 1° acconto + diritto camerale; a novembre il 2° acconto.
6. **Usa il credito con testa.** Un prestito a Euribor + spread; il Fondo di Garanzia PMI alza il tetto e abbassa lo spread, ma non regala niente.

## Come eseguire

```bash
npm install
npm run dev:api  # API auth + leaderboard su :8787 (terminale 1)
npm run dev      # UI Vite su :5173, proxy /api → :8787 (terminale 2)
npm run build
npm test
```

## Deploy (Railway)

1. Push `main` to GitHub (`Never-lab/liquidazi`).
2. New Railway project → Deploy from repo (Node **22** via `nixpacks.toml` / `engines`).
3. Variables: set `LIQUIDAZI_SECRET` to a long random string (required).
4. Volume: mount **only** at `/app/server/data` (never `/app` — that locks `node_modules` and breaks the build).
5. Generate domain → open URL → register → play → reload on another browser: same slots.

Local production-ish check:

```powershell
npm run build
$env:LIQUIDAZI_SECRET="dev-only-local"
$env:NODE_ENV="production"
npm start
```

Then open `http://127.0.0.1:8787`.

Crea un account (username + password), gioca, al KO la run va in classifica.

### Classifiche
- Sopravvivenza più lunga
- Run più corta (KO veloce)
- Debito più alto (mutuo + fido + rosso)
- Cassa al picco
- Fatturato lifetime

Dati in `server/data/` (gitignored). Secret: `LIQUIDAZI_SECRET`.

`localStorage` (`liquidazi-save`) conserva una cache locale e la sessione utente. Per gli account,
i tre slot e le preferenze vengono sincronizzati con il cloud.

## Cosa è semplificato (di proposito)

- **IVA**: liquidazione mensile per competenza sul mese di emissione, credito a riporto; niente pro-rata, reverse charge, esigibilità differita.
- **Cedolino**: ritenuta IRPEF flat e contributi INPS a percentuale unica; in dicembre anche la 13ª (doppio cedolino didattico); TFR liquidato al licenziamento.
- **F24**: un solo batch mensile senza codici tributo; la sanzione per omesso versamento è una tantum (niente ravvedimento operoso).
- **IRES/IRAP**: utile fiscale = ricavi − costi; base IRAP = ricavi − acquisti (personale e interessi indeducibili). Acconti conteggiati quando addebitati.
- **Mercato:** geografia completa da elenco comuni ISTAT; stock imprese InfoCamere Dic 2025 a livello provinciale (105 province); densità = imprese provincia / pop. **provincia** (somma comuni). Affitto = medie €/mq × 80 mq (non OMI zona-per-zona). Pack: `istatGeo.json` + `provinceFirms.json`.
- **Incassi/pagamenti**: termini per settore; PA con split payment (incassi il netto); privati possono andare in insoluto.
- **Prestito**: mutuo a piano rate + fido di cassa revolving; Euribor da path di scenario.
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

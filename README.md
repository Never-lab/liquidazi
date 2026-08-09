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
3. Variables: set `LIQUIDAZI_SECRET` to a long random string (required). Optional: `LIQUIDAZI_ADMIN_USERNAMES=tuo_nick` (comma-separated) to unlock the in-game **Controllo** dashboard for those accounts.
4. **Volume (obbligatorio):** Service → Settings → Volumes → add volume, mount path **`/data`** (mai `/app`: nasconde il codice e rompe il build). Railway espone `RAILWAY_VOLUME_MOUNT_PATH`; l’app scrive lì. Senza volume ogni redeploy azzera utenti, classifica e salvataggi.
5. After deploy, `GET /api/health` must return `"storage":"volume"`. If the service fails to start with a FATAL about the volume, the mount is missing.
6. Generate domain → open URL → register → play → reload on another browser: same slots.
7. **AdSense (opzionale override):** default client/slot sono in codice; puoi sovrascrivere con `VITE_ADSENSE_CLIENT` / `VITE_ADSENSE_SLOT` al build. Kill switch: `VITE_ADS_STUB=0`. Lascia **Auto ads spente** in AdSense: gli annunci escono solo dagli `AdSlot`.
8. **SEO / analytics:** `PUBLIC_SITE_URL=https://tuo-dominio` (sitemap assoluto). Build client: `VITE_SITE_URL` (canonical/OG), `VITE_PLAUSIBLE_DOMAIN` (attiva script), opz. `VITE_PLAUSIBLE_DASHBOARD_URL` + `VITE_GSC_URL` (link in Controllo). Checklist anche in Controllo → Traffico / SEO.
9. **Ops:** admin → Menu → Controllo apre `/ops` (bundle separato, `noindex`). API admin invariata (`LIQUIDAZI_ADMIN_USERNAMES`).

Se hai già un volume montato altrove (es. `/app/server/data`), va bene: l’app usa `RAILWAY_VOLUME_MOUNT_PATH`. In alternativa imposta `DATA_DIR` al path del mount.

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
- **Mercato:** geografia completa da elenco comuni ISTAT; stock imprese InfoCamere Dic 2025 a livello provinciale (105 province); densità = imprese provincia / pop. **provincia** (somma comuni). Affitto = medie €/mq × 80 mq (non OMI zona-per-zona). Pack runtime: [`src/config/istatGeo.json`](src/config/istatGeo.json) + [`src/config/provinceFirms.json`](src/config/provinceFirms.json).
- **Incassi/pagamenti**: termini per settore; PA con split payment (incassi il netto); privati possono andare in insoluto.
- **Prestito**: mutuo a piano rate + fido di cassa revolving; Euribor da path di scenario.
- **Diritto camerale**: importo flat pagato a giugno.

Tutte le aliquote vivono in [`src/config/fiscalYearSnapshot.ts`](src/config/fiscalYearSnapshot.ts) (specchiato in `docs/fiscal-snapshot/`): sono un pacchetto educational per l'anno di campagna, **mai "la legge live"**.

## Stack

- Vite + React + TypeScript
- Zustand + persist (stato di gioco e salvataggio)
- Motore di simulazione puro in `src/sim/` (testato con vitest, zero React)
- API Node zero-dep in `server/` (auth, saves, leaderboard, admin stats)

## Contribuire

PR verso `main`: devono passare CI (`lint` + `test` + `build`). Vedi [AGENTS.md](AGENTS.md).

## Struttura

```
src/
  main.tsx                      # entry point React
  App.tsx                       # switch schermate
  screens/                      # menu, setup, tutorial, HUD, end, admin, …
  components/                   # pannelli HUD + UI condivisa
  store/gameStore.ts            # Zustand + persist (localStorage)
  sim/                          # motore puro + test
  config/                       # fiscal snapshot, market, JSON runtime (geo/imprese)
  api/                          # client HTTP verso /api
server/                         # API + volume data (prod)
docs/                           # vedi docs/README.md (non runtime)
  fiscal-snapshot/              # specchio educational aliquote
  superpowers/plans|specs/      # slice post-MVP
plans/                          # piano MVP storico a fasi
ROADMAP.md                      # indice Done / Next / repo map
```

Deploy: volume Railway `/data` + `LIQUIDAZI_SECRET`; opzionale `LIQUIDAZI_ADMIN_USERNAMES` (dettagli sopra). Coda prodotto: [ROADMAP.md](ROADMAP.md).

## Status

Stato shipped e coda attiva → [`ROADMAP.md`](ROADMAP.md).

## License

MIT (to be confirmed).

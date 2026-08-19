# Floatdesk

Business simulation game (educational): run an Italian **SRL-like** company — cash flow, IVA, payroll, F24, IRES/IRAP, loans.

> **Disclaimer:** modello educativo semplificato. Non è consulenza fiscale né software commercialista.

**Brand:** Floatdesk · dominio target **floatdesk.app** (repo GitHub: `Never-lab/liquidazi`).

**Versione:** `1.1.1` — note in [`CHANGELOG.md`](CHANGELOG.md). La Guida in-game / [`docs/wiki/`](docs/wiki/INDEX.md) spiega come funziona il sim.

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

Due ambienti nello **stesso progetto**, stessa build (`railway.toml`: `npm run build` + `npm start`), URL e dati **separati**.

| Ambiente | Quando si aggiorna | Dati |
|----------|--------------------|------|
| **staging** | ogni push su `main` (autodeploy GitHub; abilita Wait for CI) | Postgres **suo** (o volume legacy), secret **suo** |
| **production** | solo tag SemVer `vX.Y.Z` (workflow [deploy-production.yml](.github/workflows/deploy-production.yml)) | Postgres **prod** (o volume legacy) — non copiare i giocatori su staging |

Checklist una tantum (dashboard Railway + GitHub):

1. Duplica l’ambiente attuale in **`staging`**. Lascia **`production`** sul servizio live di oggi.
2. **Staging:** Source → branch `main`, autodeploy ON, **Wait for CI**. Aggiungi **Postgres** (Railway → Add plugin → PostgreSQL). Il servizio web riceve `DATABASE_URL` automaticamente. Generate domain (URL diverso da prod).
3. **Production:** **disattiva** l’autodeploy da GitHub. Postgres **prod** separato (non condividere DB con staging).
4. Variabili **per ambiente** (valori diversi): `LIQUIDAZI_SECRET` (obbligatorio, non il default dev). Optional: `LIQUIDAZI_ADMIN_USERNAMES`. Staging: `PUBLIC_SITE_URL` / `VITE_SITE_URL` = URL staging. Prod: URL pubblico / `floatdesk.app`.
5. GitHub → Settings → Secrets: `RAILWAY_TOKEN` = **project token dell’ambiente production** (Railway → Project settings → Tokens). Senza questo secret il workflow sul tag fallisce. Se `railway up` dice “Multiple services found”, aggiungi la variabile di repo `RAILWAY_SERVICE` col nome del servizio **production** (dashboard Railway).
6. Health: `GET /api/health` → `"storage":"postgres"` (o `"volume"` se legacy file mode).
7. **Migrazione da volume:** con volume montato e Postgres attivo, una tantum: `DATA_DIR=/data npm run db:migrate-from-volume` (Railway shell o job locale con `DATABASE_URL` prod). Poi puoi rimuovere il volume dal servizio web.
8. **AdSense / SEO** restano override di build (`VITE_ADSENSE_*`, `VITE_PLAUSIBLE_*`, `VITE_ADS_STUB=0`). Su staging puoi lasciare ads spente. **Ops:** `/ops` con gli admin di quell’ambiente (log richieste rotante, niente IP).
9. Release: `git tag -a vX.Y.Z` **dopo** il merge su `main`, poi `git push origin vX.Y.Z` → CI + deploy prod.

Node **22** (`nixpacks.toml`). Persistenza: **Postgres** via `DATABASE_URL` (consigliato). Legacy: volume su `/data` (`RAILWAY_VOLUME_MOUNT_PATH` o `DATA_DIR`).

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

`localStorage` (`liquidazi-save`) conserva una cache locale e la sessione utente (logout dopo 2 ore di inattività, massimo 7 giorni dal login). Per gli account,
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
- API Node in `server/` (auth, saves, leaderboard, admin stats) — Postgres o file JSON locale

## Contribuire

PR verso `main`: devono passare CI (`lint` + `test` + `build`). Vedi [CLAUDE.md](CLAUDE.md).

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

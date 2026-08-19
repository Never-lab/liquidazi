# Changelog

Note di release di **Floatdesk**. Formato [Keep a Changelog](https://keepachangelog.com/it/1.1.0/), versioni [SemVer](https://semver.org/lang/it/).

- Questo file: **cosa è cambiato** tra una release e l’altra (obbligo a ogni tag).
- Wiki (`docs/wiki/`): **come si gioca / come funziona** il sim.
- `ROADMAP.md`: coda di lavoro, non storico di release.

## [Unreleased]

## [1.3.0] — 2026-08-19

Persistenza Postgres su Railway per salvataggi e classifica.

### Added
- Storage layer server: **Postgres** quando `DATABASE_URL` è impostato; file JSON locale in dev.
- Script one-shot `npm run db:migrate-from-volume` per importare `/data` legacy nel DB.

### Changed
- PUT salvataggi cloud + sync run in **transazione** (niente più riscrittura monolitica di `runs.json`).
- Health `/api/health`: `storage` può essere `postgres` | `volume` | `local`.

## [1.2.0] — 2026-08-19

Scorte per qualità, chiarezza tabellone commesse e rebalance early game.

### Added
- Scorte a **quattro tier** (bassa/media/buona/ottima) con effetto introito e prezzi da tabellone; consegna mese successivo (pending → magazzino FIFO).
- Pannello **SuppliesInbox** in HUD; copy tabellone e toast emergenza aggiornati.
- Badge **Singola / Appalto PA / Contratto** su card tabellone; filtro tipo offerta; pannello **Contratti in corso (n/2)**; anteprima «Se accetti: …».

### Changed
- Curva FL più dolce in early game (`8 + net/90`, min 10); crescita ticket graduale; penalità scorte vuote ridotta; partenza con 2 mesi scorte; forniture tier più bassi e cap prezzo ~40% cassa.

### Fixed
- **Scorte idle**: niente consumo a mese senza vendite (solo fatture AR emesse); boom +1 mese extra solo se hai venduto nel mese.

## [1.1.9] — 2026-08-19

Popup personale e taratura FL appalti PA.

### Fixed
- Eventi **Personale**: overlay a schermo intero (livello App) e roll prioritario; effetti stagionali (ferie estive, malattie, natalizie) aprono popup come gli altri eventi mondo.
- **FL appalti comunali/nazionali**: calcolo sulla fetta mensile (`net ÷ mesi`), cap 85/110 FL — niente più 400–550 FL in early game su importi 25–150k.

## [1.1.8] — 2026-08-19

Forza lavoro (FL) al posto degli slot per commesse e personale, con catalogo eventi dipendenti a scelta.

### Added
- Modello **forza lavoro (FL)**: base 30 senza assunzioni; ruoli Operaio/Impiegato/Responsabile +5/+8/+12 FL; ogni commessa mostra la FL richiesta.
- Famiglia eventi **Personale** (popup a scelta): malattia, permesso, ferie, maternità, paternità, allattamento, congedo parentale, permesso 104.
- Tetto malattia individuale: max **6 mesi/anno** per dipendente (reset a gennaio).

### Changed
- Copy player-facing, wiki e guida in-app allineati da slot/capacità a FL.
- Maternità e paternità passano da auto-tick mensile a evento scelta del giocatore.
- Bonus legacy (crescita, processi, progetti, holding) espressi in **+8 FL** per ex-slot.

## [1.1.7] — 2026-08-19

Home menu più largo e meno verticale per gli utenti loggati su desktop.

### Changed
- `MenuScreen` passa a un layout desktop a due colonne: hero e CTA a sinistra, navigazione secondaria a destra.
- Larghezza massima della shell aumentata per sfruttare meglio lo spazio orizzontale disponibile.
- Mobile invariato: layout a colonna singola sotto `720px`.

## [1.1.6] — 2026-08-19

Palette dark theme rivista: da nero pece + neon a silver/antracite elegante.

### Changed
- Sfondo dark alzato da `#0f1210` a `#1e2420` (antracite caldo).
- Superfici e bordi più chiari e leggibili.
- Accent da verde neon `#4ade80` a verde salvia `#6ec28e`.
- Danger, warning, info smorzati: toni naturali, non fluorescenti.
- Overlay scrim più densi e coerenti col fondo rialzato.

## [1.1.5] — 2026-08-19

Dark theme: colori hardcoded sostituiti con variabili CSS theme-aware.

### Fixed
- Banner F24 da versare, banner rescue e KO ora leggibili in dark mode (niente più testo nero su sfondo scuro).
- Inbox notifiche: badge, sfondo e bordi tonali adattati al tema.
- Overlay (sheet, dialog, popup) usano toni grafite/dark-silver invece di nero pece.
- Testo su pulsanti colorati (danger, accent, toast) ora usa `--color-on-filled` invece di `#fff`.
- Pallini "run in corso" (leaderboard/storico) e dot dei grafici adattati al tema.
- Ombre unificate su `--color-shadow` con intensità adeguata per entrambi i temi.

## [1.1.1] — 2026-08-18

Reputazione a tre layer, Privacy/Termini, sessione account, cookie banner, cache asset, 404 e log ops.

### Added
- Log tecnico rotante su Controllo (`/ops`): ultime richieste, conteggi 24h/7g e 404; niente IP/query/body/token.
- Pagina **404** HTML (status 404) per URL sconosciuti; `/privacy` e `/termini` restano l’app.
- Pagine **Privacy** (`/privacy`) e **Termini** (`/termini`), link in footer e landing.
- Sessione account: logout dopo **2 ore** di inattività, tetto **7 giorni** dal login (ospite invariato).
- Reputazione a **tre layer** (locale / comunale / nazionale): punti all’incasso, tabellone misto, filtro mercato.

### Changed
- Banner cookie: testo su storage necessario + ads, link Privacy, riapertura dal footer (solo se AdSense è on).
- Asset hashed in `/assets/`: cache HTTP 1 anno (`immutable`); HTML `no-cache` (deploy nuovi visibili subito).

## [1.1.0] — 2026-08-18

Eventi mondo a famiglie, overlay come secca/boom, deploy production su tag più affidabile.

### Added
- Eventi mondo a **famiglie** (ambiente, burocrazia, logistica) con catene di probabilità (es. frana → strada chiusa). Cartella resta solo da F24 insoluti.
- Popup overlay (come secca/boom) per shock e avvisi mondo auto-applicati; le decisioni restano overlay con pulsanti.

### Changed
- Deploy production: `railway up` punta all’ambiente `production` (e opzionale `RAILWAY_SERVICE`).

## [1.0.1] — 2026-08-18

Patch playtest dopo il freeze 1.0.0: fix piccoli e rivisitazioni HUD/scrivania. Primo tag GitHub SemVer dopo `v0.1.0-mvp`.

### Added
- Upgrade **Magazzino scorte** (4 livelli, cap 8/10/12/14 mesi; base 6).
- Bilancio: riga **Interessi tesoreria** (attivi; i passivi restano mutuo/fido).

### Changed
- Obiettivi: toast basso-destra con suono, auto-chiusura; niente popup a schermo intero.
- Ordine scorte bloccato (toast) se supererebbe il cap magazzino.
- HUD: posta e obiettivi a icone sotto il banner (niente chip testo); icona scorte placeholder.
- Commesse: default solo entrate, filtro ciclico entrate/forniture/tutte.
- Scadenziario sulla scrivania: solo il blocco verde «questa chiusura».
- Andamento: hover sulla cassa dei mesi precedenti; grafico ricavi e costi.

### Fixed
- Seconda run: niente replay popup per trofei già sull’account.

## [1.0.0] — 2026-08-18

Prima release pubblica del brand **Floatdesk** (repo GitHub `Never-lab/liquidazi`). Tag precedente: `v0.1.0-mvp`. `package.json` passa da `0.0.0` a `1.0.0`.

Sim educativo di SRL semplificata (cassa, IVA, F24, personale, prestiti). Non è consulenza fiscale.

### Added

- Loop mensile: fatture, scorte, staff, F24, IRES/IRAP, mutuo/fido, tesoreria.
- Mercato ISTAT + stock imprese provinciale; tabellone secca/boom; pressione rivale.
- Holding / acquisizioni; progetti annuali; upgrade a livelli; oneri annuali personale.
- Riscossione didattica (cartella, rateazione, pignoramento); posta in-game al posto del vecchio feed.
- Obiettivi/trofei account, classifiche, 3 slot salvataggio, Controllo admin su `/ops`.
- Landing/SEO, AdSense opt-in, brand Floatdesk (`floatdesk.app`).
- Deploy Railway con volume persistente.

### Changed

- Shock di cassa a inizio mese (niente parcheggio tesoreria per evitarli).
- Scorte: emergenza in % cassa; contratti con magazzino più redditizi; shock senza stock più cari.
- Reputazione: slot e domanda scalano oltre la soglia 80.

### Fixed

- Hardening runtime (rate limit, clamp sulle run) e UX F24/collection.

[Unreleased]: https://github.com/Never-lab/liquidazi/compare/v1.1.7...HEAD
[1.1.7]: https://github.com/Never-lab/liquidazi/releases/tag/v1.1.7
[1.1.6]: https://github.com/Never-lab/liquidazi/releases/tag/v1.1.6
[1.1.5]: https://github.com/Never-lab/liquidazi/releases/tag/v1.1.5
[1.1.1]: https://github.com/Never-lab/liquidazi/releases/tag/v1.1.1
[1.1.0]: https://github.com/Never-lab/liquidazi/releases/tag/v1.1.0
[1.0.1]: https://github.com/Never-lab/liquidazi/releases/tag/v1.0.1
[1.0.0]: https://github.com/Never-lab/liquidazi/releases/tag/v1.0.0

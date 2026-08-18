# Changelog

Note di release di **Floatdesk**. Formato [Keep a Changelog](https://keepachangelog.com/it/1.1.0/), versioni [SemVer](https://semver.org/lang/it/).

- Questo file: **cosa è cambiato** tra una release e l’altra (obbligo a ogni tag).
- Wiki (`docs/wiki/`): **come si gioca / come funziona** il sim.
- `ROADMAP.md`: coda di lavoro, non storico di release.

## [Unreleased]

### Added
- Pagine **Privacy** (`/privacy`) e **Termini** (`/termini`), link in footer e landing.
- Sessione account: logout dopo **2 ore** di inattività, tetto **7 giorni** dal login (ospite invariato).
- Reputazione a **tre layer** (locale / comunale / nazionale): punti all’incasso, tabellone misto, filtro mercato.

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

[Unreleased]: https://github.com/Never-lab/liquidazi/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/Never-lab/liquidazi/releases/tag/v1.1.0
[1.0.1]: https://github.com/Never-lab/liquidazi/releases/tag/v1.0.1
[1.0.0]: https://github.com/Never-lab/liquidazi/releases/tag/v1.0.0

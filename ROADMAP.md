# Liquidazi — ROADMAP

Indice unico di stato e coda. I piani/spec restano dove sono; qui si dice cosa è shipped e cosa è next.

## Done (shipped su `main`)

| Slice | Piano | Spec |
|-------|--------|------|
| MVP fasi 1–6 | [plans/01-mvp.md](plans/01-mvp.md) | — |
| Loop tension | [docs/superpowers/plans/2026-08-05-loop-tension.md](docs/superpowers/plans/2026-08-05-loop-tension.md) | [spec](docs/superpowers/specs/2026-08-05-loop-tension-design.md) |
| Staff / credito | [docs/superpowers/plans/2026-08-05-staff-credit-monster.md](docs/superpowers/plans/2026-08-05-staff-credit-monster.md) | [spec](docs/superpowers/specs/2026-08-05-staff-credit-monster-design.md) |
| Onboarding intro | [docs/superpowers/plans/2026-08-06-onboarding-clarity.md](docs/superpowers/plans/2026-08-06-onboarding-clarity.md) | [spec](docs/superpowers/specs/2026-08-06-onboarding-clarity-design.md) |
| Publish Railway + volume persist | [docs/superpowers/plans/2026-08-06-publish-railway.md](docs/superpowers/plans/2026-08-06-publish-railway.md) | [spec](docs/superpowers/specs/2026-08-06-publish-railway-design.md) (+ [PR #8](https://github.com/Never-lab/liquidazi/pull/8)) |
| Save mobile UX | [docs/superpowers/plans/2026-08-06-save-mobile-ux.md](docs/superpowers/plans/2026-08-06-save-mobile-ux.md) | [spec](docs/superpowers/specs/2026-08-06-save-mobile-ux-design.md) |
| UI icons + feedback | [docs/superpowers/plans/2026-08-06-ui-icons-feedback.md](docs/superpowers/plans/2026-08-06-ui-icons-feedback.md) | [spec](docs/superpowers/specs/2026-08-06-ui-icons-feedback-design.md) |
| Admin controllo | [PR #9](https://github.com/Never-lab/liquidazi/pull/9) · env `LIQUIDAZI_ADMIN_USERNAMES` in [README](README.md) | — |
| Feedback in-app | `POST /api/feedback` + Controllo (no GitHub required) | — |
| HUD icons (slice 2) | chrome sticky / F24 / toolbar / ops tabs | [spec follow-up](docs/superpowers/specs/2026-08-06-ui-icons-feedback-design.md) |
| Run balance monitor | Controllo → Bilancio run (bucket, difficoltà, settore) | — |
| Commesse stats clarity | [docs/superpowers/plans/2026-08-07-commesse-stats-clarity.md](docs/superpowers/plans/2026-08-07-commesse-stats-clarity.md) | [spec](docs/superpowers/specs/2026-08-07-commesse-stats-clarity-design.md) |
| Upgrade levels (slice 1) | [docs/superpowers/plans/2026-08-07-midgame-upgrade-levels.md](docs/superpowers/plans/2026-08-07-midgame-upgrade-levels.md) | [spec](docs/superpowers/specs/2026-08-07-midgame-progression-design.md) |
| Annual projects (slice 2) | [docs/superpowers/plans/2026-08-07-midgame-annual-projects.md](docs/superpowers/plans/2026-08-07-midgame-annual-projects.md) | [spec](docs/superpowers/specs/2026-08-07-midgame-progression-design.md) |
| Living staff (slice 3) | [docs/superpowers/plans/2026-08-07-midgame-living-staff.md](docs/superpowers/plans/2026-08-07-midgame-living-staff.md) | [spec](docs/superpowers/specs/2026-08-07-midgame-progression-design.md) |
| Holding flip / acquisizioni | [docs/superpowers/plans/2026-08-07-holding-flip-acq.md](docs/superpowers/plans/2026-08-07-holding-flip-acq.md) | [spec](docs/superpowers/specs/2026-08-07-holding-flip-acq-design.md) |
| Leaderboard run lunghe + realign save | [PR #22](https://github.com/Never-lab/liquidazi/pull/22) | — |
| Admin delete run da Controllo | [PR #23](https://github.com/Never-lab/liquidazi/pull/23) | — |
| Balance pass (#5 shock timing + #1 oneri staff) | [docs/superpowers/plans/2026-08-08-balance-pass.md](docs/superpowers/plans/2026-08-08-balance-pass.md) | [spec](docs/superpowers/specs/2026-08-08-balance-pass-design.md) |
| Fiscal collection (cartella / rateazione / pignoramento) | [docs/superpowers/plans/2026-08-08-fiscal-collection.md](docs/superpowers/plans/2026-08-08-fiscal-collection.md) | [spec](docs/superpowers/specs/2026-08-08-fiscal-collection-design.md) |
| Notification inbox (mail, replace EventFeed) | — | [spec](docs/superpowers/specs/2026-08-08-notification-inbox-design.md) |
| Wiki + Guida in-game + graphify refresh | [plan](docs/superpowers/plans/2026-08-08-wiki-guida.md) | [spec](docs/superpowers/specs/2026-08-08-wiki-guida-design.md) |
| Reputation market levers (#4) | — | [spec](docs/superpowers/specs/2026-08-08-reputation-market-design.md) |

## Next (coda attiva)

Una sola lista. Aggiornare qui quando si apre o chiude uno slice.

1. **Balance pass (resto: #2 domanda / #3 scorte / #6 shock senza stock)** — backlog sotto; monitor Controllo + feedback run lunghe.
2. **Deep panel icons (slice 3)** — iconografia dentro i body dei pannelli (assumi, rate, bilanci).
3. **Custom domain Railway** — deferito dal piano publish; subdomain gratis già ok.
4. **Più settori / generatori di domanda** — da post-MVP in [plans/01-mvp.md](plans/01-mvp.md).
5. **Cleanup pack geo in `docs/`** — `docs/istat-geo.json` / `docs/province-firms.json` non sono runtime; decidere se tenere come export o rimuovere (runtime = `src/config/`).

---

## Backlog bilanciamento (feedback run) — prima analisi

Idee da playtest (Normale / run lunghe). Stato codice al 2026-08. Priorità suggerita: **P0 exploit / loop rotto**, **P1 varianza domanda**, **P2 profondità sistemi**.

Prima di implementare: uno spec corto `docs/superpowers/specs/YYYY-MM-DD-balance-pass-design.md` che fissi numeri e ordine di ship (non tutto in un PR).

### 1. ~~Assunzione di massa (Operaio) senza ripercussioni~~ — **P0** → shipped (#1 oneri staff, balance pass 2026-08-08)

**Sintomo:** si assume un numero enorme di Operai per alzare le slot/mese; il costo non frena abbastanza il vantaggio sulle commesse.

**Oggi:** payroll mensile (lordo + INPS) sì; soft-cap capacità (`STAFF_FULL_VALUE` / punti oltre a ½) sì; morale sì. Manca un costo annuale “per testa” tipo IRAP/cuneo didattico sulla RAL. La proposta (tassa annuale per dipendente con RAL ~23k+ scalata per settore/guadagni) è coerente col tono fiscale del gioco.

**Direzione consigliata:**
- Non inventare una seconda paga mensile: un **addebito annuale** (es. chiusura FY o mese fisso) = `f(RAL stimata ruolo × settore × n dipendenti)`, con floor ~IRAP-style o “contributo INAIL/IRAP semplificato”.
- Alternativa più lazy (se i numeri annuali confondono): alzare **molto** il costo marginale oltre N Operai (morale + soft-cap più duro + ticket non scala lineare) *invece* della tassa — ma il feedback chiede esplicitamente RAL annuale → preferire la tassa didattica.
- UI: riga in Bilancio / Fisco “Oneri annuali personale”.

**File tipici:** `config/staffPay.ts`, `advanceMonth.ts` (FY), `PayrollPanel` / `ReportPanel`.

### 2. Commesse sempre 5–8, mai boom/carestia — **P1**

**Sintomo:** tabellone stabile (raramente &lt;5, mai ~12, mai 0–2). Manca tensione domanda.

**Oggi:** `saleTarget ≈ capacity + jitter`; soft cap `BOARD_MAX_OPS = 10`; floor anti soft-lock. Con staff alto il board satura in alto e non scende.

**Direzione consigliata:**
- Separare **capacità** (quanto puoi accettare) da **domanda** (quante offerte nascono): `demandMult` mensile (es. 0.0–1.4) con mesi “boom / normal / secca”, indipendente dallo staff.
- Boom: fino a 12 righe vendita *se* capacity lo permette (alza temporaneamente `BOARD_MAX_OPS` o un cap domanda).
- Secca: 0–2 offerte vendita anche con capacity alta; i **contratti** (multi-mese) restano generati a parte con RNG proprio (come chiesto).
- Coach/HUD: hint “mese di secca / picco domanda”.

**File tipici:** `events.ts` (`refreshMarketBoard`, `monthlyCapacity`), `contracts.ts`, pressioni trimestre.

### 3. Scorte da tabellone inutili vs emergenza 750 € — **P1**

**Sintomo:** scorte board = soldi buttati; emergenza flat 750 € domina late-game.

**Oggi:** senza scorte `ticket × 0.72` e default più alti; emergenza `EMERGENCY_SUPPLY_NET = 750` fissa (+2 mesi). Il gap cresce con la cassa.

**Direzione consigliata:**
- **Emergenza scalata:** `max(750, cash × k)` o `max(750, ticketMedio × n)` così resta “uscita di emergenza” cara.
- **Bonus solo contratti** se `supplyMonths > 0` (es. +% netto o −% rischio default / −mesi term) — non sulle commesse one-shot del board, così le scorte board hanno ROI mirato.
- Opzionale: consumare 1 mese scorte anche all’accettazione contratto, non solo al close.

**File tipici:** `events.ts` (`orderEmergencySupply`, accept paths), `contracts.ts`, `advanceMonth.ts`.

### 4. ~~Reputazione 80→100 senza effetto percepito~~ — **P1** → shipped (reputation market, 2026-08-08)

**Sintomo:** da 80 a 100 non cambia nulla di visibile su quantità offerte.

**Prima:** `repBonus = floor(reputation / 40)` → solo **+0 / +1 / +2** slot (soglie 0 / 40 / 80). Tra 80 e 100 il bonus slot era **identico**.

**Ora:** `repSlotBonus = round(rep/20)` (0…5), demand mult sul board, contract odds e default AR scalano con la rep (`src/sim/reputation.ts`). Tooltip Rep sul tabellone. Spec: [reputation-market-design](docs/superpowers/specs/2026-08-08-reputation-market-design.md).

### 5. ~~Exploit tesoreria vs shock % cassa (terremoto)~~ — **P0** → shipped (#5 shock timing, balance pass 2026-08-08)

**Sintomo:** deposito istantaneo in tesoreria → shock sul 20% della sola cassa liquida → ripreliево; si evita il danno.

**Oggi:** `depositTreasury` / `withdrawTreasury` immediati; `shockCash` usa solo `company.cash` (tesoreria esclusa). Exploit reale.

**Direzione consigliata (allineata al feedback):**
- **Settlement +1 mese:** deposito/prelievo → pending; cash resta fino a fine mese / inizio mese successivo, poi muove. Gli shock del mese corrente colpiscono ancora il saldo liquido.
- Alternativa più dura (se serve): base shock = `cash + treasury` (o % su entrambi). Settlement +1 è più didattico (“liquidità non è parcheggio magico”).
- UI: “In transito” su Investimenti; non annullabile nello stesso mese.

Il settlement +1 non è stato rilasciato: l'exploit è stato corretto applicando subito gli shock, mentre il settlement resta rinviato.

**File tipici:** `actions.ts` (treasury), `advanceMonth.ts`, `eventCatalog.ts` (`shockCash`), `InvestmentsPanel`.

### 6. Evento storage / perdita scorte senza stock — **P2**

**Sintomo:** se non hai scorte quando scatta incendio/fornitore/sinistro, la perdita monetaria resta bassa/fissa.

**Oggi:** molti shock tolgono scorte + cash flat o %; a `supplyMonths = 0` il pezzo scorte è no-op e resta solo il cash fisso (es. −700).

**Direzione consigliata:**
- Se `supplyMonths === 0` al trigger: **malus cash extra** (floor più alto o `% cassa` aggiuntiva) e/o `ytd` “riconversione / stockout”.
- Se hai scorte: comportamento attuale (consumi copertura).
- Copia evento: spiegare perché senza scorte costi di più (acquisto urgente / fermo).

**File tipici:** `eventCatalog.ts` (shock_fire, fornitore fallito, sinistro mezzo, ecc.).

### Ordine di attacco suggerito

| Ordine | Item | Perché |
|--------|------|--------|
| 1 | ~~**#5 tesoreria lag**~~ → shipped | Shock at month open; no treasury settlement in this slice |
| 2 | ~~**#1 costo annuale staff**~~ → shipped | Oneri annuali personale in FY close |
| 3 | **#2 domanda boom/secca** | Varianza run lunghe |
| 4 | **#3 scorte** | Sistemi già presenti ma spuntati |
| 5 | **#6 shock senza stock** | Ritocco eventi, dopo che scorte hanno valore |

---

## Repo map (dove mettere cosa)

| Path | Ruolo |
|------|--------|
| `src/` | UI + sim + config **runtime** |
| `server/` | API zero-dep + persistenza (`users` / `runs` / `saves`) |
| `plans/` | Piano MVP storico a fasi |
| `docs/superpowers/plans/` + `docs/superpowers/specs/` | Slice post-MVP (piano + design) |
| `docs/fiscal-snapshot/` | Specchio educational aliquote (non “legge live”) |
| `docs/*.json` | Pack sorgente / export; **non** importati dall’app |
| `src/config/*.json` | Geo / imprese **usati a runtime** (`market.ts`) |
| `.superpowers/sdd/` | Scratch report agente; non è documentazione di prodotto |
| [README.md](README.md) | Come giocare, run, deploy |
| [docs/README.md](docs/README.md) | Mappa corta di `docs/` |

**Convenzione nuovi slice:** design in `docs/superpowers/specs/YYYY-MM-DD-*-design.md`, piano in `docs/superpowers/plans/YYYY-MM-DD-*.md`, poi una riga in **Done** o **Next** qui.

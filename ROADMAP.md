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
| Supply / scorte pass (#3) | [plan](docs/superpowers/plans/2026-08-08-supply-scorte.md) | [spec](docs/superpowers/specs/2026-08-08-supply-scorte-design.md) |
| Demand boom/secca (#2) | [plan](docs/superpowers/plans/2026-08-08-demand-boom-secca.md) | [spec](docs/superpowers/specs/2026-08-08-demand-boom-secca-design.md) |
| Rival pressure pass | [plan](docs/superpowers/plans/2026-08-08-rival-pressure.md) | [spec](docs/superpowers/specs/2026-08-08-rival-pressure-design.md) |
| Security hardening (rate limit, run clamps) | — | audit session 2026-08-08 |
| Audit integrity UX (F24/collection) | — | [spec](docs/superpowers/specs/2026-08-08-audit-integrity-ux-design.md) |
| Shock senza stock (#6) | [plan](docs/superpowers/plans/2026-08-08-shock-senza-stock.md) | [spec](docs/superpowers/specs/2026-08-08-shock-senza-stock-design.md) |
| Compliance recovery + multi-mutuo credito | [plan](docs/superpowers/plans/2026-08-08-compliance-credito.md) | [spec](docs/superpowers/specs/2026-08-08-compliance-credito-design.md) |
| Investimenti UX + light balance | — | [spec](docs/superpowers/specs/2026-08-08-investimenti-ux-design.md) |

## Next (coda attiva)

Una sola lista. Aggiornare qui quando si apre o chiude uno slice.

1. **Ads stub (rails + end banner)** — [plan](docs/superpowers/plans/2026-08-08-ads-stub.md) · [spec](docs/superpowers/specs/2026-08-08-ads-stub-design.md) (segnaposto; rete dopo).
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

### 2. ~~Commesse sempre 5–8, mai boom/carestia~~ — **P1** → shipped (demand boom/secca, 2026-08-08)

**Sintomo:** tabellone stabile (raramente &lt;5, mai ~12, mai 0–2). Manca tensione domanda.

**Ora:** ogni refresh board fa roll `demandRegime` (20% secca / 60% normale / 20% boom); secca 0–2 vendite; boom `boardCap` 12; × `repDemandMult`; popup animato su estremi. Spec: [demand-boom-secca-design](docs/superpowers/specs/2026-08-08-demand-boom-secca-design.md).

### 3. ~~Scorte da tabellone inutili vs emergenza flat~~ — **P1** → shipped (supply-scorte, 2026-08-08)

**Sintomo:** scorte board = soldi buttati; emergenza flat 750 € dominava late-game.

**Ora:** emergenza `max(1500, round(cash × 0.10))`; contratti con scorte +8% netto; default ×0.85 se stocked; card forniture mostrano +1/+2 mesi. Spec: [supply-scorte-design](docs/superpowers/specs/2026-08-08-supply-scorte-design.md).

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

### 6. ~~Evento storage / perdita scorte senza stock~~ — **P2** → shipped (shock-senza-stock, 2026-08-08)

**Sintomo:** se non hai scorte quando scatta incendio/fornitore/sinistro, la perdita monetaria resta bassa/fissa.

**Ora:** helper `stockoutExtra` / `applySupplyShock`: se `supplyMonths === 0` al trigger, `extra = max(800×lost, round(cash×0.06×lost))` oltre al danno base. Spec: [shock-senza-stock-design](docs/superpowers/specs/2026-08-08-shock-senza-stock-design.md).

### Ordine di attacco suggerito

| Ordine | Item | Perché |
|--------|------|--------|
| 1 | ~~**#5 tesoreria lag**~~ → shipped | Shock at month open; no treasury settlement in this slice |
| 2 | ~~**#1 costo annuale staff**~~ → shipped | Oneri annuali personale in FY close |
| 3 | ~~**#2 domanda boom/secca**~~ → shipped | Regimi 20/60/20; boardCap boom 12; popup |
| 4 | ~~**#3 scorte**~~ → shipped | Emergenza 10% cassa; contratti +8%; UI mesi |
| 5 | ~~**#6 shock senza stock**~~ → shipped | Premium stockout su shock-scorte (2026-08-08) |


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

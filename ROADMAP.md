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

## Next (coda attiva)

Una sola lista. Aggiornare qui quando si apre o chiude uno slice.

1. **Deep panel icons (slice 3)** — iconografia dentro i body dei pannelli (assumi, rate, bilanci).
2. **Admin write actions** — ban soft / wipe save da Controllo (oggi sola lettura).
3. **Custom domain Railway** — deferito dal piano publish; subdomain gratis già ok.
4. **Più settori / generatori di domanda** — da post-MVP in [plans/01-mvp.md](plans/01-mvp.md).
5. **Clienti PA (tempi di pagamento lunghi)** — già parzialmente modellati; approfondire come slice dedicato se serve.
6. **Cleanup pack geo in `docs/`** — `docs/istat-geo.json` / `docs/province-firms.json` non sono runtime; decidere se tenere come export o rimuovere (runtime = `src/config/`).

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

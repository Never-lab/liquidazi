# Floatdesk — guida

Simulazione educativa di impresa (SRL semplificata). Questa wiki è il riferimento per i giocatori; nel gioco trovi la stessa Guida dal menu.

## Capitoli

| Pagina | Argomento |
|--------|-----------|
| [Come si gioca](help/come-si-gioca.md) | Loop, cassa, domanda, rivale |
| [Fisco e F24](help/fisco-e-f24.md) | Tasse, mora, cartella |
| [Personale e forza lavoro](help/personale-e-capacita.md) | Staff, FL, oneri |
| [Finanza](help/finanza.md) | Prestiti, tesoreria, scorte, shock |
| [FAQ](help/faq.md) | Blocchi frequenti |

## Novità recenti (agosto 2026)

- Tabellone **secca / boom**; popup solo al cambio regime
- **Pressione rivale** Calma / Tesa / Guerra
- Reputazione **locale / comunale / nazionale** (punti all’incasso; filtro mercato sul tabellone)
- Con **cartella** aperta l’F24 mensile è bloccato (in rateazione i nuovi F24 sì)
- Shock magazzino **senza scorte** costano di più

## Pagine tecniche (agent / sviluppo)

| Pagina | Argomento |
|--------|-----------|
| [architecture.md](architecture.md) | Stack, cartelle, store |
| [sim-loop.md](sim-loop.md) | Chiusura mese, shock, domanda, rivale |
| [fiscal.md](fiscal.md) | F24, mora, cartella, enforcement |
| [staff-ops.md](staff-ops.md) | Assunzioni, oneri, capacità |
| [holding.md](holding.md) | Acquisizioni |
| [ui-feedback.md](ui-feedback.md) | HUD, posta, toast |
| [deploy.md](deploy.md) | Railway / build / sync wiki |

## Manutenzione

1. Modifica i file in `docs/wiki/` (questa cartella è la fonte).
2. Dopo `help/`: `npm run wiki:sync-help`.
3. Specchio GitHub Wiki: `npm run wiki:sync-github`.

## Disclaimer

Modello didattico. Non è consulenza fiscale né software da commercialista.

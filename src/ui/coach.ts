import { UPGRADE_LIST, upgradeLevel } from "../config/upgrades";
import { DEFAULT_STAFF_MORALE } from "../sim/morale";
import { migrateUpgradeState } from "../sim/migrateUpgrades";
import type { GameState } from "../sim/types";

export type CoachTip = {
  id: string;
  title: string;
  body: string;
};

/** Guided tips for the first months — contextual, not a modal gauntlet. */
export const coachTipFor = (game: GameState): CoachTip | null => {
  if (game.pendingEvent) {
    return {
      id: "pending-event",
      title: "Decisione aperta",
      body: "Scegli un'opzione nel banner blu prima di chiudere un altro mese.",
    };
  }
  if (game.projectOffer) {
    return {
      id: "project-offer",
      title: "Piano investimenti",
      body: "A gennaio puoi scegliere un progetto annuale — nel banner o Salta, poi chiudi il mese.",
    };
  }
  if (game.monthsPlayed === 0 && game.invoices.filter((i) => i.kind === "AR").length === 0) {
    return {
      id: "first-deal",
      title: "Mese 1 — prima commessa",
      body: "Accetta una vendita dal tabellone. Non puoi inventare fatture: solo le offerte del mercato.",
    };
  }
  if (game.monthsPlayed === 0 && game.invoices.some((i) => i.kind === "AR")) {
    return {
      id: "close-month",
      title: "Chiudi il mese",
      body: "Premi «Chiudi il mese». L'incasso arriverà ai termini della fattura (PA = tardi).",
    };
  }
  const due = game.liabilities.filter((l) => !l.paid);
  if (game.monthsPlayed >= 1 && due.length > 0) {
    return {
      id: "f24",
      title: "Apri Fisco e paga l'F24",
      body: "Usa il banner giallo «Paga F24» (o Fisco nelle operazioni). Saltare costa sanzione + compliance peggiore sul credito.",
    };
  }
  const hasContractOffer = game.opportunities.some(
    (o) => o.kind === "sale" && (o.contractMonths ?? 0) >= 2,
  );
  if (game.monthsPlayed >= 2 && game.monthsPlayed <= 4 && hasContractOffer) {
    return {
      id: "offer-types",
      title: "Tre tipi di offerta",
      body: "Singola = una fattura e incasso tra pochi mesi. Appalto PA = una fattura grossa ma incasso lento. Contratto = fatture ogni mese per più mesi e FL bloccata: guarda il badge e la riga «Se accetti».",
    };
  }
  if (game.monthsPlayed >= 1 && game.monthsPlayed < 3) {
    return {
      id: "commesse-legend",
      title: "Cosa significano i numeri sopra le commesse",
      body: "FL = forza lavoro usata / disponibile; Tetto max = limite per una vendita; Scorte = mesi di magazzino; Contratti n/2 = multi-mese attivi (vedi elenco sotto). Su desktop, passa sui chip e sui badge delle card.",
    };
  }
  if (
    game.employees.length > 0 &&
    (game.staffMorale ?? DEFAULT_STAFF_MORALE) < 40 &&
    game.monthsPlayed >= 2
  ) {
    return {
      id: "staff-clima",
      title: "Clima del personale",
      body: "Clima basso in Personale: rischio dimissioni e meno FL effettiva. Migliora con utili, F24 in regola, Responsabile e progetto Formazione.",
    };
  }
  if (game.monthsPlayed >= 2 && game.employees.length === 0 && game.monthsPlayed < 6) {
    return {
      id: "hire",
      title: "Forza lavoro",
      body: "Assumi se manca FL per le commesse in tabellone. I primi 6 dipendenti contano pieno; oltre rendono meno. Oppure compra «Processi» (+8 FL).",
    };
  }
  const migratedLevels = migrateUpgradeState(game);
  const noUpgradeLevels = UPGRADE_LIST.every(
    (u) => upgradeLevel(migratedLevels, u.id) < 1,
  );
  if (game.monthsPlayed >= 3 && noUpgradeLevels && game.company.cash > 4000) {
    return {
      id: "upgrade",
      title: "Migliora l'azienda",
      body: "In Upgrade: gestionale F24 automatico, commerciale (+commesse), sede (−affitto), processi (+8 FL).",
    };
  }
  if (
    (game.lastYearReport?.profit ?? 0) > 0 &&
    (game.treasury ?? 0) === 0 &&
    game.company.cash > 5000
  ) {
    return {
      id: "invest",
      title: "Investi l'utile",
      body: "In Investimenti: parcheggia in tesoreria o reinvesti in crescita (+8 FL). In Holding: acquisisci partecipate.",
    };
  }
  if (game.calendar.month === 5 || game.calendar.month === 10) {
    return {
      id: "boss",
      title: "Mese boss in arrivo",
      body: "A giugno/novembre arrivano IRES/IRAP (saldo o acconti). Tieni cassa libera.",
    };
  }
  if (game.monthsBelowZero > 0) {
    return {
      id: "red",
      title: "Sei in rosso",
      body: "La banca può proporti un prestito. 12 mesi consecutivi sotto zero = KO.",
    };
  }
  return null;
};

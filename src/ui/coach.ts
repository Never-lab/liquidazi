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
  if (game.monthsPlayed >= 2 && game.employees.length === 0 && game.monthsPlayed < 6) {
    return {
      id: "hire",
      title: "Capacità",
      body: "Assumi se il tabellone ha slot vuoti. I primi 6 dipendenti contano pieno; oltre rendono meno. Oppure compra «Processi».",
    };
  }
  if (game.monthsPlayed >= 3 && (game.upgrades?.length ?? 0) === 0 && game.company.cash > 4000) {
    return {
      id: "upgrade",
      title: "Migliora l'azienda",
      body: "In Upgrade: gestionale F24 automatico, commerciale (+commesse), sede (−affitto), processi (+slot).",
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
      body: "In Investimenti: parcheggia in tesoreria, reinvesti in crescita (+slot) o acquisisci fino a 3 partecipate.",
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

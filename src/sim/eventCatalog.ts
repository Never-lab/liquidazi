import { DIFFICULTIES } from "../config/difficulty";
import { SECTOR_PROFILES } from "../config/sectorProfile";
import { maxDealNet, rng } from "./events";
import {
  round2,
  toMonthIndex,
  type GameState,
  type PendingEvent,
} from "./types";

const pushLog = (
  state: GameState,
  tone: "good" | "bad" | "neutral",
  text: string,
): void => {
  state.log.unshift({
    id: state.nextId++,
    monthIdx: toMonthIndex(state.calendar),
    tone,
    text,
  });
  state.log = state.log.slice(0, 12);
};

type ChoiceDef = {
  kind: "choice";
  id: string;
  title: string;
  body: string;
  options: {
    id: string;
    label: string;
    apply: (s: GameState) => void;
  }[];
};

const CHOICE_POOL: ChoiceDef[] = [
  {
    kind: "choice",
    id: "pa_big",
    title: "Appalto PA grosso",
    body: "Un ente offre una commessa grande, ma paga tra 4–6 mesi (split payment). Accetti?",
    options: [
      {
        id: "take",
        label: "Accetta (incasso lontano)",
        apply: (s) => {
          const net = round2(maxDealNet(s) * 1.35);
          s.opportunities.push({
            id: s.nextId++,
            kind: "sale",
            title: "Appalto PA · ente centrale",
            net,
            expiresInMonths: 1,
            clientType: "pa",
            termMonths: 5,
          });
          pushLog(s, "good", `Accettato appalto PA da ${net.toLocaleString("it-IT")} € + IVA (pagamenti lunghi).`);
        },
      },
      {
        id: "skip",
        label: "Rifiuta",
        apply: (s) => {
          pushLog(s, "neutral", "Hai lasciato l'appalto PA: meno stress di cassa, meno fatturato.");
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "consultant",
    title: "Consulente fiscale",
    body: "Uno studio propone un check a pagamento: migliora la compliance, costa liquidità.",
    options: [
      {
        id: "hire",
        label: "Paga 1 200 €",
        apply: (s) => {
          s.company.cash = round2(s.company.cash - 1200);
          s.ytd.otherCosts = round2(s.ytd.otherCosts + 1200);
          s.compliance = Math.min(100, s.compliance + 15);
          pushLog(s, "good", "Consulente pagato: compliance +15.");
        },
      },
      {
        id: "skip",
        label: "Rischia da solo",
        apply: (s) => {
          s.compliance = Math.max(0, s.compliance - 5);
          pushLog(s, "bad", "Niente consulente: compliance −5.");
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "price_cut",
    title: "Pressione sui prezzi",
    body: "Un cliente chiede sconto. Tagliare alza le probabilità di chiudere, ma brucia reputazione.",
    options: [
      {
        id: "cut",
        label: "Sconta (−rep, +deal)",
        apply: (s) => {
          s.company.reputation = Math.max(0, s.company.reputation - 8);
          const net = round2(maxDealNet(s) * 0.85);
          s.opportunities.push({
            id: s.nextId++,
            kind: "sale",
            title: "Commessa · scontata",
            net,
            expiresInMonths: 1,
            clientType: "private",
            termMonths: 1,
          });
          pushLog(s, "neutral", "Sconto concesso: reputazione −8, una vendita extra sul tabellone.");
        },
      },
      {
        id: "hold",
        label: "Tieni il listino",
        apply: (s) => {
          s.company.reputation = Math.min(100, s.company.reputation + 2);
          pushLog(s, "good", "Listino tenuto: reputazione +2.");
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "temp_hire",
    title: "Collaboratore temporaneo",
    body: "Un temp può coprire 2 mesi (+1 slot capacità) per 1 800 € subito.",
    options: [
      {
        id: "hire",
        label: "Assumi temp (−1 800 €)",
        apply: (s) => {
          s.company.cash = round2(s.company.cash - 1800);
          s.ytd.otherCosts = round2(s.ytd.otherCosts + 1800);
          s.tempCapacityMonths = Math.max(s.tempCapacityMonths, 2);
          pushLog(s, "good", "Temp in forza: +1 capacità per 2 mesi.");
        },
      },
      {
        id: "skip",
        label: "No, restiamo snelli",
        apply: (s) => {
          pushLog(s, "neutral", "Niente temp: capacity invariata.");
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "dispute",
    title: "Contenzioso cliente",
    body: "Un privato ritarda. Puoi chiudere con sconto (incassi subito, −rep) o aspettare.",
    options: [
      {
        id: "settle",
        label: "Transigi e incassa",
        apply: (s) => {
          const open = s.invoices.find(
            (i) => i.kind === "AR" && !i.settled && !i.defaulted && i.clientType !== "pa",
          );
          if (open) {
            const inflow = round2(open.net * 0.85);
            open.settled = true;
            s.company.cash = round2(s.company.cash + inflow);
            s.company.reputation = Math.max(0, s.company.reputation - 6);
            pushLog(
              s,
              "neutral",
              `Transazione su fattura #${open.id}: +${inflow.toLocaleString("it-IT")} €, rep −6.`,
            );
          } else {
            const bonus = round2(400 + (s.nextId % 200));
            s.company.cash = round2(s.company.cash + bonus);
            s.company.reputation = Math.max(0, s.company.reputation - 4);
            pushLog(s, "neutral", `Piccola transazione: +${bonus.toLocaleString("it-IT")} €, rep −4.`);
          }
        },
      },
      {
        id: "wait",
        label: "Aspetta i termini",
        apply: (s) => {
          pushLog(s, "neutral", "Aspetti i termini contrattuali: cassa ferma, reputazione intatta.");
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "marketing",
    title: "Campagna locale",
    body: "Investi in promozione sul territorio: −2 000 €, reputazione e un lead in più.",
    options: [
      {
        id: "spend",
        label: "Investi 2 000 €",
        apply: (s) => {
          s.company.cash = round2(s.company.cash - 2000);
          s.ytd.otherCosts = round2(s.ytd.otherCosts + 2000);
          s.company.reputation = Math.min(100, s.company.reputation + 10);
          const net = round2(maxDealNet(s) * 0.7);
          s.opportunities.push({
            id: s.nextId++,
            kind: "sale",
            title: "Commessa · da campagna",
            net,
            expiresInMonths: 1,
            clientType: "private",
            termMonths: 1,
          });
          pushLog(s, "good", "Campagna lanciata: rep +10 e un lead sul tabellone.");
        },
      },
      {
        id: "skip",
        label: "Risparmia",
        apply: (s) => {
          pushLog(s, "neutral", "Niente campagna questo mese.");
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "insurance",
    title: "Assicurazione crediti",
    body: "Copertura insoluti per 6 mesi: −900 €. Riduce il rischio sui privati.",
    options: [
      {
        id: "buy",
        label: "Stipula (−900 €)",
        apply: (s) => {
          s.company.cash = round2(s.company.cash - 900);
          s.ytd.otherCosts = round2(s.ytd.otherCosts + 900);
          s.company.reputation = Math.min(100, s.company.reputation + 3);
          pushLog(s, "good", "Assicurazione crediti attiva (didattica): un po' più di serenità.");
        },
      },
      {
        id: "skip",
        label: "Resta scoperto",
        apply: (s) => {
          pushLog(s, "neutral", "Niente assicurazione: gli insoluti restano interamente tuoi.");
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "overtime",
    title: "Straordinari",
    body: "Il team può fare straordinari questo mese (+1 slot) a fronte di un premio di 600 €.",
    options: [
      {
        id: "yes",
        label: "Autorizza (+1 slot)",
        apply: (s) => {
          s.company.cash = round2(s.company.cash - 600);
          s.ytd.payrollCost = round2(s.ytd.payrollCost + 600);
          s.tempCapacityMonths = Math.max(s.tempCapacityMonths, 1);
          pushLog(s, "good", "Straordinari: +1 capacità per questo ciclo.");
        },
      },
      {
        id: "no",
        label: "Rifiuta",
        apply: (s) => {
          pushLog(s, "neutral", "Niente straordinari.");
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "rival_push",
    title: "Il rivale alza la voce",
    body: "La concorrenza locale ti sfida sul territorio. Come rispondi?",
    options: [
      {
        id: "campaign",
        label: "Campagna (−800 €)",
        apply: (s) => {
          s.company.cash = round2(s.company.cash - 800);
          s.ytd.otherCosts = round2(s.ytd.otherCosts + 800);
          if (s.rival) {
            s.rival = { ...s.rival, heat: Math.max(0, s.rival.heat - 14) };
          }
          s.company.reputation = Math.min(100, s.company.reputation + 2);
          const who = s.rival?.name ?? "Il rivale";
          pushLog(
            s,
            "good",
            `${who}: campagna commerciale −800 € · heat ${Math.round(s.rival?.heat ?? 0)}.`,
          );
        },
      },
      {
        id: "undercut",
        label: "Guerra prezzi (−rep)",
        apply: (s) => {
          s.company.reputation = Math.max(0, s.company.reputation - 6);
          if (s.rival) {
            s.rival = { ...s.rival, heat: Math.max(0, s.rival.heat - 6) };
          }
          const net = round2(maxDealNet(s) * 0.7);
          s.opportunities.push({
            id: s.nextId++,
            kind: "sale",
            title: "Commessa · prezzo aggressivo",
            net,
            expiresInMonths: 1,
            clientType: "private",
            termMonths: 1,
          });
          const who = s.rival?.name ?? "Il rivale";
          pushLog(
            s,
            "neutral",
            `${who}: guerra prezzi — rep −6, deal scontato sul tabellone.`,
          );
        },
      },
      {
        id: "ignore",
        label: "Ignora",
        apply: (s) => {
          if (s.rival) {
            s.rival = { ...s.rival, heat: Math.min(100, s.rival.heat + 10) };
          }
          const who = s.rival?.name ?? "Il rivale";
          pushLog(s, "bad", `${who}: lo ignori — heat sale a ${Math.round(s.rival?.heat ?? 0)}.`);
        },
      },
    ],
  },
];

const findChoiceDef = (id: string): ChoiceDef | undefined =>
  CHOICE_POOL.find((c) => c.id === id);

const toPending = (def: ChoiceDef): PendingEvent => ({
  id: def.id,
  title: def.title,
  body: def.body,
  options: def.options.map((o) => ({ id: o.id, label: o.label })),
});

const applyCalendar = (state: GameState, rand: () => number): void => {
  const month = state.calendar.month;

  if (month === 5) {
    pushLog(
      state,
      "neutral",
      "Maggio: prepara la cassa — a giugno arrivano acconti IRES/IRAP e il diritto camerale.",
    );
  }
  if (month === 6) {
    if (state.compliance < 55 && rand() < 0.55) {
      const fine = round2(400 + rand() * 900);
      state.company.cash = round2(state.company.cash - fine);
      state.ytd.otherCosts = round2(state.ytd.otherCosts + fine);
      state.compliance = Math.max(0, state.compliance - 8);
      pushLog(
        state,
        "bad",
        `Giugno — controllo soft (compliance bassa): −${fine.toLocaleString("it-IT")} €.`,
      );
    } else if (rand() < 0.4) {
      const extra = round2(120 + rand() * 280);
      state.company.cash = round2(state.company.cash - extra);
      state.ytd.otherCosts = round2(state.ytd.otherCosts + extra);
      pushLog(
        state,
        "bad",
        `Giugno — pratica camerale / bolli extra: −${extra.toLocaleString("it-IT")} €.`,
      );
    } else {
      pushLog(state, "neutral", "Giugno: mese boss fiscale. Tieni d'occhio F24 e acconti.");
    }
  }
  if (month === 8) {
    const hit = round2(250 + rand() * 550);
    state.company.cash = round2(state.company.cash - hit);
    state.ytd.otherCosts = round2(state.ytd.otherCosts + hit);
    if (state.tempCapacityMonths < 1 && rand() < 0.5) {
      // soft: drop one open sale from board if any
      const saleIdx = state.opportunities.findIndex((o) => o.kind === "sale");
      if (saleIdx >= 0) state.opportunities.splice(saleIdx, 1);
      pushLog(
        state,
        "bad",
        `Agosto — ferie clienti: ticket bassi, −${hit.toLocaleString("it-IT")} € e una commessa in meno.`,
      );
    } else {
      pushLog(
        state,
        "bad",
        `Agosto — stagione bassa / ferie: ticket ridotti, −${hit.toLocaleString("it-IT")} € di liquidità assorbita.`,
      );
    }
  }
  if (month === 9) {
    pushLog(
      state,
      "good",
      "Settembre — ripresa: ticket in ripresa, clienti tornano. Buon mese per riempire gli slot.",
    );
    if (rand() < 0.55) {
      const bonus = round2(maxDealNet(state) * (0.55 + rand() * 0.35));
      state.opportunities.push({
        id: state.nextId++,
        kind: "sale",
        title: "Commessa · ripresa settembre",
        net: bonus,
        expiresInMonths: 1,
        clientType: "private",
        termMonths: 1,
      });
      pushLog(
        state,
        "good",
        `Ripresa: +1 lead da ${bonus.toLocaleString("it-IT")} € + IVA sul tabellone.`,
      );
    }
  }
  if (month === 11) {
    pushLog(
      state,
      "neutral",
      "Novembre: secondo acconto IRES/IRAP in arrivo. Non bruciare tutta la cassa in commesse PA.",
    );
  }
  if (month === 12) {
    pushLog(
      state,
      "bad",
      "Dicembre — liquidità stretta: 13ª, chiusure clienti e F24 non aspettano. Tieni cuscinetto.",
    );
  }
};

const applyAuto = (state: GameState, rand: () => number): void => {
  const roll = rand();

  if (state.compliance < 50 && roll < 0.28) {
    const fine = round2(500 + rand() * 1200);
    state.company.cash = round2(state.company.cash - fine);
    state.ytd.otherCosts = round2(state.ytd.otherCosts + fine);
    state.compliance = Math.max(0, state.compliance - 10);
    pushLog(
      state,
      "bad",
      `Ispezione / cartella soft: −${fine.toLocaleString("it-IT")} € (compliance ${Math.round(state.compliance)}).`,
    );
    return;
  }

  if (roll < 0.25) {
    const open = state.invoices.filter((i) => i.kind === "AR" && !i.settled && !i.defaulted);
    let n = 0;
    for (const inv of open.slice(0, 2)) {
      inv.dueIdx += 1;
      n += 1;
    }
    if (n > 0) {
      pushLog(state, "bad", `Ritardi clienti: ${n} fattura/e slittano di un mese.`);
      return;
    }
  }

  if (roll < 0.45) {
    const hit = round2(320 + rand() * 980);
    state.company.cash = round2(state.company.cash - hit);
    state.ytd.otherCosts = round2(state.ytd.otherCosts + hit);
    pushLog(state, "bad", `Costo imprevisto: −${hit.toLocaleString("it-IT")} €.`);
    return;
  }

  if (roll < 0.7) {
    const profile = SECTOR_PROFILES[state.company.sector];
    const isPa = rand() < profile.paChance + 0.1;
    const bonus = round2(maxDealNet(state) * (0.45 + rand() * 0.4));
    const terms = isPa ? profile.paTerms : profile.privateTerms;
    const termMonths = terms[Math.floor(rand() * terms.length)] ?? 1;
    state.opportunities.push({
      id: state.nextId++,
      kind: "sale",
      title: isPa ? "Urgenza PA" : "Urgenza privato",
      net: bonus,
      expiresInMonths: 1,
      clientType: isPa ? "pa" : "private",
      termMonths,
    });
    pushLog(
      state,
      "good",
      `Commessa urgente (${isPa ? "PA" : "privato"}) da ${bonus.toLocaleString("it-IT")} € + IVA.`,
    );
    return;
  }

  pushLog(
    state,
    "neutral",
    "Promemoria: F24, stipendi e TFR non aspettano gli incassi PA.",
  );
};

/**
 * After month close: calendar flavour + optional world event (auto or pending choice).
 * Calendar month is the *new* month already advanced.
 */
export const runWorldEvents = (state: GameState): GameState => {
  const next = structuredClone(state);
  next.pendingEvent ??= null;
  next.tempCapacityMonths ??= 0;

  const rand = rng(toMonthIndex(next.calendar) * 1337 + next.monthsPlayed * 17);
  applyCalendar(next, rand);

  const diff = DIFFICULTIES[next.difficulty ?? "normal"];
  if (rand() > diff.eventSkipAbove) {
    // still ran calendar; no extra world roll
    return next;
  }

  // Don't stack a new choice if one is somehow still pending
  if (next.pendingEvent) return next;

  // Rival challenge when heat is high (prefer over generic pool)
  if (next.rival && next.rival.heat >= 55) {
    const rivalChance = 0.2 + (next.rival.heat - 55) / 160;
    if (rand() < rivalChance) {
      const def = findChoiceDef("rival_push")!;
      const pending = toPending(def);
      pending.title = `${next.rival.name} alza la voce`;
      pending.body = `${next.rival.name} ti sfida in zona (heat ${Math.round(next.rival.heat)}). Campagna, guerra prezzi o ignori?`;
      next.pendingEvent = pending;
      pushLog(next, "neutral", `Decisione: ${pending.title}`);
      return next;
    }
  }

  if (rand() < diff.choiceChance) {
    const pool = CHOICE_POOL.filter((c) => c.id !== "rival_push");
    const def = pool[Math.floor(rand() * pool.length)]!;
    next.pendingEvent = toPending(def);
    pushLog(next, "neutral", `Decisione: ${def.title}`);
    return next;
  }

  applyAuto(next, rand);
  return next;
};

/** Apply a pending choice option; clears pendingEvent. */
export const resolveEventOption = (state: GameState, optionId: string): GameState => {
  const pending = state.pendingEvent;
  if (!pending) return state;
  const def = findChoiceDef(pending.id);
  if (!def) {
    const cleared = structuredClone(state);
    cleared.pendingEvent = null;
    return cleared;
  }
  const opt = def.options.find((o) => o.id === optionId);
  if (!opt) return state;

  const next = structuredClone(state);
  next.tempCapacityMonths ??= 0;
  opt.apply(next);
  next.pendingEvent = null;
  return next;
};

/** @deprecated use runWorldEvents */
export const applyRandomEvent = runWorldEvents;

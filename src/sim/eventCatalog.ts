import { DIFFICULTIES } from "../config/difficulty";
import { SECTOR_PROFILES } from "../config/sectorProfile";
import { CARTELLA_EVENT_ID } from "./collection";
import { maxDealNet, rng } from "./events";
import { rivalCampaignCost } from "./rival";
import {
  applyChains,
  chainKeyId,
  effectiveWeight,
  pickWeighted,
  type ChainLink,
  type EventFamily,
  type WorldEventMeta,
} from "./worldEvents";
import { applyStaffAbsence, STAFF_CHOICE_STUBS, tryQueueStaffEvent } from "./staffEvents";
import {
  round2,
  toMonthIndex,
  type GameState,
  type PendingEvent,
} from "./types";
import { loseSupplyMonths, warehouseMonths } from "./supplies";

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

/** Count toward clearing rival floor after contain responses. */
const applyRivalAnchorClear = (s: GameState): void => {
  if (!s.rival) return;
  const floor = s.rival.floor;
  if (floor == null || s.rival.contained) return;
  const clears = (s.rival.anchorClears ?? 0) + 1;
  if (clears >= 2) {
    s.rival = { ...s.rival, floor: undefined, anchorClears: 0 };
  } else {
    s.rival = {
      ...s.rival,
      anchorClears: clears,
      heat: Math.max(floor, s.rival.heat),
    };
  }
};

/** If cash went negative, pull from treasury (emergency fund). Returns amount taken. */
export const coverNegativeCashFromTreasury = (s: GameState): number => {
  s.treasury ??= 0;
  if (s.company.cash >= 0 || s.treasury <= 0) return 0;
  const need = round2(-s.company.cash);
  const take = round2(Math.min(s.treasury, need));
  s.treasury = round2(s.treasury - take);
  s.company.cash = round2(s.company.cash + take);
  pushLog(
    s,
    "neutral",
    `Fondo emergenza: −${take.toLocaleString("it-IT")} € dalla tesoreria per coprire la cassa.`,
  );
  return take;
};

type ChoiceDef = {
  kind: "choice";
  id: string;
  family?: EventFamily;
  spawn?: "weighted" | "system";
  weight?: number;
  chains?: ChainLink[];
  title: string;
  body: string;
  options: {
    id: string;
    label: string;
    apply: (s: GameState) => void;
  }[];
};

const CHAIN_ROAD: ChainLink[] = [{ target: chainKeyId("shock_road_block"), months: 2, mul: 4 }];
const CHAIN_DELAY: ChainLink[] = [{ target: chainKeyId("shock_delivery_delay"), months: 2, mul: 4 }];
const CHAIN_CARTELLA: ChainLink[] = [{ target: chainKeyId("fiscal_cartella"), months: 2, mul: 2 }];

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
            marketLayer: "municipal",
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
            marketLayer: "local",
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
    body: "Un temp può coprire 2 mesi (+8 FL) per 1 800 € subito.",
    options: [
      {
        id: "hire",
        label: "Assumi temp (−1 800 €)",
        apply: (s) => {
          s.company.cash = round2(s.company.cash - 1800);
          s.ytd.otherCosts = round2(s.ytd.otherCosts + 1800);
          s.tempCapacityMonths = Math.max(s.tempCapacityMonths, 2);
          pushLog(s, "good", "Temp in forza: +8 FL per 2 mesi.");
        },
      },
      {
        id: "skip",
        label: "No, restiamo snelli",
        apply: (s) => {
          pushLog(s, "neutral", "Niente temp: forza lavoro invariata.");
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
            marketLayer: "local",
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
    body: "Il team può fare straordinari questo mese (+8 FL) a fronte di un premio di 600 €.",
    options: [
      {
        id: "yes",
        label: "Autorizza (+8 FL)",
        apply: (s) => {
          s.company.cash = round2(s.company.cash - 600);
          s.ytd.payrollCost = round2(s.ytd.payrollCost + 600);
          s.tempCapacityMonths = Math.max(s.tempCapacityMonths, 1);
          pushLog(s, "good", "Straordinari: +8 FL per questo ciclo.");
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
        label: "Campagna (costo variabile)",
        apply: (s) => {
          const cost = rivalCampaignCost(s.company.cash);
          s.company.cash = round2(s.company.cash - cost);
          s.ytd.otherCosts = round2(s.ytd.otherCosts + cost);
          if (s.rival) {
            s.rival = { ...s.rival, heat: Math.max(0, s.rival.heat - 14) };
            applyRivalAnchorClear(s);
          }
          s.company.reputation = Math.min(100, s.company.reputation + 2);
          const who = s.rival?.name ?? "Il rivale";
          pushLog(
            s,
            "good",
            `${who}: campagna commerciale −${cost.toLocaleString("it-IT")} € · pressione ${Math.round(s.rival?.heat ?? 0)}.`,
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
            applyRivalAnchorClear(s);
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
            marketLayer: "local",
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
            let heat = Math.min(100, s.rival.heat + 10);
            if (s.rival.floor != null && !s.rival.contained) {
              heat = Math.max(s.rival.floor, heat);
            }
            s.rival = { ...s.rival, heat };
          }
          const who = s.rival?.name ?? "Il rivale";
          pushLog(
            s,
            "bad",
            `${who}: lo ignori — pressione sale a ${Math.round(s.rival?.heat ?? 0)}.`,
          );
        },
      },
    ],
  },
];

/** Forced mid/late-game shocks — single option applied immediately. */
const shockCash = (s: GameState, pct: number, floor: number): number => {
  const hit = round2(Math.max(floor, Math.max(0, s.company.cash) * pct));
  s.company.cash = round2(s.company.cash - hit);
  s.ytd.otherCosts = round2(s.ytd.otherCosts + hit);
  return hit;
};

/** Stockout premium when a supply shock hits with no coverage left. */
export const stockoutExtra = (cashBefore: number, lostMonths: number): number => {
  if (lostMonths <= 0) return 0;
  const cash = Math.max(0, cashBefore);
  return Math.max(800 * lostMonths, Math.round(cash * 0.06 * lostMonths));
};

type SupplyShockOpts = {
  lostMonths: number;
  wipeSupply?: boolean;
  /** Flat cash hit (mutually exclusive with pct in practice). */
  baseFlat?: number;
  basePct?: number;
  baseFloor?: number;
  label: string;
};

const applySupplyShock = (s: GameState, opts: SupplyShockOpts): void => {
  const before = warehouseMonths(s);
  const cashBefore = Math.max(0, s.company.cash);
  loseSupplyMonths(s, opts.lostMonths, opts.wipeSupply);

  let baseHit = 0;
  if (opts.baseFlat != null && opts.baseFlat > 0) {
    baseHit = opts.baseFlat;
    s.company.cash = round2(s.company.cash - baseHit);
    s.ytd.otherCosts = round2(s.ytd.otherCosts + baseHit);
  } else if (opts.basePct != null) {
    baseHit = shockCash(s, opts.basePct, opts.baseFloor ?? 0);
  }

  let extra = 0;
  if (before === 0) {
    const lost = opts.wipeSupply ? 2 : opts.lostMonths;
    extra = stockoutExtra(cashBefore, lost);
    if (extra > 0) {
      s.company.cash = round2(s.company.cash - extra);
      s.ytd.otherCosts = round2(s.ytd.otherCosts + extra);
    }
  }

  const total = round2(baseHit + extra);
  if (extra > 0) {
    pushLog(
      s,
      "bad",
      `${opts.label}: scorte già a zero — riconversione −${total.toLocaleString("it-IT")} € (base + stockout).`,
    );
  } else if (opts.wipeSupply) {
    pushLog(
      s,
      "bad",
      `${opts.label}: scorte a zero, −${total.toLocaleString("it-IT")} € di riconversione.`,
    );
  } else {
    pushLog(
      s,
      "bad",
      `${opts.label}: scorte ${before}→${warehouseMonths(s)}, −${total.toLocaleString("it-IT")} €.`,
    );
  }
};

const SHOCK_POOL: ChoiceDef[] = [
  {
    kind: "choice",
    id: "shock_fire",
    family: "ambientale",
    title: "Incendio in magazzino",
    body: "Un principio d'incendio rovina parte delle scorte. Paghi la messa in sicurezza e perdi copertura. Senza scorte il ripristino urgente costa di più.",
    options: [
      {
        id: "ok",
        label: "Affronta (−2 scorte, −500 €+)",
        apply: (s) => {
          applySupplyShock(s, { lostMonths: 2, baseFlat: 500, label: "Incendio" });
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_quake",
    family: "ambientale",
    chains: CHAIN_ROAD,
    title: "Terremoto — uffici danneggiati",
    body: "La sede ha subito danni strutturali. Il 20% della cassa liquida va alle riparazioni.",
    options: [
      {
        id: "ok",
        label: "Paga riparazioni (20% cassa)",
        apply: (s) => {
          const hit = shockCash(s, 0.2, 0);
          pushLog(s, "bad", `Terremoto: riparazioni −${hit.toLocaleString("it-IT")} €.`);
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_flood",
    family: "ambientale",
    chains: CHAIN_ROAD,
    title: "Alluvione / infiltrazione",
    body: "Acqua in deposito e uffici. Scorte danneggiate e costi di ripristino. Senza scorte paghi di più la ricostituzione urgente.",
    options: [
      {
        id: "ok",
        label: "Ripristina (−1 scorta, −12% cassa+)",
        apply: (s) => {
          applySupplyShock(s, {
            lostMonths: 1,
            basePct: 0.12,
            baseFloor: 800,
            label: "Alluvione",
          });
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_cyber",
    title: "Attacco informatico",
    body: "Ransomware sui gestionali. Ripristino a pagamento e compliance in caduta.",
    options: [
      {
        id: "ok",
        label: "Ripristina (−8% cassa, compliance −8)",
        apply: (s) => {
          const hit = shockCash(s, 0.08, 600);
          s.compliance = Math.max(0, s.compliance - 8);
          pushLog(s, "bad", `Cyber: −${hit.toLocaleString("it-IT")} €, compliance ${Math.round(s.compliance)}.`);
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_strike",
    title: "Vertenza sindacale",
    body: "Il personale ferma le consegne. Serve un premio una tantum per sbloccare.",
    options: [
      {
        id: "ok",
        label: "Chiudi la vertenza (−1 200 €)",
        apply: (s) => {
          s.company.cash = round2(s.company.cash - 1200);
          s.ytd.payrollCost = round2(s.ytd.payrollCost + 1200);
          if ((s.tempCapacityMonths ?? 0) > 0) s.tempCapacityMonths = 0;
          else s.company.reputation = Math.max(0, s.company.reputation - 6);
          pushLog(s, "bad", "Vertenza: −1 200 € e operatività ridotta.");
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_tax_raid",
    family: "burocratico",
    title: "Accesso Agenzia delle Entrate",
    body: "Controllo documentale a sorpresa. Accantoni sanzioni soft e la compliance ne risente.",
    options: [
      {
        id: "ok",
        label: "Gestisci (−10% cassa, compliance −12)",
        apply: (s) => {
          const hit = shockCash(s, 0.1, 900);
          s.compliance = Math.max(0, s.compliance - 12);
          pushLog(s, "bad", `Accesso AdE: −${hit.toLocaleString("it-IT")} €, compliance ${Math.round(s.compliance)}.`);
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_client_broke",
    title: "Cliente strategico in crisi",
    body: "Il tuo maggior credito aperto va in default: non incassi e bruci reputazione.",
    options: [
      {
        id: "ok",
        label: "Prendi atto (insoluto + rep −12)",
        apply: (s) => {
          const open = s.invoices
            .filter((i) => i.kind === "AR" && !i.settled && !i.defaulted)
            .sort((a, b) => b.net - a.net);
          const inv = open[0];
          if (inv) {
            inv.settled = true;
            inv.defaulted = true;
            pushLog(
              s,
              "bad",
              `Cliente in crisi: insoluto #${inv.id} (${inv.net.toLocaleString("it-IT")} €) perso.`,
            );
          } else {
            const hit = shockCash(s, 0.06, 700);
            pushLog(s, "bad", `Cliente in crisi (nessun credito aperto): −${hit.toLocaleString("it-IT")} € di contenzioso.`);
          }
          s.company.reputation = Math.max(0, s.company.reputation - 12);
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_van_theft",
    family: "logistico",
    title: "Furto furgone / merce",
    body: "Rubano un carico in transito. Scorte giù e franchigia assicurativa da pagare. A magazzino vuoto la ricostituzione urgente costa di più.",
    options: [
      {
        id: "ok",
        label: "Denuncia (−1 scorta, −5% cassa+)",
        apply: (s) => {
          applySupplyShock(s, {
            lostMonths: 1,
            basePct: 0.05,
            baseFloor: 650,
            label: "Furto merce",
          });
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_blackout",
    title: "Blackout prolungato",
    body: "Senza corrente per giorni: perdi lead sul tabellone e paghi generatori / straordinari.",
    options: [
      {
        id: "ok",
        label: "Reggi (−2 lead, −900 €)",
        apply: (s) => {
          let removed = 0;
          s.opportunities = s.opportunities.filter((o) => {
            if (removed >= 2 || o.kind !== "sale") return true;
            removed += 1;
            return false;
          });
          s.company.cash = round2(s.company.cash - 900);
          s.ytd.otherCosts = round2(s.ytd.otherCosts + 900);
          pushLog(s, "bad", `Blackout: −${removed} commesse dal tabellone, −900 €.`);
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_rent_spike",
    title: "Canone / condominio straordinario",
    body: "Il proprietario scarica lavori straordinari. Paghi subito un multiplo dell'affitto mensile.",
    options: [
      {
        id: "ok",
        label: "Paga (3× affitto)",
        apply: (s) => {
          const hit = round2(Math.max(600, s.company.monthlyRent * 3));
          s.company.cash = round2(s.company.cash - hit);
          s.ytd.otherCosts = round2(s.ytd.otherCosts + hit);
          pushLog(s, "bad", `Spese sede straordinarie: −${hit.toLocaleString("it-IT")} €.`);
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_supplier_bust",
    title: "Fornitore fallisce",
    body: "Il fornitore principale chiude. Scorte azzerate: dovrai riordinare da zero. Se eri già senza scorte, la riconversione urgente costa di più.",
    options: [
      {
        id: "ok",
        label: "Prendi atto (scorte → 0, −700 €+)",
        apply: (s) => {
          applySupplyShock(s, {
            lostMonths: 2,
            wipeSupply: true,
            baseFlat: 700,
            label: "Fornitore fallito",
          });
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_gdpr",
    title: "Sanzione privacy / Garante",
    body: "Segnalazione trattamento dati. Multa didattica e colpo alla compliance.",
    options: [
      {
        id: "ok",
        label: "Paga (−1 800 €, compliance −10)",
        apply: (s) => {
          s.company.cash = round2(s.company.cash - 1800);
          s.ytd.otherCosts = round2(s.ytd.otherCosts + 1800);
          s.compliance = Math.max(0, s.compliance - 10);
          pushLog(s, "bad", `Sanzione privacy: −1 800 €, compliance ${Math.round(s.compliance)}.`);
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_injury",
    title: "Infortunio sul lavoro",
    body: "Un dipendente si fa male. Costi immediati e pressione reputazionale.",
    options: [
      {
        id: "ok",
        label: "Copri (−2 200 €, rep −8)",
        apply: (s) => {
          s.company.cash = round2(s.company.cash - 2200);
          s.ytd.otherCosts = round2(s.ytd.otherCosts + 2200);
          s.company.reputation = Math.max(0, s.company.reputation - 8);
          pushLog(s, "bad", "Infortunio: −2 200 € e reputazione −8.");
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_fraud",
    title: "Ammanchi interni",
    body: "Scopri ammanchi di cassa / merce. Indagine e buco da coprire.",
    options: [
      {
        id: "ok",
        label: "Copri il buco (−9% cassa, rep −5)",
        apply: (s) => {
          const hit = shockCash(s, 0.09, 1000);
          s.company.reputation = Math.max(0, s.company.reputation - 5);
          pushLog(s, "bad", `Ammanchi: −${hit.toLocaleString("it-IT")} €, rep −5.`);
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_pa_delay",
    family: "burocratico",
    title: "Blocco pagamenti PA",
    body: "Un ente slitta tutti i tuoi crediti PA aperti di +2 mesi.",
    options: [
      {
        id: "ok",
        label: "Subisci lo slittamento",
        apply: (s) => {
          let n = 0;
          for (const inv of s.invoices) {
            if (inv.kind === "AR" && inv.clientType === "pa" && !inv.settled && !inv.defaulted) {
              inv.dueIdx += 2;
              n += 1;
            }
          }
          pushLog(
            s,
            "bad",
            n > 0
              ? `Blocco PA: ${n} credito/i slittano di 2 mesi.`
              : "Blocco PA: nessun credito PA aperto (per ora).",
          );
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_scandal",
    title: "Bufera reputazionale",
    body: "Recensioni / stampa locale ti bruciano. Perdi lead e reputazione.",
    options: [
      {
        id: "ok",
        label: "Danni collaterali (rep −18, −3 lead)",
        apply: (s) => {
          s.company.reputation = Math.max(0, s.company.reputation - 18);
          let removed = 0;
          s.opportunities = s.opportunities.filter((o) => {
            if (removed >= 3 || o.kind !== "sale") return true;
            removed += 1;
            return false;
          });
          pushLog(s, "bad", `Bufera rep: −18 rep, −${removed} lead dal tabellone.`);
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_bank_fee",
    title: "Banca: covenant / commissioni",
    body: "La banca rivede i rapporti. Paghi commissioni straordinarie sullo stock di cassa.",
    options: [
      {
        id: "ok",
        label: "Paga (−7% cassa)",
        apply: (s) => {
          const hit = shockCash(s, 0.07, 750);
          if (s.fido) s.fido.limit = round2(Math.max(0, s.fido.limit * 0.85));
          pushLog(s, "bad", `Banca: commissioni −${hit.toLocaleString("it-IT")} €.`);
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_license",
    family: "burocratico",
    title: "Sospensione autorizzazione",
    body: "Un ufficio comunale sospende un'autorizzazione finché non paghi e sanisci carte.",
    options: [
      {
        id: "ok",
        label: "Sana (−1 500 €, compliance −9)",
        apply: (s) => {
          s.company.cash = round2(s.company.cash - 1500);
          s.ytd.otherCosts = round2(s.ytd.otherCosts + 1500);
          s.compliance = Math.max(0, s.compliance - 9);
          if ((s.tempCapacityMonths ?? 0) > 0) s.tempCapacityMonths = 0;
          pushLog(s, "bad", `Autorizzazione: −1 500 €, compliance ${Math.round(s.compliance)}.`);
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_truck",
    family: "logistico",
    chains: CHAIN_DELAY,
    title: "Incidente mezzo aziendale",
    body: "Sinistro con fermo mezzo. Scorte in ritardo e riparazione salata. Senza scorte il fermo costa di più.",
    options: [
      {
        id: "ok",
        label: "Ripara (−2 scorte, −1 100 €+)",
        apply: (s) => {
          applySupplyShock(s, { lostMonths: 2, baseFlat: 1100, label: "Sinistro mezzo" });
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_heat",
    family: "ambientale",
    title: "Ondata di caldo / guasto clima",
    body: "Utenze e riparazioni HVAC fuori controllo per settimane.",
    options: [
      {
        id: "ok",
        label: "Paga utenze (−4% cassa)",
        apply: (s) => {
          const hit = shockCash(s, 0.04, 500);
          pushLog(s, "bad", `Clima/utenze: −${hit.toLocaleString("it-IT")} €.`);
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_rival_raid",
    title: "Il rivale ti svuota il mese",
    body: "La concorrenza locale firma tre tuoi prospect in blocco. Pressione alle stelle.",
    options: [
      {
        id: "ok",
        label: "Subisci (−3 sale, pressione +20)",
        apply: (s) => {
          let removed = 0;
          s.opportunities = s.opportunities.filter((o) => {
            if (removed >= 3 || o.kind !== "sale" || o.contractMonths) return true;
            removed += 1;
            return false;
          });
          if (s.rival) {
            let heat = Math.min(100, s.rival.heat + 20);
            if (s.rival.floor != null && !s.rival.contained) {
              heat = Math.max(s.rival.floor, heat);
            }
            s.rival = { ...s.rival, heat };
          }
          pushLog(
            s,
            "bad",
            `Raid rivale: −${removed} lead` +
              (s.rival ? `, pressione ${Math.round(s.rival.heat)}` : "") +
              ".",
          );
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_contract_kill",
    title: "Recesso su contratto attivo",
    body: "Un cliente chiude un contratto multi-mese. Perdi la FL bloccata e una penale simbolica.",
    options: [
      {
        id: "ok",
        label: "Chiudi il contratto (−800 €)",
        apply: (s) => {
          const list = s.activeContracts ?? [];
          if (list.length > 0) {
            const dropped = list[0]!;
            s.activeContracts = list.slice(1);
            s.company.cash = round2(s.company.cash - 800);
            s.ytd.otherCosts = round2(s.ytd.otherCosts + 800);
            pushLog(s, "bad", `Recesso: chiuso «${dropped.title}», −800 €, FL liberata.`);
          } else {
            const hit = shockCash(s, 0.05, 800);
            pushLog(s, "bad", `Recesso (nessun contratto): contenzioso −${hit.toLocaleString("it-IT")} €.`);
          }
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_landslide",
    family: "ambientale",
    chains: CHAIN_ROAD,
    title: "Frana in zona",
    body: "Una frana locale danneggia accessi e scorte. Nei mesi dopo è più facile trovare strade non percorribili.",
    options: [
      {
        id: "ok",
        label: "Metti in sicurezza (−1 scorta, −550 €+)",
        apply: (s) => {
          applySupplyShock(s, { lostMonths: 1, baseFlat: 550, label: "Frana" });
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_traffic",
    family: "logistico",
    chains: CHAIN_DELAY,
    title: "Traffico eccezionale",
    body: "Code e divieti fanno slittare i giri. Più probabilità di consegne in ritardo il mese prossimo.",
    options: [
      {
        id: "ok",
        label: "Straordinari di corsa (−3% cassa)",
        apply: (s) => {
          const hit = shockCash(s, 0.03, 280);
          pushLog(s, "bad", `Traffico: −${hit.toLocaleString("it-IT")} € di straordinari.`);
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_road_block",
    family: "logistico",
    title: "Strada non percorribile",
    body: "Un tratto è chiuso o interrotto. Le scorte arrivano a singhiozzo.",
    options: [
      {
        id: "ok",
        label: "Deviazione (−1 scorta, −400 €+)",
        apply: (s) => {
          applySupplyShock(s, { lostMonths: 1, baseFlat: 400, label: "Strada chiusa" });
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_delivery_delay",
    family: "logistico",
    title: "Consegna in ritardo",
    body: "Un carico di forniture slitta. Copertura magazzino più corta.",
    options: [
      {
        id: "ok",
        label: "Attendi (−1 scorta, −350 €+)",
        apply: (s) => {
          applySupplyShock(s, { lostMonths: 1, baseFlat: 350, label: "Consegna in ritardo" });
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_paperwork",
    family: "burocratico",
    title: "Errore nelle pratiche",
    body: "Una commessa ha carte incomplete. Correggi e paghi bolli; la compliance ne risente.",
    options: [
      {
        id: "ok",
        label: "Sanisci (−450 €, compliance −6)",
        apply: (s) => {
          s.company.cash = round2(s.company.cash - 450);
          s.ytd.otherCosts = round2(s.ytd.otherCosts + 450);
          s.compliance = Math.max(0, s.compliance - 6);
          pushLog(s, "bad", "Pratiche errate: −450 €, compliance −6.");
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_late_pay",
    family: "burocratico",
    chains: CHAIN_CARTELLA,
    title: "Pagamento in ritardo",
    body: "Un versamento slitta. Se hai F24 insoluti, i mesi di mora verso la cartella pesano di più.",
    options: [
      {
        id: "ok",
        label: "Interessi di mora (−220 €)",
        apply: (s) => {
          s.company.cash = round2(s.company.cash - 220);
          s.ytd.otherCosts = round2(s.ytd.otherCosts + 220);
          pushLog(s, "bad", "Pagamento in ritardo: −220 €.");
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_audit_hold",
    family: "burocratico",
    chains: CHAIN_CARTELLA,
    title: "Fermo per controlli",
    body: "Un ufficio blocca una pratica. Se sei già in ritardo fiscale, la cartella si avvicina.",
    options: [
      {
        id: "ok",
        label: "Rispondi al controllo (−500 €, compliance −8)",
        apply: (s) => {
          s.company.cash = round2(s.company.cash - 500);
          s.ytd.otherCosts = round2(s.ytd.otherCosts + 500);
          s.compliance = Math.max(0, s.compliance - 8);
          pushLog(s, "bad", "Fermo controlli: −500 €, compliance −8.");
        },
      },
    ],
  },
  {
    kind: "choice",
    id: "shock_supplier_late",
    family: "burocratico",
    title: "Fornitore in ritardo",
    body: "Il fornitore non consegna nei termini. Scorte più corte, niente cartella inventata.",
    options: [
      {
        id: "ok",
        label: "Sollecito (−1 scorta, −420 €+)",
        apply: (s) => {
          applySupplyShock(s, { lostMonths: 1, baseFlat: 420, label: "Fornitore in ritardo" });
        },
      },
    ],
  },
];

/** @internal test helper */
export const forcedShockCount = (): number => SHOCK_POOL.length;

const findChoiceDef = (id: string): ChoiceDef | undefined =>
  CHOICE_POOL.find((c) => c.id === id) ??
  SHOCK_POOL.find((c) => c.id === id) ??
  STAFF_CHOICE_STUBS.find((c) => c.id === id);

const toMeta = (d: ChoiceDef): WorldEventMeta | undefined => {
  if (!d.family) return undefined;
  return {
    id: d.id,
    family: d.family,
    spawn: d.spawn ?? "weighted",
    weight: d.weight ?? 1,
    chains: d.chains ?? [],
  };
};

const SYSTEM_EVENTS: WorldEventMeta[] = [
  {
    id: CARTELLA_EVENT_ID,
    family: "burocratico",
    spawn: "system",
    weight: 0,
    chains: [],
  },
];

export const worldMetaOf = (id: string): WorldEventMeta | undefined => {
  const def = findChoiceDef(id);
  if (def) return toMeta(def);
  return SYSTEM_EVENTS.find((e) => e.id === id);
};

/** 0 = lean, 1–3 = increasingly comfortable (more shocks). */
export const comfortLevel = (state: GameState): number => {
  const cash = state.company.cash;
  if (cash >= 28000 && state.monthsPlayed >= 6) return 3;
  if (cash >= 20000 && state.monthsPlayed >= 5) return 2;
  if (cash >= 14000 && state.monthsPlayed >= 4) return 1;
  return 0;
};

const tryQueueShock = (state: GameState, rand: () => number): boolean => {
  const comfort = comfortLevel(state);
  if (comfort <= 0) return false;
  if (state.pendingEvent) return false;
  const last = state.lastShockAt;
  const cooldown = comfort >= 2 ? 2 : 3;
  if (last != null && state.monthsPlayed - last < cooldown) return false;

  const chance = 0.16 + comfort * 0.12; // ~0.28 / 0.40 / 0.52
  if (rand() > chance) return false;

  state.chainBoosts ??= [];
  let def =
    pickWeighted(
      SHOCK_POOL,
      (d) =>
        effectiveWeight(
          d.weight ?? 1,
          state.chainBoosts ?? [],
          d.id,
          d.family,
          state.monthsPlayed,
        ),
      rand,
    ) ?? SHOCK_POOL[0]!;
  if (state.rival && state.rival.heat >= 70 && rand() < 0.35) {
    def = findChoiceDef("shock_rival_raid") ?? def;
  }
  const opt = def.options[0];
  if (!opt) return false;
  opt.apply(state);
  coverNegativeCashFromTreasury(state);
  const meta = toMeta(def);
  if (meta) applyChains(state.chainBoosts, meta, state.monthsPlayed);
  state.lastEventPopup = {
    title: def.title,
    body: def.body,
    family: def.family,
    tone: "bad",
  };
  state.lastShockAt = state.monthsPlayed;
  return true;
};

const toPending = (def: ChoiceDef): PendingEvent => ({
  id: def.id,
  title: def.title,
  body: def.body,
  family: def.family,
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
      "Settembre — ripresa: ticket in ripresa, clienti tornano. Buon mese per riempire la forza lavoro.",
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
        marketLayer: "local",
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
    state.lastEventPopup = {
      title: "Ispezione",
      body: `Sanzione soft −${fine.toLocaleString("it-IT")} €. La compliance è scesa.`,
      tone: "bad",
    };
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
      state.lastEventPopup = {
        title: "Ritardi clienti",
        body: `${n} fattura/e slittano di un mese.`,
        tone: "bad",
      };
      return;
    }
  }

  if (roll < 0.45) {
    const hit = round2(320 + rand() * 980);
    state.company.cash = round2(state.company.cash - hit);
    state.ytd.otherCosts = round2(state.ytd.otherCosts + hit);
    pushLog(state, "bad", `Costo imprevisto: −${hit.toLocaleString("it-IT")} €.`);
    state.lastEventPopup = {
      title: "Costo imprevisto",
      body: `Uscita extra −${hit.toLocaleString("it-IT")} €.`,
      tone: "bad",
    };
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
      marketLayer: isPa ? "municipal" : "local",
    });
    pushLog(
      state,
      "good",
      `Commessa urgente (${isPa ? "PA" : "privato"}) da ${bonus.toLocaleString("it-IT")} € + IVA.`,
    );
    state.lastEventPopup = {
      title: "Commessa urgente",
      body: `${isPa ? "PA" : "Privato"}: ${bonus.toLocaleString("it-IT")} € + IVA sul tabellone.`,
      tone: "good",
    };
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
  next.chainBoosts ??= [];
  next.tempCapacityMonths ??= 0;
  next.lastShockAt ??= null;
  next.lastEventPopup ??= null;
  next.supplyMonths ??= 0;

  const rand = rng(toMonthIndex(next.calendar) * 1337 + next.monthsPlayed * 17);
  applyCalendar(next, rand);

  // Don't stack a new choice if one is somehow still pending
  if (next.pendingEvent) return next;

  // Personale (scelta): priorità prima di shock/auto — RNG dedicato
  if (next.employees.length > 0) {
    const staffRand = rng(toMonthIndex(next.calendar) * 9001 + next.monthsPlayed * 13 + next.employees.length);
    if (tryQueueStaffEvent(next, staffRand)) {
      return next;
    }
  }

  // Comfort shocks first — applied immediately
  if (!next.quietMode && tryQueueShock(next, rand)) {
    return next;
  }

  const diff = DIFFICULTIES[next.difficulty ?? "normal"];
  const comfort = comfortLevel(next);
  // Richer firms get more world rolls (lower skip threshold)
  const skipAbove = Math.max(0.08, diff.eventSkipAbove * (comfort >= 2 ? 0.65 : comfort >= 1 ? 0.8 : 1));
  if (rand() > skipAbove) {
    return next;
  }

  // Rival challenge when pressure is Tesa+ (prefer over generic pool)
  if (next.rival && next.rival.heat >= 40) {
    const rivalChance = 0.25 + (next.rival.heat - 40) / 120;
    if (rand() < rivalChance) {
      const def = findChoiceDef("rival_push")!;
      const pending = toPending(def);
      const cost = rivalCampaignCost(next.company.cash);
      pending.title = `${next.rival.name} alza la voce`;
      pending.body = `${next.rival.name} ti sfida in zona (pressione ${Math.round(next.rival.heat)}). Campagna (~${cost.toLocaleString("it-IT")} €), guerra prezzi o ignori?`;
      pending.options = pending.options.map((o) =>
        o.id === "campaign"
          ? { ...o, label: `Campagna (−${cost.toLocaleString("it-IT")} €)` }
          : o,
      );
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

  // When comfortable, bias auto events toward pain (skip soft "urgent deal" more often)
  if (comfort >= 2 && rand() < 0.55) {
    const hit = round2(800 + rand() * 2200);
    next.company.cash = round2(next.company.cash - hit);
    next.ytd.otherCosts = round2(next.ytd.otherCosts + hit);
    pushLog(
      next,
      "bad",
      `Imprevisto operativo: −${hit.toLocaleString("it-IT")} € (cassa comoda = più esposti).`,
    );
    next.lastEventPopup = {
      title: "Imprevisto operativo",
      body: `Uscita extra −${hit.toLocaleString("it-IT")} € (cassa comoda = più esposti).`,
      tone: "bad",
    };
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
  next.chainBoosts ??= [];
  if (pending.staffTarget) {
    applyStaffAbsence(next, pending.staffTarget);
  }
  opt.apply(next);
  if (SHOCK_POOL.includes(def)) coverNegativeCashFromTreasury(next);
  const meta = toMeta(def);
  if (meta) applyChains(next.chainBoosts, meta, next.monthsPlayed);
  next.pendingEvent = null;
  return next;
};

/** @deprecated use runWorldEvents */
export const applyRandomEvent = runWorldEvents;

import { workforceRequiredForSale } from "../config/workforce";
import { computeContractTerms } from "../sim/contracts";
import type { GameState, Opportunity } from "../sim/types";

export type OfferKind = "single" | "tender" | "contract";

export const OFFER_KIND_BADGE: Record<OfferKind, string> = {
  single: "Singola",
  tender: "Appalto PA",
  contract: "Contratto",
};

export const OFFER_KIND_TITLE: Record<OfferKind, string> = {
  single: "Commessa singola: una fattura, incasso tra pochi mesi.",
  tender: "Appalto PA: una fattura grande, incasso lento.",
  contract: "Contratto: fatture ogni mese, FL bloccata fino a chiusura.",
};

export const classifyOffer = (op: Opportunity): OfferKind => {
  if (op.kind !== "sale") return "single";
  if (op.contractMonths && op.contractMonths >= 2) return "contract";
  if (op.marketLayer === "municipal" || op.marketLayer === "national") return "tender";
  return "single";
};

export const saleWorkforceRequired = (op: Opportunity): number =>
  op.workforceRequired ??
  workforceRequiredForSale(op.net, {
    marketLayer: op.marketLayer,
    termMonths: op.termMonths ?? op.contractMonths,
  });

const formatEuro = (amount: number): string =>
  `${amount.toLocaleString("it-IT")} €`;

export const formatOfferMoneyLine = (op: Opportunity, _game: GameState): string => {
  if (op.kind !== "sale") return `${formatEuro(op.net)} netti + IVA`;

  const parts = [`${formatEuro(op.net)} netti + IVA`, `${saleWorkforceRequired(op)} FL`];
  if (op.qualityRequired) {
    parts.push(`richiede scorte ≥${op.qualityRequired}`);
  }
  return parts.join(" · ");
};

export const formatOfferTimingLine = (op: Opportunity): string => {
  if (op.kind !== "sale") return "";

  const kind = classifyOffer(op);
  if (kind === "contract") {
    return `Durata ${op.contractMonths} mesi · fattura ogni mese`;
  }

  const term = op.termMonths ?? 1;
  const paNote =
    op.clientType === "pa" || kind === "tender" ? " (PA, pagamenti lunghi)" : "";
  return `Incasso tra ~${term} mesi${paNote}`;
};

export const previewContractTerms = (
  state: GameState,
  op: Opportunity,
): { netPerMonth: number; workforceLock: number; months: number } | null => {
  const terms = computeContractTerms(state, op);
  if (!terms) return null;
  return {
    netPerMonth: terms.netPerMonth,
    workforceLock: terms.workforceLock,
    months: terms.months,
  };
};

export const formatAcceptPreview = (op: Opportunity, game: GameState): string => {
  if (op.kind !== "sale") return "";

  const kind = classifyOffer(op);
  const fl = saleWorkforceRequired(op);

  if (kind === "contract") {
    const terms = previewContractTerms(game, op);
    if (!terms) return "";
    return (
      `Se accetti: ${terms.months} fatture da ~${formatEuro(terms.netPerMonth)}/mese · ` +
      `−${terms.workforceLock} FL bloccate fino a chiusura · max 2 contratti attivi`
    );
  }

  const term = op.termMonths ?? 1;
  if (kind === "tender") {
    return (
      `Se accetti: 1 fattura · incasso tra ~${term} mesi (PA, pagamenti lunghi) · −${fl} FL questo mese`
    );
  }

  return `Se accetti: 1 fattura · incasso tra ~${term} mesi · −${fl} FL questo mese`;
};

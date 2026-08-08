import { issueCustomerInvoice } from "./actions";
import {
  round2,
  toMonthIndex,
  type ActiveContract,
  type GameState,
  type Opportunity,
} from "./types";
import { repContractMult } from "./reputation";

export const contractSlotsUsed = (state: GameState): number =>
  (state.activeContracts ?? []).reduce((s, c) => s + c.slotCost, 0);

export const maybeMakeContract = (
  op: Opportunity,
  rand: () => number,
  reputation: number,
): Opportunity => {
  if (op.kind !== "sale") return op;
  const mult = repContractMult(reputation);
  if (op.clientType === "pa" && rand() < 0.35 * mult) {
    return {
      ...op,
      contractMonths: 3,
      title: op.title.replace(/^Commessa|^Appalto PA/, "Contratto"),
      termMonths: 1,
    };
  }
  if (rand() < 0.22 * mult) {
    return {
      ...op,
      contractMonths: 3,
      title: `Contratto · ${op.title.replace(/^Commessa · /, "")}`,
      termMonths: 1,
    };
  }
  return op;
};

export const acceptAsContract = (
  state: GameState,
  op: Opportunity,
): GameState | null => {
  if (!op.contractMonths || op.contractMonths < 2) return null;
  const active = state.activeContracts ?? [];
  if (active.length >= 2) return null;

  const next = structuredClone(state);
  const months = op.contractMonths;
  const netPerMonth = round2(op.net / months);
  const contract: ActiveContract = {
    id: next.nextId++,
    title: op.title,
    netPerMonth,
    monthsLeft: months,
    slotCost: 1,
    clientType: op.clientType ?? "private",
  };
  next.activeContracts = [...active, contract];
  next.opportunities = next.opportunities.filter((o) => o.id !== op.id);
  next.company.reputation = Math.min(100, next.company.reputation + 2);
  next.log.unshift({
    id: next.nextId++,
    monthIdx: toMonthIndex(next.calendar),
    tone: "good",
    text: `${op.title}: contratto ${months} mesi · ${netPerMonth.toLocaleString("it-IT")} €/mese · −1 slot.`,
  });
  next.log = next.log.slice(0, 12);
  return next;
};

/** Each month: issue invoice tranche, decrement; drop finished. */
export const tickContracts = (state: GameState): GameState => {
  const list = state.activeContracts ?? [];
  if (list.length === 0) return state;
  let next = structuredClone(state);
  const kept: ActiveContract[] = [];
  for (const c of next.activeContracts ?? []) {
    next = issueCustomerInvoice(next, c.netPerMonth, {
      clientType: c.clientType,
      termMonths: c.clientType === "pa" ? 3 : 1,
    });
    const left = c.monthsLeft - 1;
    if (left > 0) {
      kept.push({ ...c, monthsLeft: left });
    } else {
      next.log.unshift({
        id: next.nextId++,
        monthIdx: toMonthIndex(next.calendar),
        tone: "neutral",
        text: `Contratto chiuso: ${c.title}. Slot liberato.`,
      });
      next.log = next.log.slice(0, 12);
    }
  }
  next.activeContracts = kept;
  return next;
};

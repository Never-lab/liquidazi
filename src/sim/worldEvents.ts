export type EventFamily = "ambientale" | "burocratico" | "logistico" | "personale";

export const FAMILY_LABEL: Record<EventFamily, string> = {
  ambientale: "Ambiente",
  burocratico: "Burocrazia",
  logistico: "Logistica",
  personale: "Personale",
};

export type ChainLink = {
  target: string;
  months: 1 | 2;
  mul: number;
};

export type ChainBoost = {
  key: string;
  appliedAt: number;
  months: number;
  mul: number;
};

export type WorldEventMeta = {
  id: string;
  family: EventFamily;
  spawn: "weighted" | "system";
  weight: number;
  chains: ChainLink[];
};

export const chainKeyId = (id: string): string => `id:${id}`;
export const chainKeyFamily = (family: EventFamily): string => `family:${family}`;

export const isBoostActive = (boost: ChainBoost, monthsPlayed: number): boolean =>
  monthsPlayed > boost.appliedAt && monthsPlayed <= boost.appliedAt + boost.months;

export const effectiveWeight = (
  base: number,
  boosts: readonly ChainBoost[],
  id: string,
  family: EventFamily | undefined,
  monthsPlayed: number,
): number => {
  let w = base;
  for (const b of boosts) {
    if (!isBoostActive(b, monthsPlayed)) continue;
    if (b.key === chainKeyId(id) || (family && b.key === chainKeyFamily(family))) {
      w *= b.mul;
    }
  }
  return w;
};

export const applyChains = (
  boosts: ChainBoost[],
  meta: Pick<WorldEventMeta, "chains">,
  monthsPlayed: number,
): void => {
  for (const c of meta.chains) {
    boosts.push({
      key: c.target,
      appliedAt: monthsPlayed,
      months: c.months,
      mul: c.mul,
    });
  }
};

/** Cartella stays system-spawn; late-pay chains only speed mora if already overdue. */
export const moraIncrement = (boosts: readonly ChainBoost[], monthsPlayed: number): number =>
  boosts.some((b) => isBoostActive(b, monthsPlayed) && b.key === chainKeyId("fiscal_cartella"))
    ? 2
    : 1;

export const pickWeighted = <T>(
  items: readonly T[],
  weightOf: (item: T) => number,
  rand: () => number,
): T | undefined => {
  const weights = items.map(weightOf);
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return undefined;
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weights[i]!);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
};

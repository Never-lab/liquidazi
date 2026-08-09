import type { GameState } from "../sim/types";

export const FIRST_WIN_TOAST_AR = "Prima fattura emessa";
export const FIRST_WIN_TOAST_DONE =
  "Primo ciclo completo — hai chiuso fattura e F24";

export type FirstWinStepId = "accept" | "close" | "f24";

export type FirstWinStep = {
  id: FirstWinStepId;
  label: string;
  done: boolean;
};

export type FirstWinProgress = {
  acceptedSale: boolean;
  closedMonth: boolean;
  paidF24: boolean;
  complete: boolean;
  steps: FirstWinStep[];
};

const hasAr = (game: GameState): boolean =>
  game.invoices.some((i) => i.kind === "AR");

export const firstWinProgress = (game: GameState): FirstWinProgress => {
  const acceptedSale = hasAr(game);
  const closedMonth = game.monthsPlayed >= 1;
  const paidF24 =
    Boolean(game.career.firstWinCelebrated) || game.liabilities.some((l) => l.paid);
  const steps: FirstWinStep[] = [
    {
      id: "accept",
      label: "Accetta una vendita dal tabellone",
      done: acceptedSale,
    },
    { id: "close", label: "Chiudi il mese", done: closedMonth },
    { id: "f24", label: "Paga l'F24", done: paidF24 },
  ];
  return {
    acceptedSale,
    closedMonth,
    paidF24,
    complete: acceptedSale && closedMonth && paidF24,
    steps,
  };
};

export const isFirstArAccept = (before: GameState, after: GameState): boolean =>
  !hasAr(before) && hasAr(after);

export const shouldCelebrateFirstWin = (
  before: GameState,
  after: GameState,
  paid: number,
): boolean =>
  paid > 0 &&
  !before.career.firstWinCelebrated &&
  hasAr(after) &&
  after.monthsPlayed >= 1;

export const markFirstWinCelebrated = (game: GameState): GameState => ({
  ...game,
  career: { ...game.career, firstWinCelebrated: true },
});

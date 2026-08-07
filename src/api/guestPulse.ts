import { sendPulse } from "./client";
import { getPulseSessionId } from "./pulseSession";
import type { GameState } from "../sim/types";

/** Anonymous progress for balance monitoring (guests only). */
export const pulseGuestGame = (game: GameState, hasAuth: boolean) => {
  if (hasAuth) return;
  if (game.monthsPlayed < 1) return;
  const status =
    game.status === "won" ? "won" : game.status === "lost" ? "lost" : "running";
  void sendPulse({
    sessionId: getPulseSessionId(),
    monthsPlayed: game.monthsPlayed,
    difficulty: game.difficulty ?? "normal",
    sector: game.company.sector,
    status,
    cash: game.company.cash,
    peakCash: game.career.peakCash,
    peakDebt: game.career.peakDebt,
  }).catch(() => {
    /* best-effort */
  });
};

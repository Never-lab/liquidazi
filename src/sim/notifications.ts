import type { GameState, LogEntry } from "./types";

export const unreadLogEntries = (state: GameState): LogEntry[] => {
  const thru = state.logReadThruId ?? 0;
  return state.log.filter((e) => e.id > thru);
};

export const unreadLogCount = (state: GameState): number =>
  unreadLogEntries(state).length;

/** Mark all current log lines as read. Returns updated state. */
export const markLogRead = (state: GameState): GameState => {
  const next = structuredClone(state);
  next.logReadThruId ??= 0;
  const maxId = next.log.reduce((m, e) => Math.max(m, e.id), next.logReadThruId);
  next.logReadThruId = maxId;
  return next;
};

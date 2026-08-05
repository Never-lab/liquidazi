import { create } from "zustand";
import { persist } from "zustand/middleware";
import { advanceMonth } from "../sim/advanceMonth";
import {
  fireEmployee,
  hireEmployee,
  payF24,
  requestLoan,
  type LoanRequest,
} from "../sim/actions";
import { acceptOpportunity, declineOpportunity, seedNewGame } from "../sim/events";
import {
  createInitialGameState,
  type GameState,
  type NewGameOptions,
} from "../sim/types";

export type Screen = "menu" | "setup" | "game" | "tutorial" | "gameover" | "win";

interface GameStore {
  game: GameState;
  screen: Screen;
  setScreen: (screen: Screen) => void;
  newGame: (opts: NewGameOptions) => void;
  advanceMonth: () => void;
  acceptOpportunity: (id: number) => void;
  declineOpportunity: (id: number) => void;
  hireEmployee: (role: string) => void;
  fireEmployee: (id: number) => void;
  payF24: () => void;
  requestLoan: (req: LoanRequest) => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      game: createInitialGameState(),
      screen: "menu",
      setScreen: (screen) => set({ screen }),
      newGame: (opts) =>
        set({ game: seedNewGame(createInitialGameState(opts)), screen: "game" }),
      advanceMonth: () => {
        const game = advanceMonth(get().game);
        const screen =
          game.status === "lost" ? "gameover" : game.status === "won" ? "win" : get().screen;
        set({ game, screen });
      },
      acceptOpportunity: (id) => set({ game: acceptOpportunity(get().game, id) }),
      declineOpportunity: (id) => set({ game: declineOpportunity(get().game, id) }),
      hireEmployee: (role) => set({ game: hireEmployee(get().game, role) }),
      fireEmployee: (id) => set({ game: fireEmployee(get().game, id) }),
      payF24: () => set({ game: payF24(get().game) }),
      requestLoan: (req) => set({ game: requestLoan(get().game, req) }),
    }),
    {
      name: "liquidazi-save",
      version: 5,
      partialize: (state) => ({ game: state.game, screen: state.screen }),
      migrate: () => ({
        game: createInitialGameState(),
        screen: "menu" as Screen,
      }),
    },
  ),
);

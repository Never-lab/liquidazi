import { create } from "zustand";
import { persist } from "zustand/middleware";
import { advanceMonth } from "../sim/advanceMonth";
import {
  fireEmployee,
  hireEmployee,
  issueCustomerInvoice,
  payF24,
  recordSupplierCost,
  requestLoan,
  type LoanRequest,
} from "../sim/actions";
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
  issueCustomerInvoice: (net: number) => void;
  recordSupplierCost: (net: number) => void;
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
      newGame: (opts) => set({ game: createInitialGameState(opts), screen: "game" }),
      advanceMonth: () => {
        const game = advanceMonth(get().game);
        const screen =
          game.status === "lost" ? "gameover" : game.status === "won" ? "win" : get().screen;
        set({ game, screen });
      },
      issueCustomerInvoice: (net) => set({ game: issueCustomerInvoice(get().game, net) }),
      recordSupplierCost: (net) => set({ game: recordSupplierCost(get().game, net) }),
      hireEmployee: (role) => set({ game: hireEmployee(get().game, role) }),
      fireEmployee: (id) => set({ game: fireEmployee(get().game, id) }),
      payF24: () => set({ game: payF24(get().game) }),
      requestLoan: (req) => set({ game: requestLoan(get().game, req) }),
    }),
    {
      name: "liquidazi-save",
      version: 4,
      partialize: (state) => ({ game: state.game, screen: state.screen }),
      migrate: (persisted) => {
        const state = persisted as { game?: GameState; screen?: Screen };
        // City ids are now ISTAT codes — old slug saves reset location fields.
        return {
          game: createInitialGameState(),
          screen: state.screen === "game" ? "menu" : (state.screen ?? "menu"),
        };
      },
    },
  ),
);

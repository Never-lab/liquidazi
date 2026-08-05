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
import { createInitialGameState, type GameState } from "../sim/types";

export type Screen = "menu" | "game" | "tutorial" | "gameover" | "win";

interface GameStore {
  game: GameState;
  screen: Screen;
  setScreen: (screen: Screen) => void;
  newGame: () => void;
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
      newGame: () => set({ game: createInitialGameState(), screen: "game" }),
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
      version: 1,
      partialize: (state) => ({ game: state.game, screen: state.screen }),
    },
  ),
);

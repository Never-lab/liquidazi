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
      version: 3,
      partialize: (state) => ({ game: state.game, screen: state.screen }),
      migrate: (persisted) => {
        const state = persisted as { game?: GameState; screen?: Screen };
        const game = state.game ?? createInitialGameState();
        // Old saves without city — restart on a neutral Parma/servizi seed for location fields.
        if (!("city" in game.company) || !(game.company as { city?: string }).city) {
          const patched = createInitialGameState({ city: "parma", sector: "servizi" });
          return {
            game: {
              ...game,
              company: {
                ...patched.company,
                name: game.company.name,
                cash: game.company.cash,
              },
            },
            screen: state.screen === "setup" ? "setup" : (state.screen ?? "menu"),
          };
        }
        return { game, screen: state.screen ?? "menu" };
      },
    },
  ),
);

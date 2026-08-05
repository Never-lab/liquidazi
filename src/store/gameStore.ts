import { create } from "zustand";
import { advanceMonth } from "../sim/advanceMonth";
import {
  fireEmployee,
  hireEmployee,
  issueCustomerInvoice,
  recordSupplierCost,
} from "../sim/actions";
import { createInitialGameState, type GameState } from "../sim/types";

interface GameStore {
  game: GameState;
  advanceMonth: () => void;
  issueCustomerInvoice: (net: number) => void;
  recordSupplierCost: (net: number) => void;
  hireEmployee: (role: string) => void;
  fireEmployee: (id: number) => void;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  game: createInitialGameState(),
  advanceMonth: () => set({ game: advanceMonth(get().game) }),
  issueCustomerInvoice: (net) => set({ game: issueCustomerInvoice(get().game, net) }),
  recordSupplierCost: (net) => set({ game: recordSupplierCost(get().game, net) }),
  hireEmployee: (role) => set({ game: hireEmployee(get().game, role) }),
  fireEmployee: (id) => set({ game: fireEmployee(get().game, id) }),
}));

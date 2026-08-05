import { create } from "zustand";
import { advanceMonth } from "../sim/advanceMonth";
import { createInitialGameState, type GameState } from "../sim/types";

interface GameStore extends GameState {
  advanceMonth: () => void;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  ...createInitialGameState(),
  advanceMonth: () => {
    const { company, calendar } = get();
    const next = advanceMonth({ company, calendar });
    set(next);
  },
}));

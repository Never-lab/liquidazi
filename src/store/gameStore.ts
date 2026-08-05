import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthSession } from "../api/client";
import { login as apiLogin, register as apiRegister } from "../api/client";
import type { DifficultyId } from "../config/difficulty";
import { advanceMonth } from "../sim/advanceMonth";
import {
  acceptLoanOffer,
  declineLoanOffer,
  drawFido,
  fireEmployee,
  hireEmployee,
  payF24,
  requestFido,
  requestLoan,
  type LoanRequest,
} from "../sim/actions";
import { acceptOpportunity, declineOpportunity, seedNewGame } from "../sim/events";
import {
  createInitialGameState,
  type GameState,
  type NewGameOptions,
} from "../sim/types";
import { sfxBad, sfxGood, sfxMonthClose, sfxPay } from "../ui/sfx";
import { formatCash } from "../components/formatCash";

export type Screen =
  | "auth"
  | "menu"
  | "setup"
  | "game"
  | "tutorial"
  | "gameover"
  | "leaderboard"
  | "saves";

export type ToastTone = "good" | "bad" | "neutral";

export type SaveSlot = {
  label: string;
  game: GameState | null;
  updatedAt: string | null;
};

const emptySlots = (): SaveSlot[] => [
  { label: "Slot 1", game: null, updatedAt: null },
  { label: "Slot 2", game: null, updatedAt: null },
  { label: "Slot 3", game: null, updatedAt: null },
];

interface GameStore {
  game: GameState;
  screen: Screen;
  auth: AuthSession | null;
  coachOn: boolean;
  toast: { text: string; tone: ToastTone } | null;
  preferredDifficulty: DifficultyId;
  slots: SaveSlot[];
  activeSlot: number;
  setScreen: (screen: Screen) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  dismissCoach: () => void;
  enableCoach: () => void;
  setPreferredDifficulty: (d: DifficultyId) => void;
  flashToast: (text: string, tone?: ToastTone) => void;
  newGame: (opts: NewGameOptions) => void;
  advanceMonth: () => void;
  acceptOpportunity: (id: number) => void;
  declineOpportunity: (id: number) => void;
  hireEmployee: (role: string) => void;
  fireEmployee: (id: number) => void;
  payF24: () => void;
  requestLoan: (req: LoanRequest) => void;
  acceptLoanOffer: () => void;
  declineLoanOffer: () => void;
  requestFido: (limit: number) => void;
  drawFido: (amount: number) => void;
  markRunSubmitted: () => void;
  selectSlot: (index: number) => void;
  renameSlot: (index: number, label: string) => void;
  clearSlot: (index: number) => void;
  persistActiveSlot: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

const syncSlot = (
  slots: SaveSlot[],
  activeSlot: number,
  game: GameState,
): SaveSlot[] => {
  const next = slots.map((s) => ({ ...s }));
  const cur = next[activeSlot];
  if (!cur) return slots;
  next[activeSlot] = {
    ...cur,
    game: structuredClone(game),
    updatedAt: new Date().toISOString(),
  };
  return next;
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      game: createInitialGameState(),
      screen: "auth",
      auth: null,
      coachOn: true,
      toast: null,
      preferredDifficulty: "normal",
      slots: emptySlots(),
      activeSlot: 0,
      setScreen: (screen) => set({ screen }),
      login: async (username, password) => {
        const session = await apiLogin(username, password);
        set({ auth: session, screen: "menu" });
      },
      register: async (username, password) => {
        const session = await apiRegister(username, password);
        set({ auth: session, screen: "menu" });
      },
      logout: () => set({ auth: null, screen: "auth" }),
      dismissCoach: () => set({ coachOn: false }),
      enableCoach: () => set({ coachOn: true }),
      setPreferredDifficulty: (d) => set({ preferredDifficulty: d }),
      flashToast: (text, tone = "neutral") => {
        if (toastTimer) clearTimeout(toastTimer);
        set({ toast: { text, tone } });
        toastTimer = setTimeout(() => set({ toast: null }), 2400);
      },
      persistActiveSlot: () => {
        const { slots, activeSlot, game } = get();
        set({ slots: syncSlot(slots, activeSlot, game) });
      },
      newGame: (opts) => {
        const game = seedNewGame(
          createInitialGameState({
            ...opts,
            difficulty: opts.difficulty ?? get().preferredDifficulty,
          }),
        );
        const slots = syncSlot(get().slots, get().activeSlot, game);
        set({ game, slots, screen: "game", coachOn: true });
        get().flashToast("Nuova azienda aperta", "good");
        sfxGood();
      },
      advanceMonth: () => {
        const before = get().game.company.cash;
        const game = advanceMonth(get().game);
        const screen = game.status === "lost" ? "gameover" : get().screen;
        const slots = syncSlot(get().slots, get().activeSlot, game);
        set({ game, screen, slots });
        if (game.status === "lost") {
          get().flashToast("Fallimento: 12 mesi in rosso", "bad");
          sfxBad();
        } else {
          const delta = game.company.cash - before;
          const sign = delta >= 0 ? "+" : "";
          get().flashToast(
            `Mese chiuso · cassa ${sign}${formatCash(delta)}`,
            delta < 0 ? "bad" : "neutral",
          );
          sfxMonthClose();
        }
      },
      acceptOpportunity: (id) => {
        const game = acceptOpportunity(get().game, id);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        sfxGood();
      },
      declineOpportunity: (id) => {
        const game = declineOpportunity(get().game, id);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
      },
      hireEmployee: (role) => {
        const game = hireEmployee(get().game, role);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        get().flashToast(`Assunto: ${role}`, "good");
      },
      fireEmployee: (id) => {
        const game = fireEmployee(get().game, id);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        get().flashToast("Dipendente licenziato · TFR liquidato", "bad");
        sfxBad();
      },
      payF24: () => {
        const before = get().game.company.cash;
        const game = payF24(get().game);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        const paid = before - game.company.cash;
        get().flashToast(
          paid > 0 ? `F24 versato: −${formatCash(paid)}` : "Niente da versare",
          paid > 0 ? "good" : "neutral",
        );
        if (paid > 0) sfxPay();
      },
      requestLoan: (req) => {
        const game = requestLoan(get().game, req);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        get().flashToast("Mutuo erogato", "good");
        sfxGood();
      },
      acceptLoanOffer: () => {
        const game = acceptLoanOffer(get().game);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        get().flashToast("Prestito di salvataggio accettato", "good");
        sfxGood();
      },
      declineLoanOffer: () => {
        const game = declineLoanOffer(get().game);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        get().flashToast("Prestito rifiutato", "bad");
        sfxBad();
      },
      requestFido: (limit) => {
        const game = requestFido(get().game, limit);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
      },
      drawFido: (amount) => {
        const game = drawFido(get().game, amount);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
      },
      markRunSubmitted: () => {
        const game = structuredClone(get().game);
        game.career.submitted = true;
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
      },
      selectSlot: (index) => {
        const slots = get().slots;
        const slot = slots[index];
        if (!slot) return;
        const game = slot.game ? structuredClone(slot.game) : createInitialGameState();
        set({
          activeSlot: index,
          game,
          screen: slot.game?.status === "running" && (slot.game.monthsPlayed ?? 0) > 0
            ? "menu"
            : "menu",
        });
        get().flashToast(`Slot attivo: ${slot.label}`, "neutral");
      },
      renameSlot: (index, label) => {
        const slots = get().slots.map((s, i) =>
          i === index ? { ...s, label: label.trim() || s.label } : s,
        );
        set({ slots });
      },
      clearSlot: (index) => {
        const slots = get().slots.map((s, i) =>
          i === index ? { ...s, game: null, updatedAt: null } : s,
        );
        const activeSlot = get().activeSlot;
        if (index === activeSlot) {
          set({
            slots,
            game: createInitialGameState(),
          });
        } else {
          set({ slots });
        }
      },
    }),
    {
      name: "liquidazi-save",
      version: 9,
      partialize: (state) => ({
        game: state.game,
        screen: state.auth ? (state.screen === "auth" ? "menu" : state.screen) : "auth",
        auth: state.auth,
        coachOn: state.coachOn,
        preferredDifficulty: state.preferredDifficulty,
        slots: state.slots,
        activeSlot: state.activeSlot,
      }),
      migrate: () => ({
        game: createInitialGameState(),
        screen: "auth" as Screen,
        auth: null,
        coachOn: true,
        preferredDifficulty: "normal" as DifficultyId,
        slots: emptySlots(),
        activeSlot: 0,
      }),
    },
  ),
);

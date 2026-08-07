import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ApiError,
  fetchMe,
  fetchSaves,
  login as apiLogin,
  putSaves,
  register as apiRegister,
  type AuthSession,
} from "../api/client";
import {
  createCloudSaveQueue,
  type CloudSaveStatus,
} from "../api/cloudSaveQueue";
import type { DifficultyId } from "../config/difficulty";
import { advanceMonth } from "../sim/advanceMonth";
import {
  acceptLoanOffer,
  buyUpgrade,
  declineLoanOffer,
  depositTreasury,
  drawFido,
  fireEmployee,
  hireEmployee,
  investGrowth,
  payF24,
  requestFido,
  requestLoan,
  withdrawTreasury,
  type LoanRequest,
} from "../sim/actions";
import { buyAcquisition, refreshAcquisitionBoard } from "../sim/acquisitions";
import { resolveEventOption } from "../sim/eventCatalog";
import { acceptOpportunity, declineOpportunity, seedNewGame, orderEmergencySupply } from "../sim/events";
import { formatCloseToast, unlockMilestones } from "../sim/milestones";
import {
  createInitialGameState,
  type GameState,
  type NewGameOptions,
} from "../sim/types";
import type { UpgradeId } from "../config/upgrades";
import { sfxBad, sfxGood, sfxMonthClose, sfxPay } from "../ui/sfx";
import { formatCash } from "../components/formatCash";
import { markIntroSeen, screenAfterAuth } from "../ui/introGate";

export type Screen =
  | "auth"
  | "intro"
  | "menu"
  | "setup"
  | "game"
  | "tutorial"
  | "gameover"
  | "leaderboard"
  | "saves"
  | "feedback"
  | "admin";

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
  cloudSaveStatus: CloudSaveStatus;
  setScreen: (screen: Screen) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  continueAsGuest: () => void;
  skipIntro: () => void;
  finishIntro: () => void;
  logout: () => void;
  dismissCoach: () => void;
  enableCoach: () => void;
  setPreferredDifficulty: (d: DifficultyId) => void;
  flashToast: (text: string, tone?: ToastTone) => void;
  newGame: (opts: NewGameOptions) => void;
  advanceMonth: () => void;
  continueAfterWin: () => void;
  acceptOpportunity: (id: number) => void;
  declineOpportunity: (id: number) => void;
  orderEmergencySupply: () => void;
  hireEmployee: (role: string) => void;
  fireEmployee: (id: number) => void;
  payF24: () => void;
  requestLoan: (req: LoanRequest) => void;
  acceptLoanOffer: () => void;
  declineLoanOffer: () => void;
  requestFido: (limit: number) => void;
  drawFido: (amount: number) => void;
  buyUpgrade: (id: UpgradeId) => void;
  resolveEvent: (optionId: string) => void;
  depositTreasury: (amount: number) => void;
  withdrawTreasury: (amount: number) => void;
  investGrowth: (amount: number) => void;
  buyAcquisition: (id: number) => void;
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
      cloudSaveStatus: "hidden",
      setScreen: (screen) => set({ screen }),
      login: async (username, password) => {
        const session = await apiLogin(username, password);
        const saves = await fetchSaves(session.token);
        const slots = saves.slots as SaveSlot[];
        const active = slots[saves.activeSlot] ?? slots[0];
        const game = active?.game
          ? structuredClone(active.game)
          : createInitialGameState();
        set({
          auth: session,
          slots,
          activeSlot: saves.activeSlot ?? 0,
          preferredDifficulty: saves.preferredDifficulty ?? get().preferredDifficulty,
          coachOn: saves.coachOn ?? get().coachOn,
          game,
          screen: screenAfterAuth(),
        });
      },
      register: async (username, password) => {
        const session = await apiRegister(username, password);
        const localSaves = {
          slots: get().slots,
          activeSlot: get().activeSlot,
          preferredDifficulty: get().preferredDifficulty,
          coachOn: get().coachOn,
        };
        const saves = await putSaves(session.token, localSaves);
        const slots = saves.slots as SaveSlot[];
        const active = slots[saves.activeSlot] ?? slots[0];
        set({
          auth: session,
          slots,
          activeSlot: saves.activeSlot ?? 0,
          preferredDifficulty: saves.preferredDifficulty ?? "normal",
          coachOn: saves.coachOn ?? true,
          game: active?.game ? structuredClone(active.game) : createInitialGameState(),
          screen: screenAfterAuth(),
        });
      },
      continueAsGuest: () => set({ auth: null, screen: screenAfterAuth() }),
      skipIntro: () => {
        markIntroSeen();
        set({ screen: "menu" });
      },
      finishIntro: () => {
        markIntroSeen();
        set({ screen: "setup" });
      },
      logout: () => {
        cloudQueue.clear();
        set({
          auth: null,
          screen: "auth",
          slots: emptySlots(),
          activeSlot: 0,
          game: createInitialGameState(),
        });
      },
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
        let game = seedNewGame(
          createInitialGameState({
            ...opts,
            difficulty: opts.difficulty ?? get().preferredDifficulty,
          }),
        );
        game = refreshAcquisitionBoard(game);
        const slots = syncSlot(get().slots, get().activeSlot, game);
        set({ game, slots, screen: "game", coachOn: true });
        get().flashToast("Nuova azienda aperta", "good");
        sfxGood();
      },
      advanceMonth: () => {
        if (get().game.pendingEvent) {
          get().flashToast("Risolvi prima l'evento in corso", "bad");
          sfxBad();
          return;
        }
        const game = advanceMonth(get().game);
        let screen = get().screen;
        if (game.status === "lost" || game.status === "won") screen = "gameover";
        const slots = syncSlot(get().slots, get().activeSlot, game);
        set({ game, screen, slots });
        if (game.status === "lost") {
          get().flashToast("Fallimento: 12 mesi in rosso", "bad");
          sfxBad();
        } else if (game.status === "won") {
          get().flashToast("Traguardo: 24 mesi di attività", "good");
          sfxGood();
        } else if (game.pendingEvent) {
          get().flashToast(`Decisione: ${game.pendingEvent.title}`, "neutral");
          sfxMonthClose();
        } else if (game.lastCloseSummary) {
          const d = game.lastCloseSummary.delta;
          get().flashToast(
            formatCloseToast(game.lastCloseSummary),
            d < 0 ? "bad" : d > 0 ? "good" : "neutral",
          );
          sfxMonthClose();
        } else {
          get().flashToast("Mese chiuso", "neutral");
          sfxMonthClose();
        }
      },
      continueAfterWin: () => {
        const game = structuredClone(get().game);
        if (game.status !== "won") return;
        game.status = "running";
        const slots = syncSlot(get().slots, get().activeSlot, game);
        set({ game, slots, screen: "game" });
        get().flashToast("Continui oltre i 24 mesi", "neutral");
      },
      acceptOpportunity: (id) => {
        const before = get().game;
        const game = acceptOpportunity(before, id);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        const tookDeal = game.opportunities.every((o) => o.id !== id);
        if (tookDeal) {
          sfxGood();
        } else {
          const msg =
            game.log[0] && game.log[0].id !== before.log[0]?.id
              ? game.log[0].text
              : "Commessa non accettata";
          get().flashToast(msg, "bad");
          sfxBad();
        }
      },
      declineOpportunity: (id) => {
        const game = declineOpportunity(get().game, id);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
      },
      orderEmergencySupply: () => {
        const before = get().game.supplyMonths ?? 0;
        const game = orderEmergencySupply(get().game);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        if ((game.supplyMonths ?? 0) > before) {
          get().flashToast("Fornitura d'emergenza ordinata (+2 mesi scorte)", "good");
          sfxGood();
        }
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
      buyUpgrade: (id) => {
        const game = buyUpgrade(get().game, id);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        if ((game.upgrades ?? []).includes(id)) {
          get().flashToast("Upgrade acquistato", "good");
          sfxGood();
        } else {
          get().flashToast("Upgrade non disponibile", "bad");
        }
      },
      resolveEvent: (optionId) => {
        if (!get().game.pendingEvent) return;
        const game = resolveEventOption(get().game, optionId);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        get().flashToast("Decisione presa", "neutral");
        sfxGood();
      },
      depositTreasury: (amount) => {
        const before = get().game.treasury ?? 0;
        const game = depositTreasury(get().game, amount);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        if ((game.treasury ?? 0) > before) {
          get().flashToast("Depositato in tesoreria", "good");
          sfxGood();
        } else {
          get().flashToast("Deposito non riuscito", "bad");
        }
      },
      withdrawTreasury: (amount) => {
        const before = get().game.treasury ?? 0;
        const game = withdrawTreasury(get().game, amount);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        if ((game.treasury ?? 0) < before) {
          get().flashToast("Prelievo tesoreria", "neutral");
        }
      },
      investGrowth: (amount) => {
        const before = get().game.growthInvested ?? 0;
        const game = investGrowth(get().game, amount);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        if ((game.growthInvested ?? 0) > before) {
          get().flashToast("Reinvestimento crescita", "good");
          sfxGood();
        } else {
          get().flashToast("Investimento non riuscito", "bad");
        }
      },
      buyAcquisition: (id) => {
        const before = (get().game.subsidiaries ?? []).length;
        let game = buyAcquisition(get().game, id);
        if ((game.subsidiaries ?? []).length > before) {
          const mil = unlockMilestones(game);
          game = mil.state;
          get().flashToast("Azienda acquisita", "good");
          sfxGood();
        } else {
          get().flashToast("Acquisizione non riuscita", "bad");
          sfxBad();
        }
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
          screen: "menu",
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
      version: 10,
      partialize: (state) => ({
        game: state.game,
        screen: state.screen === "auth" ? "auth" : state.screen,
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
      onRehydrateStorage: () => (state) => {
        if (!state?.auth) return;
        const { token } = state.auth;
        void fetchMe(token)
          .then((me) => {
            const current = useGameStore.getState();
            if (current.auth?.token !== token) return;
            useGameStore.setState({
              auth: {
                ...current.auth,
                username: me.username,
                admin: me.admin,
              },
            });
          })
          .catch((error: unknown) => {
            const current = useGameStore.getState();
            if (current.auth?.token !== token) return;
            if (error instanceof ApiError && error.status === 401) {
              current.logout();
            }
          });
        void fetchSaves(token)
          .then((saves) => {
            const current = useGameStore.getState();
            if (current.auth?.token !== token) return;
            const slots = saves.slots as SaveSlot[];
            const activeSlot = saves.activeSlot ?? 0;
            const active = slots[activeSlot] ?? slots[0];
            useGameStore.setState({
              slots,
              activeSlot,
              preferredDifficulty: saves.preferredDifficulty ?? current.preferredDifficulty,
              coachOn: saves.coachOn ?? current.coachOn,
              game: active?.game ? structuredClone(active.game) : createInitialGameState(),
            });
          })
          .catch((error: unknown) => {
            const current = useGameStore.getState();
            if (current.auth?.token !== token) return;
            if (error instanceof ApiError && error.status === 401) {
              current.logout();
              return;
            }
            current.flashToast("Impossibile aggiornare i salvataggi cloud", "bad");
          });
      },
    },
  ),
);

const cloudQueue = createCloudSaveQueue({
  put: putSaves,
  getToken: () => useGameStore.getState().auth?.token ?? null,
  getPayload: () => {
    const state = useGameStore.getState();
    return {
      slots: state.slots,
      activeSlot: state.activeSlot,
      preferredDifficulty: state.preferredDifficulty,
      coachOn: state.coachOn,
    };
  },
  onStatus: (cloudSaveStatus) => useGameStore.setState({ cloudSaveStatus }),
  onError: () =>
    useGameStore.getState().flashToast("Salvataggio cloud non riuscito", "bad"),
});

useGameStore.subscribe((state, prev) => {
  if (!state.auth) return;
  if (
    state.slots === prev.slots &&
    state.activeSlot === prev.activeSlot &&
    state.preferredDifficulty === prev.preferredDifficulty &&
    state.coachOn === prev.coachOn
  ) {
    return;
  }
  cloudQueue.schedule();
});

if (typeof document !== "undefined") {
  const flush = () => {
    void cloudQueue.flush();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}

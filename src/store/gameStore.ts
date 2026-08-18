import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ApiError,
  bindSessionToken,
  fetchMe,
  fetchSaves,
  login as apiLogin,
  postAchievements,
  putSaves,
  register as apiRegister,
  submitRun,
  type AuthSession,
} from "../api/client";
import {
  createCloudSaveQueue,
  type CloudSaveStatus,
} from "../api/cloudSaveQueue";
import type { DifficultyId } from "../config/difficulty";
import { advanceMonth } from "../sim/advanceMonth";
import { markLogRead } from "../sim/notifications";
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
import {
  acceptSaleOffer,
  buyAcquisition,
  investSubsidiaryCapex,
  listSubsidiaryForSale,
  refreshAcquisitionBoard,
  rejectSaleOffer,
} from "../sim/acquisitions";
import { migrateHoldingState } from "../sim/migrateHolding";
import { CARTELLA_EVENT_ID, f24BlockedByCollection, resolveCartellaChoice } from "../sim/collection";
import { resolveEventOption } from "../sim/eventCatalog";
import { acceptOpportunity, declineOpportunity, demandPopupForAdvance, seedNewGame, orderEmergencySupply } from "../sim/events";
import { migrateGameState } from "../sim/migrateGameState";
import { createTesterGameState } from "../sim/testerSave";
import { formatCloseToast, unseenUnlocks, unlockMilestones } from "../sim/milestones";
import type { MilestoneId } from "../sim/types";
import {
  createInitialGameState,
  type DemandRegime,
  type EventPopup,
  type GameState,
  type NewGameOptions,
} from "../sim/types";
import type { UpgradeId } from "../config/upgrades";
import { getProjectDef, type ProjectId } from "../config/projects";
import { upgradeLevel } from "../config/upgrades";
import { migrateUpgradeState } from "../sim/migrateUpgrades";
import { acceptProject, skipProjectOffer } from "../sim/projects";
import { sfxBad, sfxGood, sfxMonthClose, sfxPay } from "../ui/sfx";
import { formatCash } from "../components/formatCash";
import { coerceScreenIfSignedOut, SIGNED_OUT_DOOR } from "../ui/entryScreen";
import { markIntroSeen, screenAfterAuth } from "../ui/introGate";
import {
  SESSION_EXPIRED_TOAST,
  clearActivity,
  isIdleExpired,
  recordActivity,
} from "../ui/sessionIdle";
import {
  FIRST_WIN_TOAST_AR,
  FIRST_WIN_TOAST_DONE,
  isFirstArAccept,
  markFirstWinCelebrated,
  shouldCelebrateFirstWin,
} from "../ui/firstWin";

export type Screen =
  | "landing"
  | "auth"
  | "intro"
  | "menu"
  | "setup"
  | "game"
  | "tutorial"
  | "guide"
  | "objectives"
  | "trophies"
  | "gameover"
  | "leaderboard"
  | "saves"
  | "feedback";

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
  /** One-shot secca/boom popup after month close; null when hidden. */
  demandPopup: DemandRegime | null;
  /** One-shot overlay for auto-applied world shocks (same shell as secca/boom). */
  eventPopup: EventPopup | null;
  /** FIFO achievement celebration popups. */
  achievementQueue: MilestoneId[];
  /** Account trophies (logged-in only). */
  accountAchievements: MilestoneId[];
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
  dismissDemandPopup: () => void;
  dismissEventPopup: () => void;
  dismissAchievementPopup: () => void;
  noteMilestoneUnlocks: (unlocked: MilestoneId[]) => void;
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
  investSubsidiaryCapex: (id: number) => void;
  listSubsidiaryForSale: (id: number) => void;
  acceptSaleOffer: (id: number) => void;
  rejectSaleOffer: (id: number) => void;
  acceptProject: (id: ProjectId) => void;
  skipProjectOffer: () => void;
  markRunSubmitted: () => void;
  markInboxRead: () => void;
  /** Admin only: overwrite slot 1 with mid-game tester save and enter game. */
  installTesterSave: () => void;
  submitRunProgressIfNeeded: () => Promise<void>;
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
      screen: SIGNED_OUT_DOOR,
      auth: null,
      coachOn: true,
      toast: null,
      demandPopup: null,
      eventPopup: null,
      achievementQueue: [],
      accountAchievements: [],
      preferredDifficulty: "normal",
      slots: emptySlots(),
      activeSlot: 0,
      cloudSaveStatus: "hidden",
      setScreen: (screen) => set({ screen }),
      login: async (username, password) => {
        const session = await apiLogin(username, password);
        recordActivity();
        const saves = await fetchSaves(session.token);
        const slots = saves.slots as SaveSlot[];
        let activeSlot = saves.activeSlot ?? 0;
        let active = slots[activeSlot] ?? slots[0];
        const resumable = slots.findIndex(
          (s) => s.game && s.game.monthsPlayed > 0 && s.game.status === "running",
        );
        if (
          resumable >= 0 &&
          !(active?.game && active.game.monthsPlayed > 0 && active.game.status === "running")
        ) {
          activeSlot = resumable;
          active = slots[resumable];
        }
        const game = active?.game
          ? migrateGameState(structuredClone(active.game))
          : createInitialGameState();
        let accountAchievements: MilestoneId[] = [];
        try {
          const me = await fetchMe(session.token);
          accountAchievements = (me.achievements ?? []) as MilestoneId[];
          session.admin = me.admin;
        } catch {
          /* ignore */
        }
        set({
          auth: session,
          slots,
          activeSlot,
          preferredDifficulty: saves.preferredDifficulty ?? get().preferredDifficulty,
          coachOn: saves.coachOn ?? get().coachOn,
          game,
          accountAchievements,
          achievementQueue: [],
          screen: screenAfterAuth(),
        });
      },
      register: async (username, password) => {
        const session = await apiRegister(username, password);
        recordActivity();
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
          game: active?.game
            ? migrateGameState(structuredClone(active.game))
            : createInitialGameState(),
          accountAchievements: [],
          screen: screenAfterAuth(),
        });
      },
      continueAsGuest: () =>
        set({
          auth: null,
          accountAchievements: [],
          achievementQueue: [],
          screen: screenAfterAuth(),
        }),
      skipIntro: () => {
        markIntroSeen();
        set({ screen: "menu" });
      },
      finishIntro: () => {
        markIntroSeen();
        set({ screen: "setup" });
      },
      logout: () => {
        clearActivity();
        void (async () => {
          try {
            await cloudQueue.flush({ force: true });
          } catch {
            /* still sign out */
          }
          cloudQueue.clear();
          set({
            auth: null,
            accountAchievements: [],
            achievementQueue: [],
            screen: SIGNED_OUT_DOOR,
            slots: emptySlots(),
            activeSlot: 0,
            game: createInitialGameState(),
          });
        })();
      },
      dismissCoach: () => set({ coachOn: false }),
      enableCoach: () => set({ coachOn: true }),
      setPreferredDifficulty: (d) => set({ preferredDifficulty: d }),
      flashToast: (text, tone = "neutral") => {
        if (toastTimer) clearTimeout(toastTimer);
        set({ toast: { text, tone } });
        toastTimer = setTimeout(() => set({ toast: null }), 2400);
      },
      dismissDemandPopup: () => set({ demandPopup: null }),
      dismissEventPopup: () => set({ eventPopup: null }),
      dismissAchievementPopup: () =>
        set((s) => ({ achievementQueue: s.achievementQueue.slice(1) })),
      noteMilestoneUnlocks: (unlocked) => {
        if (unlocked.length === 0) return;
        set((s) => {
          const fresh = unseenUnlocks(unlocked, s.accountAchievements);
          if (fresh.length === 0) return s;
          return { achievementQueue: [...s.achievementQueue, ...fresh] };
        });
        const token = get().auth?.token;
        if (!token) return;
        void postAchievements(token, unlocked)
          .then((res) => {
            const current = get();
            if (!current.auth) return;
            set({
              accountAchievements: res.achievements as MilestoneId[],
            });
          })
          .catch(() => {
            /* offline / transient — run popup still shown */
          });
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
        set({ game, slots, screen: "game", coachOn: true, achievementQueue: [], eventPopup: null, demandPopup: null });
        get().flashToast("Nuova azienda aperta", "good");
        sfxGood();
      },
      advanceMonth: () => {
        if (get().game.pendingEvent) {
          get().flashToast("Risolvi prima l'evento in corso", "bad");
          sfxBad();
          return;
        }
        if (get().game.projectOffer) {
          get().flashToast("Scegli o salta il piano investimenti", "bad");
          sfxBad();
          return;
        }
        const before = get().game;
        const game = advanceMonth(before);
        const eventPopup = game.pendingEvent ? null : game.lastEventPopup;
        if (game.lastEventPopup) game.lastEventPopup = null;
        let screen = get().screen;
        if (game.status === "lost" || game.status === "won") screen = "gameover";
        const slots = syncSlot(get().slots, get().activeSlot, game);
        const regime = game.demandRegime;
        const demandPopup = demandPopupForAdvance(
          game.status,
          before.demandRegime,
          regime,
        );
        set({ game, screen, slots, demandPopup, eventPopup });
        const newly = (game.milestones ?? []).filter(
          (id) => !(before.milestones ?? []).includes(id),
        );
        get().noteMilestoneUnlocks(newly);
        if (game.status === "lost") {
          get().flashToast(
            game.loseReason === "fiscal"
              ? "Fallimento: insolvenza fiscale"
              : "Fallimento: 12 mesi in rosso",
            "bad",
          );
          sfxBad();
        } else if (game.status === "won") {
          get().flashToast("Traguardo: 24 mesi di attività", "good");
          sfxGood();
        } else if (eventPopup) {
          sfxMonthClose();
        } else if (
          game.lastShockAt != null &&
          game.lastShockAt === game.monthsPlayed &&
          game.log[0]
        ) {
          const shockLog =
            game.log[0].text.startsWith("Fondo emergenza:") && game.log[1]
              ? game.log[1]
              : game.log[0];
          get().flashToast(shockLog.text, shockLog.tone === "good" ? "good" : "bad");
          sfxMonthClose();
        } else if (game.pendingEvent) {
          get().flashToast(`Decisione: ${game.pendingEvent.title}`, "neutral");
          sfxMonthClose();
        } else if (before.activeProject && !game.activeProject) {
          get().flashToast("Progetto completato", "good");
          sfxGood();
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
        // Long runs past soft-win: keep leaderboard/dashboard updated.
        void get().submitRunProgressIfNeeded();
      },
      continueAfterWin: () => {
        const game = structuredClone(get().game);
        if (game.status !== "won") return;
        game.status = "running";
        const slots = syncSlot(get().slots, get().activeSlot, game);
        set({ game, slots, screen: "game" });
        get().flashToast("Continui oltre i 24 mesi", "neutral");
      },
      submitRunProgressIfNeeded: async () => {
        const { auth, game, activeSlot } = get();
        if (!auth?.token || game.monthsPlayed < 1) return;
        const year2 = game.career.year2Reached === true;
        const ended = game.status === "lost" || game.status === "won";
        if (!ended && !(game.status === "running" && year2)) return;
        const submittedMonths =
          game.career.submittedMonths ?? (game.career.submitted ? 24 : 0);
        if (game.monthsPlayed <= submittedMonths) return;
        try {
          await submitRun(auth.token, {
            companyName: game.company.name,
            city: game.company.city,
            sector: game.company.sector,
            monthsPlayed: game.monthsPlayed,
            peakCash: game.career.peakCash,
            peakDebt: game.career.peakDebt,
            lifetimeRevenue: game.career.lifetimeRevenue,
            finalCash: game.company.cash,
            difficulty: game.difficulty ?? "normal",
            outcome: game.status === "lost" ? "lost" : "won",
            slotIndex: activeSlot,
          });
          get().markRunSubmitted();
        } catch {
          /* silent — cloud save PUT also upserts server-side */
        }
      },
      acceptOpportunity: (id) => {
        const before = get().game;
        let game = acceptOpportunity(before, id);
        const hint = game.lastUiHint;
        if (hint) {
          game = { ...game, lastUiHint: null };
        }
        const mil = unlockMilestones(game);
        game = mil.state;
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        const tookDeal = game.opportunities.every((o) => o.id !== id);
        if (tookDeal) {
          sfxGood();
          if (isFirstArAccept(before, game)) {
            get().flashToast(FIRST_WIN_TOAST_AR, "good");
          }
          get().noteMilestoneUnlocks(mil.unlocked);
        } else {
          get().flashToast(hint?.text ?? "Commessa non accettata", hint?.tone ?? "bad");
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
        let game = hireEmployee(get().game, role);
        const mil = unlockMilestones(game);
        game = mil.state;
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        get().noteMilestoneUnlocks(mil.unlocked);
        get().flashToast(`Assunto: ${role}`, "good");
      },
      fireEmployee: (id) => {
        const game = fireEmployee(get().game, id);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        get().flashToast("Dipendente licenziato · TFR liquidato", "bad");
        sfxBad();
      },
      payF24: () => {
        const before = get().game;
        if (f24BlockedByCollection(before)) {
          get().flashToast(
            "F24 bloccato: gestisci il debito in riscossione",
            "bad",
          );
          sfxBad();
          return;
        }
        let game = payF24(before);
        const paid = before.company.cash - game.company.cash;
        const celebrate = shouldCelebrateFirstWin(before, game, paid);
        if (celebrate) {
          game = markFirstWinCelebrated(game);
        }
        const mil = unlockMilestones(game);
        game = mil.state;
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        get().noteMilestoneUnlocks(mil.unlocked);
        if (celebrate) {
          get().flashToast(FIRST_WIN_TOAST_DONE, "good");
          sfxPay();
          return;
        }
        get().flashToast(
          paid > 0 ? `F24 versato: −${formatCash(paid)}` : "Niente da versare",
          paid > 0 ? "good" : "neutral",
        );
        if (paid > 0) sfxPay();
      },
      requestLoan: (req) => {
        let game = requestLoan(get().game, req);
        const mil = unlockMilestones(game);
        game = mil.state;
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        get().noteMilestoneUnlocks(mil.unlocked);
        get().flashToast("Mutuo erogato", "good");
        sfxGood();
      },
      acceptLoanOffer: () => {
        let game = acceptLoanOffer(get().game);
        const mil = unlockMilestones(game);
        game = mil.state;
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        get().noteMilestoneUnlocks(mil.unlocked);
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
        let game = requestFido(get().game, limit);
        const mil = unlockMilestones(game);
        game = mil.state;
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        get().noteMilestoneUnlocks(mil.unlocked);
      },
      drawFido: (amount) => {
        const game = drawFido(get().game, amount);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
      },
      buyUpgrade: (id) => {
        const before = upgradeLevel(migrateUpgradeState(get().game), id);
        let game = buyUpgrade(get().game, id);
        if (upgradeLevel(migrateUpgradeState(game), id) > before) {
          const mil = unlockMilestones(game);
          game = mil.state;
          set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
          get().noteMilestoneUnlocks(mil.unlocked);
          get().flashToast("Upgrade acquistato", "good");
          sfxGood();
        } else {
          set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
          get().flashToast("Upgrade non disponibile", "bad");
        }
      },
      resolveEvent: (optionId) => {
        const pending = get().game.pendingEvent;
        if (!pending) return;
        const game =
          pending.id === CARTELLA_EVENT_ID
            ? resolveCartellaChoice(get().game, optionId)
            : resolveEventOption(get().game, optionId);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        get().flashToast("Decisione presa", "neutral");
        sfxGood();
      },
      depositTreasury: (amount) => {
        const before = get().game.treasury ?? 0;
        let game = depositTreasury(get().game, amount);
        if ((game.treasury ?? 0) > before) {
          const mil = unlockMilestones(game);
          game = mil.state;
          set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
          get().noteMilestoneUnlocks(mil.unlocked);
          get().flashToast("Depositato in tesoreria", "good");
          sfxGood();
        } else {
          set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
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
        let game = investGrowth(get().game, amount);
        if ((game.growthInvested ?? 0) > before) {
          const mil = unlockMilestones(game);
          game = mil.state;
          set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
          get().noteMilestoneUnlocks(mil.unlocked);
          get().flashToast("Reinvestimento crescita", "good");
          sfxGood();
        } else {
          set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
          get().flashToast("Investimento non riuscito", "bad");
        }
      },
      buyAcquisition: (id) => {
        const migrated = migrateHoldingState(get().game);
        const before = migrated.subsidiaries.length;
        let game = buyAcquisition(migrated, id);
        if (game.subsidiaries.length > before) {
          const mil = unlockMilestones(game);
          game = mil.state;
          get().flashToast("Azienda acquisita", "good");
          sfxGood();
          set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
          get().noteMilestoneUnlocks(mil.unlocked);
        } else {
          get().flashToast("Acquisizione non riuscita", "bad");
          sfxBad();
          set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        }
      },
      investSubsidiaryCapex: (id) => {
        const migrated = migrateHoldingState(get().game);
        const before = migrated.company.cash;
        const game = investSubsidiaryCapex(migrated, id);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        if (game.company.cash < before) {
          get().flashToast("CAPEX ok (+16% EBITDA). Prossimo tra 6 mesi.", "good");
          sfxGood();
        } else {
          get().flashToast("CAPEX non disponibile", "bad");
          sfxBad();
        }
      },
      listSubsidiaryForSale: (id) => {
        const migrated = migrateHoldingState(get().game);
        const before = migrated.subsidiaries.find((s) => s.id === id)?.listedUntilMonthIdx;
        const game = listSubsidiaryForSale(migrated, id);
        const after = game.subsidiaries.find((s) => s.id === id)?.listedUntilMonthIdx;
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        if (before == null && after != null) {
          get().flashToast("Partecipata messa in vendita", "neutral");
        } else {
          get().flashToast("Vendita non disponibile", "bad");
          sfxBad();
        }
      },
      acceptSaleOffer: (id) => {
        const migrated = migrateHoldingState(get().game);
        const before = migrated.subsidiaries.length;
        const game = acceptSaleOffer(migrated, id);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        if (game.subsidiaries.length < before) {
          get().flashToast("Offerta accettata: partecipata venduta", "good");
          sfxGood();
        } else {
          get().flashToast("Offerta non valida", "bad");
          sfxBad();
        }
      },
      rejectSaleOffer: (id) => {
        const migrated = migrateHoldingState(get().game);
        const before = migrated.saleOffers.length;
        const game = rejectSaleOffer(migrated, id);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        if (game.saleOffers.length < before) {
          get().flashToast("Offerta rifiutata", "neutral");
        }
      },
      acceptProject: (id) => {
        const before = get().game;
        let game = acceptProject(before, id);
        if (game.activeProject && !before.activeProject) {
          const mil = unlockMilestones(game);
          game = mil.state;
          set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
          get().noteMilestoneUnlocks(mil.unlocked);
          get().flashToast(`Progetto avviato: ${getProjectDef(id).label}`, "good");
          sfxGood();
        } else {
          set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
          get().flashToast("Progetto non avviato", "bad");
          sfxBad();
        }
      },
      skipProjectOffer: () => {
        const game = skipProjectOffer(get().game);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
        if (!game.projectOffer) {
          get().flashToast("Piano investimenti saltato", "neutral");
        }
      },
      markRunSubmitted: () => {
        const game = structuredClone(get().game);
        game.career.submitted = true;
        game.career.submittedMonths = game.monthsPlayed;
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
      },
      markInboxRead: () => {
        const game = markLogRead(get().game);
        set({ game, slots: syncSlot(get().slots, get().activeSlot, game) });
      },
      installTesterSave: () => {
        if (!get().auth?.admin) {
          get().flashToast("Solo admin", "bad");
          sfxBad();
          return;
        }
        const game = createTesterGameState();
        const slots = get().slots.map((s, i) =>
          i === 0
            ? {
                label: "Tester mid",
                game,
                updatedAt: new Date().toISOString(),
              }
            : s,
        );
        set({
          slots,
          activeSlot: 0,
          game,
          screen: "game",
          coachOn: false,
          demandPopup: null,
          eventPopup: null,
        });
        get().flashToast("Slot 1: save tester midgame installato", "good");
        sfxGood();
      },
      selectSlot: (index) => {
        const slots = get().slots;
        const slot = slots[index];
        if (!slot) return;
        const game = slot.game
          ? migrateGameState(structuredClone(slot.game))
          : createInitialGameState();
        set({
          activeSlot: index,
          game,
          eventPopup: null,
          demandPopup: null,
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
        screen: state.screen,
        auth: state.auth,
        coachOn: state.coachOn,
        preferredDifficulty: state.preferredDifficulty,
        slots: state.slots,
        activeSlot: state.activeSlot,
      }),
      migrate: () => ({
        game: createInitialGameState(),
        screen: SIGNED_OUT_DOOR as Screen,
        auth: null,
        coachOn: true,
        preferredDifficulty: "normal" as DifficultyId,
        slots: emptySlots(),
        activeSlot: 0,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.game) migrateGameState(state.game);
        if (state?.slots) {
          for (const slot of state.slots) {
            if (slot.game) migrateGameState(slot.game);
          }
        }
        if (state) {
          if ((state.screen as string) === "admin") state.screen = "menu";
          state.screen = coerceScreenIfSignedOut(
            state.screen,
            Boolean(state.auth),
          ) as Screen;
        }
        if (!state?.auth) return;
        if (isIdleExpired()) {
          state.flashToast(SESSION_EXPIRED_TOAST, "bad");
          state.logout();
          return;
        }
        recordActivity();
        const { token } = state.auth;
        void fetchMe(token)
          .then((me) => {
            const current = useGameStore.getState();
            if (!current.auth) return;
            useGameStore.setState({
              auth: {
                ...current.auth,
                username: me.username,
                admin: me.admin,
              },
              accountAchievements: (me.achievements ?? []) as MilestoneId[],
            });
          })
          .catch((error: unknown) => {
            const current = useGameStore.getState();
            if (!current.auth) return;
            if (error instanceof ApiError && error.status === 401) {
              current.flashToast(SESSION_EXPIRED_TOAST, "bad");
              current.logout();
            }
          });
        void fetchSaves(token)
          .then((saves) => {
            const current = useGameStore.getState();
            if (!current.auth) return;
            const slots = saves.slots as SaveSlot[];
            const activeSlot = saves.activeSlot ?? 0;
            const active = slots[activeSlot] ?? slots[0];
            useGameStore.setState({
              slots,
              activeSlot,
              preferredDifficulty: saves.preferredDifficulty ?? current.preferredDifficulty,
              coachOn: saves.coachOn ?? current.coachOn,
              game: active?.game
                ? migrateGameState(structuredClone(active.game))
                : createInitialGameState(),
            });
          })
          .catch((error: unknown) => {
            const current = useGameStore.getState();
            if (!current.auth) return;
            if (error instanceof ApiError && error.status === 401) {
              current.flashToast(SESSION_EXPIRED_TOAST, "bad");
              current.logout();
              return;
            }
            current.flashToast("Impossibile aggiornare i salvataggi cloud", "bad");
          });
      },
    },
  ),
);

bindSessionToken((token) => {
  const { auth } = useGameStore.getState();
  if (!auth || auth.token === token) return;
  useGameStore.setState({ auth: { ...auth, token } });
});

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

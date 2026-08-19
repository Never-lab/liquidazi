import { writePersistedAuthToken } from "../ops/readPersistedAuth";
import { recordActivity } from "../ui/sessionIdle";
import type { DifficultyId } from "../config/difficulty";

export type AuthSession = {
  token: string;
  username: string;
  admin?: boolean;
};

export type AdminStats = {
  users: number;
  runs: number;
  runs24h: number;
  runs7d: number;
  cloudSaves: number;
  avgMonths: number;
  longestMonths: number;
  dataBytes: number;
  storage: "volume" | "local";
  recent: {
    id: string;
    username: string;
    companyName: string;
    city: string;
    monthsPlayed: number;
    outcome?: string | null;
    difficulty?: string | null;
    createdAt: string;
  }[];
  feedbackCount: number;
  recentFeedback: FeedbackEntry[];
  balance: BalanceStats;
  events24h: number;
  events7d: number;
  notFound24h: number;
  recentEvents: AdminEventRow[];
};

export type AdminEventRow = {
  id: string;
  at: string;
  method: string;
  path: string;
  status: number;
  username: string | null;
};

export type BalanceStats = {
  n: number;
  avgMonths: number;
  medianMonths: number;
  pctGe12: number;
  pctGe24: number;
  wins: number;
  losses: number;
  unknownOutcome: number;
  buckets: Record<"1-3" | "4-6" | "7-12" | "13-23" | "24+", number>;
  avgPeakCash: number;
  avgPeakDebt: number;
  avgFinalCash: number;
  byDifficulty: Record<string, { n: number; avgMonths: number; pctGe12: number }>;
  bySector: Record<string, { n: number; avgMonths: number }>;
};

export type FeedbackKind = "bug" | "idea" | "postmortem";

export type FeedbackEntry = {
  id: string;
  kind: FeedbackKind;
  message: string;
  contact: string | null;
  username: string | null;
  createdAt: string;
};

export type CloudSaveSlot = {
  label: string;
  game: unknown | null;
  updatedAt: string | null;
};

export type CloudSaves = {
  slots: CloudSaveSlot[];
  activeSlot: number;
  preferredDifficulty?: DifficultyId;
  coachOn?: boolean;
};

export type LeaderboardBoard =
  | "longest"
  | "shortest"
  | "debt"
  | "cash"
  | "revenue";

export type LeaderboardEntry = {
  rank: number;
  username: string;
  companyName: string;
  city: string;
  sector: string;
  monthsPlayed: number;
  peakCash: number;
  peakDebt: number;
  lifetimeRevenue: number;
  finalCash: number;
  outcome: "won" | "lost";
  createdAt: string;
};

export type RunPayload = {
  companyName: string;
  city: string;
  sector: string;
  monthsPlayed: number;
  peakCash: number;
  peakDebt: number;
  lifetimeRevenue: number;
  finalCash: number;
  difficulty?: DifficultyId;
  outcome?: "lost" | "won";
  /** Slot cloud 0–2 for upsert identity (long runs after soft-win). */
  slotIndex?: number;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const tokenListeners = new Set<(token: string) => void>();

export const bindSessionToken = (fn: (token: string) => void): (() => void) => {
  tokenListeners.add(fn);
  return () => {
    tokenListeners.delete(fn);
  };
};

const applyRefreshedToken = (token: string) => {
  writePersistedAuthToken(token);
  recordActivity();
  for (const fn of tokenListeners) fn(token);
};

const api = async <T>(
  path: string,
  opts: RequestInit & { token?: string } = {},
): Promise<T> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(path, { ...opts, headers });
  const refreshed = res.headers?.get("X-Session-Token");
  if (res.ok && refreshed) applyRefreshedToken(refreshed);
  else if (res.ok && opts.token) recordActivity();
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(data.error || `Errore ${res.status}`, res.status);
  return data;
};

export const register = (username: string, password: string) =>
  api<AuthSession>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const login = (username: string, password: string) =>
  api<AuthSession>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const fetchMe = (token: string) =>
  api<{ username: string; admin: boolean; achievements?: string[] }>(
    "/api/auth/me",
    { token },
  );

export const postAchievements = (token: string, ids: string[]) =>
  api<{ achievements: string[] }>("/api/auth/achievements", {
    method: "POST",
    token,
    body: JSON.stringify({ ids }),
  });

export const fetchAdminStats = (token: string) =>
  api<AdminStats>("/api/admin/stats", { token });

export const deleteAdminRun = (token: string, runId: string) =>
  api<{ ok: boolean; id: string; runs: number }>(
    `/api/admin/runs/${encodeURIComponent(runId)}`,
    { method: "DELETE", token },
  );

export const submitFeedback = (
  payload: { kind: FeedbackKind; message: string; contact?: string },
  token?: string,
) =>
  api<{ id: string }>("/api/feedback", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });

export const fetchSaves = (token: string) =>
  api<CloudSaves>("/api/saves", { token });

export const putSaves = (token: string, saves: CloudSaves) =>
  api<CloudSaves>("/api/saves", {
    method: "PUT",
    token,
    body: JSON.stringify(saves),
  });

export const submitRun = (token: string, run: RunPayload) =>
  api<{ id: string }>("/api/runs", {
    method: "POST",
    token,
    body: JSON.stringify(run),
  });

export const fetchLeaderboard = (board: LeaderboardBoard, limit = 20) =>
  api<{ board: string; label: string; entries: LeaderboardEntry[] }>(
    `/api/leaderboard?board=${board}&limit=${limit}`,
  );

export const fetchBoards = () =>
  api<{ id: LeaderboardBoard; label: string }[]>("/api/leaderboard/boards");

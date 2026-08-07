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
    username: string;
    companyName: string;
    city: string;
    monthsPlayed: number;
    createdAt: string;
  }[];
  feedbackCount: number;
  recentFeedback: FeedbackEntry[];
};

export type FeedbackKind = "bug" | "idea";

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
};

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

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
  api<{ username: string; admin: boolean }>("/api/auth/me", { token });

export const fetchAdminStats = (token: string) =>
  api<AdminStats>("/api/admin/stats", { token });

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

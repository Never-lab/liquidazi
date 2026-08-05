export type AuthSession = {
  token: string;
  username: string;
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
  if (!res.ok) throw new Error(data.error || `Errore ${res.status}`);
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
  api<{ username: string }>("/api/auth/me", { token });

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

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  achievements JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS saves (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  company_name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  sector TEXT NOT NULL DEFAULT '',
  months_played INTEGER NOT NULL,
  peak_cash DOUBLE PRECISION NOT NULL,
  peak_debt DOUBLE PRECISION NOT NULL,
  lifetime_revenue DOUBLE PRECISION NOT NULL,
  final_cash DOUBLE PRECISION NOT NULL,
  difficulty TEXT,
  outcome TEXT NOT NULL DEFAULT 'lost',
  slot_index SMALLINT,
  source TEXT NOT NULL DEFAULT 'end',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS runs_user_id_idx ON runs(user_id);
CREATE INDEX IF NOT EXISTS runs_created_at_idx ON runs(created_at DESC);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  contact TEXT,
  username TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback(created_at DESC);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status INTEGER NOT NULL,
  username TEXT
);

CREATE INDEX IF NOT EXISTS events_at_idx ON events(at DESC);
`;

/** @param {import("pg").QueryResultRow} row */
export const runFromRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  username: row.username,
  companyName: row.company_name,
  city: row.city ?? "",
  sector: row.sector ?? "",
  monthsPlayed: row.months_played,
  peakCash: row.peak_cash,
  peakDebt: row.peak_debt,
  lifetimeRevenue: row.lifetime_revenue,
  finalCash: row.final_cash,
  difficulty: row.difficulty ?? null,
  outcome: row.outcome ?? "lost",
  slotIndex: row.slot_index ?? null,
  source: row.source ?? "end",
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
});

/** @param {object} run */
export const runToColumns = (run) => ({
  id: run.id,
  user_id: run.userId,
  username: run.username,
  company_name: run.companyName,
  city: run.city ?? "",
  sector: run.sector ?? "",
  months_played: run.monthsPlayed,
  peak_cash: run.peakCash,
  peak_debt: run.peakDebt,
  lifetime_revenue: run.lifetimeRevenue,
  final_cash: run.finalCash,
  difficulty: run.difficulty ?? null,
  outcome: run.outcome ?? "lost",
  slot_index: run.slotIndex ?? null,
  source: run.source ?? "end",
  created_at: run.createdAt,
  updated_at: run.updatedAt ?? null,
});

export const UPSERT_RUN_SQL = `
INSERT INTO runs (
  id, user_id, username, company_name, city, sector,
  months_played, peak_cash, peak_debt, lifetime_revenue, final_cash,
  difficulty, outcome, slot_index, source, created_at, updated_at
) VALUES (
  $1, $2, $3, $4, $5, $6,
  $7, $8, $9, $10, $11,
  $12, $13, $14, $15, $16, $17
)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  company_name = EXCLUDED.company_name,
  city = EXCLUDED.city,
  sector = EXCLUDED.sector,
  months_played = EXCLUDED.months_played,
  peak_cash = EXCLUDED.peak_cash,
  peak_debt = EXCLUDED.peak_debt,
  lifetime_revenue = EXCLUDED.lifetime_revenue,
  final_cash = EXCLUDED.final_cash,
  difficulty = EXCLUDED.difficulty,
  outcome = EXCLUDED.outcome,
  slot_index = EXCLUDED.slot_index,
  source = EXCLUDED.source,
  updated_at = EXCLUDED.updated_at
`;

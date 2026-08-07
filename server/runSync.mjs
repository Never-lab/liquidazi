/**
 * Sync leaderboard/balance runs from cloud saves and upsert POST /api/runs.
 * Soft-win at 24m used to submit once; continued / long runs never updated runs.json.
 */

/**
 * @param {unknown} game
 * @returns {boolean}
 */
export function shouldTrackGame(game) {
  if (!game || typeof game !== "object") return false;
  const g = /** @type {Record<string, unknown>} */ (game);
  const months = Number(g.monthsPlayed);
  if (!Number.isFinite(months) || months < 1) return false;
  const status = String(g.status || "");
  if (status === "lost" || status === "won") return true;
  const career = g.career && typeof g.career === "object"
    ? /** @type {Record<string, unknown>} */ (g.career)
    : null;
  if (career?.year2Reached === true) return true;
  return months >= 24;
}

/**
 * @param {unknown} game
 * @param {{ id: string, username: string }} user
 * @param {number | null} slotIndex
 * @returns {object | null}
 */
export function extractRunFromGame(game, user, slotIndex = null) {
  if (!shouldTrackGame(game)) return null;
  const g = /** @type {Record<string, any>} */ (game);
  const company = g.company && typeof g.company === "object" ? g.company : {};
  const career = g.career && typeof g.career === "object" ? g.career : {};
  const monthsPlayed = Math.round(Number(g.monthsPlayed));
  const status = String(g.status || "");
  const outcome =
    status === "lost"
      ? "lost"
      : status === "won" || career.year2Reached === true || monthsPlayed >= 24
        ? "won"
        : "lost";
  const DIFFS = new Set(["easy", "normal", "hard"]);
  const difficultyRaw = String(g.difficulty || "").trim().toLowerCase();
  const difficulty = DIFFS.has(difficultyRaw) ? difficultyRaw : null;
  return {
    userId: user.id,
    username: user.username,
    companyName: String(company.name || "SRL").slice(0, 40),
    city: String(company.city || "").slice(0, 12),
    sector: String(company.sector || "").slice(0, 20),
    monthsPlayed,
    peakCash: Math.round(Number(career.peakCash ?? company.cash ?? 0) * 100) / 100,
    peakDebt: Math.round(Number(career.peakDebt ?? 0) * 100) / 100,
    lifetimeRevenue: Math.round(Number(career.lifetimeRevenue ?? 0) * 100) / 100,
    finalCash: Math.round(Number(company.cash ?? 0) * 100) / 100,
    difficulty,
    outcome,
    slotIndex:
      typeof slotIndex === "number" && Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex <= 2
        ? slotIndex
        : null,
    source: "save",
  };
}

/**
 * Upsert: same userId+slotIndex replaces when monthsPlayed is >= existing
 * (or peaks improve). Without slotIndex: for won, replace the user's best won
 * if monthsPlayed is higher; for lost without slot, always append.
 *
 * @param {object[]} runs
 * @param {object} candidate — full run fields except id/createdAt may be missing
 * @param {() => string} newId
 * @returns {{ runs: object[], upserted: boolean, id: string }}
 */
export function upsertRun(runs, candidate, newId) {
  const now = new Date().toISOString();
  const list = [...runs];
  const slot =
    typeof candidate.slotIndex === "number" && Number.isInteger(candidate.slotIndex)
      ? candidate.slotIndex
      : null;

  let idx = -1;
  if (slot !== null) {
    idx = list.findIndex(
      (r) => r.userId === candidate.userId && r.slotIndex === slot,
    );
  } else if (candidate.outcome === "won") {
    // Best soft-win / long survival for this user without slot key
    let bestMonths = -1;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (r.userId !== candidate.userId || r.outcome !== "won") continue;
      if (r.slotIndex != null) continue;
      if (r.monthsPlayed > bestMonths) {
        bestMonths = r.monthsPlayed;
        idx = i;
      }
    }
    if (idx >= 0 && candidate.monthsPlayed < list[idx].monthsPlayed) {
      return { runs: list, upserted: false, id: list[idx].id };
    }
  }

  if (idx >= 0) {
    const prev = list[idx];
    if (
      candidate.monthsPlayed < prev.monthsPlayed &&
      candidate.peakCash <= prev.peakCash &&
      candidate.lifetimeRevenue <= prev.lifetimeRevenue
    ) {
      return { runs: list, upserted: false, id: prev.id };
    }
    const merged = {
      ...prev,
      ...candidate,
      id: prev.id,
      slotIndex: slot !== null ? slot : prev.slotIndex ?? null,
      createdAt: prev.createdAt,
      updatedAt: now,
    };
    list[idx] = merged;
    return { runs: list, upserted: true, id: prev.id };
  }

  const id = newId();
  list.push({
    ...candidate,
    id,
    slotIndex: slot,
    createdAt: now,
    updatedAt: now,
  });
  return { runs: list, upserted: true, id };
}

/**
 * @param {{ id: string, username: string }[]} users
 * @param {object[]} runs
 * @param {(userId: string) => { slots?: { game?: unknown }[] }} loadUserSaves
 * @param {() => string} newId
 * @returns {{ runs: object[], synced: number, touchedUsers: number }}
 */
export function syncRunsFromSaves(users, runs, loadUserSaves, newId) {
  let next = [...runs];
  let synced = 0;
  let touchedUsers = 0;
  for (const user of users) {
    const saves = loadUserSaves(user.id);
    const slots = Array.isArray(saves?.slots) ? saves.slots : [];
    let userTouched = false;
    for (let i = 0; i < slots.length; i++) {
      const extracted = extractRunFromGame(slots[i]?.game, user, i);
      if (!extracted) continue;
      const before = next.length;
      const result = upsertRun(next, extracted, newId);
      next = result.runs;
      if (result.upserted) {
        synced += 1;
        userTouched = true;
      } else if (next.length !== before) {
        synced += 1;
        userTouched = true;
      }
    }
    if (userTouched) touchedUsers += 1;
  }
  return { runs: next, synced, touchedUsers };
}

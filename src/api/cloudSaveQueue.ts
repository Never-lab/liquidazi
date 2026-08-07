import type { CloudSaves } from "./client";

export type CloudSaveStatus = "hidden" | "pending" | "syncing" | "saved";

export const CLOUD_SAVE_MS = 15_000;
export const SAVED_VISIBLE_MS = 2_000;

type Deps = {
  put: (token: string, saves: CloudSaves) => Promise<unknown>;
  getToken: () => string | null;
  getPayload: () => CloudSaves;
  onStatus: (status: CloudSaveStatus) => void;
  onError: () => void;
};

export const createCloudSaveQueue = (deps: Deps) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let savedTimer: ReturnType<typeof setTimeout> | null = null;
  let status: CloudSaveStatus = "hidden";
  let inFlight = false;

  const setStatus = (next: CloudSaveStatus) => {
    status = next;
    deps.onStatus(next);
  };

  const waitInFlight = async () => {
    while (inFlight) {
      await new Promise((r) => setTimeout(r, 20));
    }
  };

  const runPut = async () => {
    const token = deps.getToken();
    if (!token || inFlight) return;
    inFlight = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    setStatus("syncing");
    try {
      await deps.put(token, deps.getPayload());
      setStatus("saved");
      if (savedTimer) clearTimeout(savedTimer);
      savedTimer = setTimeout(() => setStatus("hidden"), SAVED_VISIBLE_MS);
    } catch {
      deps.onError();
      setStatus("hidden");
    } finally {
      inFlight = false;
    }
  };

  return {
    getStatus: () => status,
    schedule: () => {
      if (!deps.getToken()) return;
      if (savedTimer) {
        clearTimeout(savedTimer);
        savedTimer = null;
      }
      setStatus("pending");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void runPut();
      }, CLOUD_SAVE_MS);
    },
    /**
     * Push now. `force` always PUTs (logout) even if status looks idle,
     * so a pending debounce is never dropped when the user signs out.
     */
    flush: async (opts?: { force?: boolean }) => {
      if (!deps.getToken()) return;
      const wasPending = timer !== null;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await waitInFlight();
      if (
        opts?.force ||
        wasPending ||
        status === "pending" ||
        status === "syncing"
      ) {
        await runPut();
      }
    },
    clear: () => {
      if (timer) clearTimeout(timer);
      timer = null;
      if (savedTimer) clearTimeout(savedTimer);
      savedTimer = null;
      setStatus("hidden");
    },
  };
};

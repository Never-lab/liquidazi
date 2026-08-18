export const ACTIVITY_KEY = "liquidazi-auth-activity";
export const SESSION_IDLE_MS = 2 * 60 * 60 * 1000;
export const SESSION_EXPIRED_TOAST = "Sessione scaduta";

export const recordActivity = (now = Date.now()): void => {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(now));
  } catch {
    /* private mode / quota */
  }
};

export const clearActivity = (): void => {
  try {
    localStorage.removeItem(ACTIVITY_KEY);
  } catch {
    /* ignore */
  }
};

export const isIdleExpired = (now = Date.now()): boolean => {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    const last = Number(raw);
    if (!Number.isFinite(last) || last <= 0) return true;
    return now - last > SESSION_IDLE_MS;
  } catch {
    return true;
  }
};

export const watchSessionIdle = (onExpire: () => void): (() => void) => {
  let done = false;
  const fire = () => {
    if (done) return;
    done = true;
    onExpire();
  };
  const onAct = () => recordActivity();
  window.addEventListener("click", onAct);
  window.addEventListener("keydown", onAct);
  window.addEventListener("touchstart", onAct);
  const id = window.setInterval(() => {
    if (isIdleExpired()) fire();
  }, 30_000);
  return () => {
    window.removeEventListener("click", onAct);
    window.removeEventListener("keydown", onAct);
    window.removeEventListener("touchstart", onAct);
    window.clearInterval(id);
  };
};

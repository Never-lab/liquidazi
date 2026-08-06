export const INTRO_SEEN_KEY = "liquidazi-intro-seen";

export const hasSeenIntro = (): boolean => {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

export const markIntroSeen = (): void => {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    /* private mode / quota — degrade to showing intro again */
  }
};

export const screenAfterAuth = (): "intro" | "menu" =>
  hasSeenIntro() ? "menu" : "intro";

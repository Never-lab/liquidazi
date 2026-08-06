export const INTRO_SEEN_KEY = "liquidazi-intro-seen";

export const hasSeenIntro = (): boolean =>
  localStorage.getItem(INTRO_SEEN_KEY) === "1";

export const markIntroSeen = (): void => {
  localStorage.setItem(INTRO_SEEN_KEY, "1");
};

export const screenAfterAuth = (): "intro" | "menu" =>
  hasSeenIntro() ? "menu" : "intro";

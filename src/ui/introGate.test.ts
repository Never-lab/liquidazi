import { afterEach, describe, expect, it } from "vitest";
import {
  INTRO_SEEN_KEY,
  hasSeenIntro,
  markIntroSeen,
  screenAfterAuth,
} from "./introGate";

afterEach(() => {
  localStorage.removeItem(INTRO_SEEN_KEY);
});

describe("introGate", () => {
  it("starts unseen → intro", () => {
    expect(hasSeenIntro()).toBe(false);
    expect(screenAfterAuth()).toBe("intro");
  });

  it("markIntroSeen → menu thereafter", () => {
    markIntroSeen();
    expect(localStorage.getItem(INTRO_SEEN_KEY)).toBe("1");
    expect(hasSeenIntro()).toBe(true);
    expect(screenAfterAuth()).toBe("menu");
  });
});

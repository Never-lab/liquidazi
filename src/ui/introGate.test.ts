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

  it("storage throw degrades safely", () => {
    const getItem = localStorage.getItem.bind(localStorage);
    const setItem = localStorage.setItem.bind(localStorage);
    localStorage.getItem = () => {
      throw new Error("blocked");
    };
    localStorage.setItem = () => {
      throw new Error("blocked");
    };
    expect(hasSeenIntro()).toBe(false);
    expect(() => markIntroSeen()).not.toThrow();
    expect(screenAfterAuth()).toBe("intro");
    localStorage.getItem = getItem;
    localStorage.setItem = setItem;
  });
});

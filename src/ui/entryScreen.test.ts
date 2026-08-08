import { describe, expect, it } from "vitest";
import { coerceScreenIfSignedOut, SIGNED_OUT_DOOR } from "./entryScreen";

describe("entryScreen", () => {
  it("SIGNED_OUT_DOOR is landing", () => {
    expect(SIGNED_OUT_DOOR).toBe("landing");
  });

  it("keeps screen when authenticated", () => {
    expect(coerceScreenIfSignedOut("menu", true)).toBe("menu");
    expect(coerceScreenIfSignedOut("game", true)).toBe("game");
  });

  it("maps stale auth screen to landing when signed out", () => {
    expect(coerceScreenIfSignedOut("auth", false)).toBe("landing");
  });

  it("maps in-app screens to landing when signed out", () => {
    expect(coerceScreenIfSignedOut("game", false)).toBe("landing");
    expect(coerceScreenIfSignedOut("menu", false)).toBe("landing");
    expect(coerceScreenIfSignedOut("setup", false)).toBe("landing");
  });

  it("allows public screens when signed out", () => {
    expect(coerceScreenIfSignedOut("landing", false)).toBe("landing");
    expect(coerceScreenIfSignedOut("leaderboard", false)).toBe("leaderboard");
  });
});

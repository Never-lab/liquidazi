import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./types";
import { markLogRead, unreadLogCount } from "./notifications";

describe("notification inbox unread", () => {
  it("initial welcome log is already read (id 0, thru 0)", () => {
    const s = createInitialGameState();
    expect(unreadLogCount(s)).toBe(0);
  });

  it("counts entries newer than logReadThruId", () => {
    const s = createInitialGameState();
    s.log.unshift({
      id: 5,
      monthIdx: s.log[0]!.monthIdx,
      tone: "bad",
      text: "Shock",
    });
    expect(unreadLogCount(s)).toBe(1);
    const read = markLogRead(s);
    expect(read.logReadThruId).toBe(5);
    expect(unreadLogCount(read)).toBe(0);
  });
});

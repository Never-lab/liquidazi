import { describe, expect, it } from "vitest";
import { hintOpenReducer } from "./hintOpen";

describe("hintOpenReducer", () => {
  it("opens, closes, toggles", () => {
    expect(hintOpenReducer(false, { type: "open" })).toBe(true);
    expect(hintOpenReducer(true, { type: "close" })).toBe(false);
    expect(hintOpenReducer(false, { type: "toggle" })).toBe(true);
    expect(hintOpenReducer(true, { type: "toggle" })).toBe(false);
  });
});

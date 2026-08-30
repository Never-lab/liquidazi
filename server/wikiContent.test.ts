import { describe, expect, it } from "vitest";
import { WIKI_PAGE_IDS, loadWikiPage, loadWikiPages } from "./wikiContent.mjs";

describe("wikiContent", () => {
  it("loads all ordered help chapters with titles and body", () => {
    const pages = loadWikiPages();
    expect(pages.map((p) => p.id)).toEqual([...WIKI_PAGE_IDS]);
    for (const p of pages) {
      expect(p.title.length).toBeGreaterThan(2);
      expect(p.body.length).toBeGreaterThan(40);
    }
  });

  it("returns null for unknown ids", () => {
    expect(loadWikiPage("nope")).toBe(null);
  });
});

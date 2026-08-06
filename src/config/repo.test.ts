import { describe, expect, it } from "vitest";
import { bugReportUrl, enhancementUrl, GITHUB_REPO } from "./repo";

describe("repo feedback URLs", () => {
  it("points at Never-lab/liquidazi with labels and title prefixes", () => {
    expect(GITHUB_REPO).toBe("Never-lab/liquidazi");
    expect(bugReportUrl()).toContain("github.com/Never-lab/liquidazi/issues/new");
    expect(bugReportUrl()).toContain("labels=bug");
    expect(bugReportUrl()).toContain("title=Bug%3A%20");
    expect(enhancementUrl()).toContain("labels=enhancement");
    expect(enhancementUrl()).toContain("title=Idea%3A%20");
  });
});

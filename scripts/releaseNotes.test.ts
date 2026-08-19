import { describe, expect, it } from "vitest";
import {
  extractChangelogEntry,
  formatReleaseNotes,
  releaseTitle,
  tagName,
} from "./releaseNotes.mjs";

const SAMPLE = `# Changelog

## [Unreleased]

## [1.3.1] — 2026-08-19

### Fixed
- Script migrate path fix.

## [1.3.0] — 2026-08-19

Summary line.

### Added
- Postgres storage.
`;

describe("releaseNotes", () => {
  it("extracts changelog section by version", () => {
    expect(extractChangelogEntry(SAMPLE, "1.3.1")).toBe(
      "### Fixed\n- Script migrate path fix.",
    );
    expect(extractChangelogEntry(SAMPLE, "1.3.0")).toContain("Postgres storage");
    expect(extractChangelogEntry(SAMPLE, "9.9.9")).toBeNull();
  });

  it("formats GitHub release body", () => {
    const body = formatReleaseNotes("1.3.1", "### Fixed\n- item");
    expect(body).toContain("### Fixed");
    expect(body).toContain("CHANGELOG.md");
  });

  it("builds title and tag", () => {
    expect(releaseTitle("1.3.1")).toBe("Floatdesk 1.3.1");
    expect(tagName("1.3.1")).toBe("v1.3.1");
  });
});

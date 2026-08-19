const REPO = "Never-lab/liquidazi";

/**
 * @param {string} changelog
 * @param {string} version
 * @returns {string | null}
 */
export function extractChangelogEntry(changelog, version) {
  const header = `## [${version}]`;
  const lines = changelog.split("\n");
  const startIdx = lines.findIndex((line) => line.startsWith(header));
  if (startIdx === -1) return null;
  const body = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## [")) break;
    body.push(lines[i]);
  }
  const text = body.join("\n").trim();
  return text || null;
}

/**
 * @param {string} version
 * @param {string} entryBody
 * @param {string} [repo]
 */
export function formatReleaseNotes(version, entryBody, repo = REPO) {
  const body = entryBody.trim();
  return `${body}\n\nVedi [CHANGELOG.md](https://github.com/${repo}/blob/main/CHANGELOG.md).`;
}

export const releaseTitle = (version) => `Floatdesk ${version}`;

export const tagName = (version) => `v${version}`;

/**
 * Publisher guide pages from docs/wiki/help — same order as scripts/sync-guide-pages.mjs.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const WIKI_PAGE_IDS = [
  "come-si-gioca",
  "fisco-e-f24",
  "personale-e-capacita",
  "finanza",
  "faq",
];

const helpDir = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "wiki", "help");

/**
 * @param {string} id
 * @returns {{ id: string, title: string, body: string } | null}
 */
export const loadWikiPage = (id) => {
  if (!WIKI_PAGE_IDS.includes(id)) return null;
  let raw;
  try {
    raw = readFileSync(join(helpDir, `${id}.md`), "utf8");
  } catch {
    return null;
  }
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const titleLine = lines.find((l) => l.startsWith("# "));
  if (!titleLine) return null;
  const title = titleLine.slice(2).trim();
  const titleIdx = lines.indexOf(titleLine);
  const body = lines.slice(titleIdx + 1).join("\n").trim();
  return { id, title, body };
};

/** @returns {{ id: string, title: string, body: string }[]} */
export const loadWikiPages = () =>
  WIKI_PAGE_IDS.map((id) => loadWikiPage(id)).filter(Boolean);

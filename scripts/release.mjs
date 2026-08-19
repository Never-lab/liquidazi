/**
 * Tag + GitHub Release in one step (after version/changelog PR is on main).
 *
 * Usage (on main, clean tree):
 *   npm run release
 *   npm run release -- --dry-run
 *   npm run release -- --no-push
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractChangelogEntry,
  formatReleaseNotes,
  releaseTitle,
  tagName,
} from "./releaseNotes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const noPush = args.has("--no-push");

const run = (cmd, cmdArgs, { allowFail = false } = {}) => {
  const label = [cmd, ...cmdArgs].join(" ");
  if (dryRun) {
    console.log(`[dry-run] ${label}`);
    return { status: 0, stdout: "" };
  }
  const res = spawnSync(cmd, cmdArgs, { cwd: root, encoding: "utf8" });
  if (res.status !== 0 && !allowFail) {
    const err = (res.stderr || res.stdout || "").trim();
    throw new Error(`${label} failed${err ? `: ${err}` : ""}`);
  }
  return res;
};

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = String(pkg.version || "").trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`FATAL: package.json version must be SemVer (got "${version}").`);
  process.exit(1);
}

const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
const entry = extractChangelogEntry(changelog, version);
if (!entry) {
  console.error(
    `FATAL: no ## [${version}] section in CHANGELOG.md — add release notes before tagging.`,
  );
  process.exit(1);
}

const tag = tagName(version);
const title = releaseTitle(version);
const notes = formatReleaseNotes(version, entry);

const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();
if (branch !== "main") {
  console.error(`FATAL: release from branch "${branch}" — checkout main first.`);
  process.exit(1);
}

const dirty = run("git", ["status", "--porcelain"]).stdout.trim();
if (dirty) {
  console.error("FATAL: working tree not clean — commit or stash before release.");
  process.exit(1);
}

const tagExists = run("git", ["rev-parse", tag], { allowFail: true }).status === 0;
if (tagExists) {
  console.error(`FATAL: tag ${tag} already exists locally.`);
  process.exit(1);
}

const remoteTag = run("git", ["ls-remote", "--tags", "origin", tag], { allowFail: true });
if (!dryRun && remoteTag.stdout.includes(`refs/tags/${tag}`)) {
  console.error(`FATAL: tag ${tag} already exists on origin.`);
  process.exit(1);
}

console.log(`Release ${title} (${tag})`);
console.log("---");
console.log(notes);
console.log("---");

run("git", ["tag", "-a", tag, "-m", title]);

if (!noPush) {
  run("git", ["push", "origin", tag]);
}

const ghArgs = ["release", "create", tag, "--title", title, "--latest", "--notes", notes];
run("gh", ghArgs);

console.log(dryRun ? "[dry-run] done." : `Published ${tag} — deploy production will start.`);

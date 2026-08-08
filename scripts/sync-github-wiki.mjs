import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wikiSrc = path.join(root, "docs/wiki");
const mirror = path.join(root, ".wiki-mirror");
const wikiHttps = "https://github.com/Never-lab/liquidazi.wiki.git";

const authRemote = () => {
  const tok = spawnSync("gh", ["auth", "token"], { encoding: "utf8", shell: false });
  if (tok.status === 0 && tok.stdout?.trim()) {
    return `https://x-access-token:${tok.stdout.trim()}@github.com/Never-lab/liquidazi.wiki.git`;
  }
  return wikiHttps;
};

const run = (cmd, args, cwd = mirror) => {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", shell: false });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || "").trim();
    throw new Error(`${cmd} ${args.join(" ")} failed: ${err || `exit ${r.status}`}`);
  }
  return r.stdout ?? "";
};

const tryRun = (cmd, args, cwd = mirror) => {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", shell: false });
  return r.status === 0;
};

if (!fs.existsSync(wikiSrc)) {
  console.error(`Missing ${wikiSrc}`);
  process.exit(1);
}

const remote = authRemote();

if (!fs.existsSync(path.join(mirror, ".git"))) {
  fs.rmSync(mirror, { recursive: true, force: true });
  console.log(`Cloning ${wikiHttps} → .wiki-mirror/`);
  const clone = spawnSync("git", ["clone", remote, mirror], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (clone.status !== 0) {
    console.error(
      (clone.stderr || clone.stdout || "").trim() || "Clone failed.",
    );
    console.error(
      "One-time setup: open https://github.com/Never-lab/liquidazi/wiki/_new and create a Home page, then re-run npm run wiki:sync-github.",
    );
    process.exit(1);
  }
  // Point origin at authenticated URL for later pushes
  run("git", ["remote", "set-url", "origin", remote]);
} else {
  run("git", ["remote", "set-url", "origin", remote]);
  run("git", ["fetch", "origin"]);
  run("git", ["checkout", "master"]);
  if (!tryRun("git", ["pull", "--ff-only", "origin", "master"])) {
    tryRun("git", ["pull", "--ff-only", "origin", "main"]);
  }
}

const rewriteHelpLinks = (md) =>
  md
    .replace(/\]\(help\/([^)#]+)\.md\)/g, "](help-$1)")
    .replace(/\]\((?!https?:|help-|#)([^)#]+)\.md\)/g, "]($1)");

const writePage = (name, contents) => {
  fs.writeFileSync(path.join(mirror, name), contents.replace(/\r\n/g, "\n"), "utf8");
};

const indexRaw = fs.readFileSync(path.join(wikiSrc, "INDEX.md"), "utf8");
writePage("Home.md", rewriteHelpLinks(indexRaw));

const agentPages = fs
  .readdirSync(wikiSrc)
  .filter((f) => f.endsWith(".md") && f !== "INDEX.md");

for (const f of agentPages) {
  const raw = fs.readFileSync(path.join(wikiSrc, f), "utf8");
  writePage(f, rewriteHelpLinks(raw));
}

const helpDir = path.join(wikiSrc, "help");
const helpPages = fs.existsSync(helpDir)
  ? fs.readdirSync(helpDir).filter((f) => f.endsWith(".md"))
  : [];

for (const f of helpPages) {
  const id = f.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(helpDir, f), "utf8");
  writePage(`help-${id}.md`, raw.replace(/\r\n/g, "\n"));
}

const sidebarLines = [
  "**Liquidazi**",
  "",
  "- [Home](Home)",
  "",
  "**Agent**",
  ...agentPages.map((f) => {
    const id = f.replace(/\.md$/, "");
    return `- [${id}](${id})`;
  }),
  "",
  "**Help**",
  ...helpPages.map((f) => {
    const id = f.replace(/\.md$/, "");
    return `- [${id}](help-${id})`;
  }),
  "",
];
writePage("_Sidebar.md", sidebarLines.join("\n"));

run("git", ["add", "-A"]);
const dirty = spawnSync("git", ["status", "--porcelain"], {
  cwd: mirror,
  encoding: "utf8",
  shell: false,
});
if (!(dirty.stdout || "").trim()) {
  console.log("GitHub Wiki already up to date.");
  process.exit(0);
}

run("git", ["commit", "-m", "docs: sync from docs/wiki"]);
const push = spawnSync("git", ["push", "origin", "HEAD"], {
  cwd: mirror,
  encoding: "utf8",
  shell: false,
});
if (push.status !== 0) {
  console.error((push.stderr || push.stdout || "").trim() || "git push failed");
  process.exit(1);
}

console.log("Synced docs/wiki → https://github.com/Never-lab/liquidazi/wiki");

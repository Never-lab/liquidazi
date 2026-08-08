# Wiki + Guida + Graphify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a curated `docs/wiki/` (agent + player), mirror it to GitHub Wiki, refresh graphify, and add an in-game Guida that reads the same `help/` pages.

**Architecture:** `docs/wiki/` is the single source of truth. A small Node script syncs `help/*.md` into committed `src/content/guidePages.ts`. `GuideScreen` renders that array. Another script mirrors `docs/wiki/` to the repo’s `*.wiki.git`. Graphify outputs live under `graphify-out/` (selective commit + gitignore for heavy viz).

**Tech Stack:** TypeScript, React, Zustand, Vitest, Node ESM scripts, graphifyy (Python CLI), GitHub Wiki git remote. No new runtime npm deps.

**Spec:** `docs/superpowers/specs/2026-08-08-wiki-guida-design.md`

## Global Constraints

- Source of truth: `docs/wiki/` only — never edit GitHub Wiki UI as primary
- Guida bundles **only** `docs/wiki/help/*`
- Tutorial 3-step screen unchanged
- No EN localization, no Guida search, no CI auto-graphify
- Reuse `MenuScreen.module.css`; no new design system
- Wiki summarizes **current** shipped behavior (verify against `src/sim/`, `src/config/`); do not paste plan diffs
- Before PR: `npm run lint && npm test && npm run build`
- Branch: `docs/wiki-guida`

## File map

| File | Role |
|------|------|
| `docs/wiki/INDEX.md` | Agent/human start-here |
| `docs/wiki/*.md` | Agent system pages |
| `docs/wiki/help/*.md` | Player help (also Guida source) |
| `docs/README.md`, `AGENTS.md` | Pointers into wiki |
| `scripts/sync-guide-pages.mjs` | MD help → `guidePages.ts` |
| `scripts/sync-github-wiki.mjs` | Push `docs/wiki` → `*.wiki.git` |
| `src/content/guidePages.ts` | Committed Guida chapters |
| `src/content/guidePages.test.ts` | ≥1 chapter smoke |
| `src/screens/GuideScreen.tsx` | In-game Guida UI |
| `src/store/gameStore.ts` | `Screen` + `"guide"` |
| `src/App.tsx`, `src/screens/MenuScreen.tsx` | Wire screen + nav |
| `package.json` | `wiki:sync-help`, `wiki:sync-github` |
| `graphify-out/**` | Generated graph (+ selective commit) |
| `.gitignore` | Ignore heavy graphify viz if needed |
| `ROADMAP.md` | Note wiki slice when shipped |

---

### Task 1: Wiki index + agent entry pointers

**Files:**
- Create: `docs/wiki/INDEX.md`
- Modify: `AGENTS.md`
- Modify: `docs/README.md`

**Interfaces:**
- Produces: canonical start path `docs/wiki/INDEX.md` for agents

- [ ] **Step 1: Create `docs/wiki/INDEX.md`**

```md
# Liquidazi wiki

**Start here** for agents and humans. Specs/plans under `docs/superpowers/` are history; this wiki describes **current** shipped behavior.

## Edit rules

1. Edit files in this folder in git (`docs/wiki/`).
2. Run `npm run wiki:sync-help` after changing `help/`.
3. Mirror to GitHub Wiki with `npm run wiki:sync-github` (do not treat the Wiki UI as source of truth).

## Agent map

| Page | Topic |
|------|--------|
| [architecture.md](architecture.md) | Stack, folders, screens, store |
| [sim-loop.md](sim-loop.md) | Month close, cash, shocks, comfort |
| [fiscal.md](fiscal.md) | F24, mora, cartella, enforcement |
| [staff-ops.md](staff-ops.md) | Hiring, oneri, capacity, projects |
| [holding.md](holding.md) | Flip / acquisitions |
| [ui-feedback.md](ui-feedback.md) | HUD, inbox, toast vs log |
| [deploy.md](deploy.md) | Railway / build |

## Player help (also in-game Guida)

| Page | Topic |
|------|--------|
| [help/come-si-gioca.md](help/come-si-gioca.md) | Core loop |
| [help/fisco-e-f24.md](help/fisco-e-f24.md) | Taxes & collection |
| [help/personale-e-capacita.md](help/personale-e-capacita.md) | Staff & capacity |
| [help/finanza.md](help/finanza.md) | Loans & emergency cash |
| [help/faq.md](help/faq.md) | Common blockers |

## Graphify

After regenerate: see `graphify-out/GRAPH_REPORT.md` and `graphify-out/wiki/` (if present).  
Regenerate: install `graphifyy`, then from repo root run the graphify full pipeline and `graphify . --wiki` (see `deploy.md` / agent notes).

## GitHub Wiki

Public mirror: `https://github.com/Never-lab/liquidazi/wiki` (Home should match this INDEX).
```

- [ ] **Step 2: Prepend agent start-here to `AGENTS.md`**

Keep existing merge-gate sections. Insert at top (after the title):

```md
## Codebase orientation

1. Read [`docs/wiki/INDEX.md`](docs/wiki/INDEX.md) first.
2. For code relationships, use `graphify-out/` (regenerate with graphify if missing).
3. Historical slice specs/plans: `docs/superpowers/` — not the live handbook.
```

- [ ] **Step 3: Update `docs/README.md` table**

Add row:

```md
| `wiki/` | Living handbook (agents + player help). GitHub Wiki is a mirror — edit here first. |
```

- [ ] **Step 4: Commit**

```bash
git add docs/wiki/INDEX.md AGENTS.md docs/README.md
git commit -m "docs: add wiki INDEX and agent entry pointers"
```

---

### Task 2: Agent system wiki pages

**Files:**
- Create: `docs/wiki/architecture.md`
- Create: `docs/wiki/sim-loop.md`
- Create: `docs/wiki/fiscal.md`
- Create: `docs/wiki/staff-ops.md`
- Create: `docs/wiki/holding.md`
- Create: `docs/wiki/ui-feedback.md`
- Create: `docs/wiki/deploy.md`

**Interfaces:**
- Consumes: live code under `src/sim/`, `src/config/`, `src/store/`, `README.md`
- Produces: agent-readable system docs linked from INDEX

Before writing each page, skim the listed sources and correct any drift from the stubs below.

- [ ] **Step 1: Write `architecture.md`**

Sources: `src/App.tsx`, `src/store/gameStore.ts`, `package.json`, `server/index.mjs`.

Include: Vite+React+Zustand client; Node API (`server/`); `src/sim` pure game logic; `src/screens` UI; `Screen` union including menu/setup/game/tutorial/guide/…; auth + cloud saves overview; educational disclaimer pointer to README.

- [ ] **Step 2: Write `sim-loop.md`**

Sources: `src/sim/advanceMonth.ts`, `src/sim/events.ts`, balance-pass behavior.

Include: accept ops → close month → cash movements from due invoices; shocks at month open; treasury/emergency cover if cash &lt; 0 after shocks; comfort/cash parking note (`comfortLevel` cash-oriented); 12 months red → lose.

- [ ] **Step 3: Write `fiscal.md`**

Sources: `src/config/collection.ts`, `src/sim/collection.ts`, phase F24 tests.

Include: monthly F24 (IVA + withholdings); one-shot skip penalty; mora `MONTHLY_MORA_RATE = 0.01`; cartella at `MONTHS_BEFORE_CARTELLA = 6`; choices paga / rateizza / ignora; rateazione 12m @ 10% fee; enforcement aggio 8%; terminal → `loseReason: "fiscal"`.

- [ ] **Step 4: Write `staff-ops.md`**

Sources: staff pay config, `phase-staff-oneri`, projects, capacity rejects in `events.ts`.

Include: roles/capacity; payroll; December annual staff oneri; soft-cap / full capacity rejects; annual projects overview.

- [ ] **Step 5: Write `holding.md`**

Sources: `src/sim` holding/acquisitions + holding design.

Include: flip/acq as shipped — when available, cash effects, risk note. If a detail is unclear, say “see `phase-holding` tests” rather than inventing numbers.

- [ ] **Step 6: Write `ui-feedback.md`**

Sources: `notifications.ts`, GameHUD inbox, `lastUiHint` in store/events.

Include: `game.log` + mail inbox (`logReadThruId`); toasts; capacity rejects via `lastUiHint` (toast only, not log); cartella decision banner priority.

- [ ] **Step 7: Write `deploy.md`**

Sources: root `README.md` Railway section.

Include: `npm run dev` / `dev:api`; Railway Node 22; `LIQUIDAZI_SECRET`; volume `/data`; graphify regenerate one-liner; `npm run wiki:sync-help` / `wiki:sync-github`.

- [ ] **Step 8: Commit**

```bash
git add docs/wiki/*.md
git commit -m "docs: add agent system wiki pages"
```

---

### Task 3: Player help pages (`docs/wiki/help/`)

**Files:**
- Create: `docs/wiki/help/come-si-gioca.md`
- Create: `docs/wiki/help/fisco-e-f24.md`
- Create: `docs/wiki/help/personale-e-capacita.md`
- Create: `docs/wiki/help/finanza.md`
- Create: `docs/wiki/help/faq.md`

**Interfaces:**
- Produces: Italian player-facing chapters; front matter title on first `#` heading used by sync script
- Each file: one `# Title`, short sections, plain language; educational disclaimer one-liner at bottom of fiscal page

- [ ] **Step 1: Write all five help files**

`come-si-gioca.md` — cassa ≠ utile; accetta commesse; chiudi mese; 24 mesi goal / 12 mesi rosso KO; pointer to Tutorial for first run.

`fisco-e-f24.md` — banner F24; skip → sanzione; mora; cartella a 6 mesi; paga / rateizza / ignora; rischio pignoramento / sconfitta fiscale. Disclaimer: modello educativo.

`personale-e-capacita.md` — assumi; capacità piena / max 2 contratti; oneri annuali personale a fine anno.

`finanza.md` — prestiti; fondo emergenza / cassa negativa dopo shock; comfort.

`faq.md` — Q/A: non posso accettare; dove sono gli eventi (posta); differenza Tutorial vs Guida.

Use this shape (example for come-si-gioca — expand the others similarly, 15–40 lines each):

```md
# Come si gioca

## Cassa e utile
La cassa è quello che hai in banca. L'utile contabile non è liquidità.

## Il loop
1. Accetta commesse dal tabellone.
2. Chiudi il mese: entrano/escono le scadenze.
3. Guarda il Δ cassa e i banner (F24, decisioni).

## Obiettivo
Tieni la cassa in piedi. Dodici mesi di seguito in rosso = fine partita.

Il **Tutorial** nel menu è l'onboarding breve; questa **Guida** è il riferimento.
```

- [ ] **Step 2: Commit**

```bash
git add docs/wiki/help
git commit -m "docs: add player help wiki pages"
```

---

### Task 4: Sync script + `guidePages.ts` + test

**Files:**
- Create: `scripts/sync-guide-pages.mjs`
- Create: `src/content/guidePages.ts` (generated, then committed)
- Create: `src/content/guidePages.test.ts`
- Modify: `package.json` (script `wiki:sync-help`)

**Interfaces:**
- Produces:
  - `export type GuidePage = { id: string; title: string; body: string }`
  - `export const guidePages: GuidePage[]`
  - `id` = filename without `.md` (e.g. `come-si-gioca`)
  - `title` = first `# ` heading text
  - `body` = rest of file after first heading line (trim)
  - Stable order: alphabetical by `id` OR fixed order list in script — use fixed order:

```js
const ORDER = [
  "come-si-gioca",
  "fisco-e-f24",
  "personale-e-capacita",
  "finanza",
  "faq",
];
```

- [ ] **Step 1: Write failing test**

`src/content/guidePages.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { guidePages } from "./guidePages";

describe("guidePages", () => {
  it("exposes at least one chapter with id, title, body", () => {
    expect(guidePages.length).toBeGreaterThanOrEqual(1);
    const first = guidePages[0]!;
    expect(first.id).toBeTruthy();
    expect(first.title).toBeTruthy();
    expect(first.body.length).toBeGreaterThan(10);
  });

  it("starts with come-si-gioca", () => {
    expect(guidePages[0]?.id).toBe("come-si-gioca");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- src/content/guidePages.test.ts
```

Expected: cannot find module / empty file missing.

- [ ] **Step 3: Implement `scripts/sync-guide-pages.mjs`**

```js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const helpDir = path.join(root, "docs/wiki/help");
const outFile = path.join(root, "src/content/guidePages.ts");

const ORDER = [
  "come-si-gioca",
  "fisco-e-f24",
  "personale-e-capacita",
  "finanza",
  "faq",
];

const pages = ORDER.map((id) => {
  const raw = fs.readFileSync(path.join(helpDir, `${id}.md`), "utf8");
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const titleLine = lines.find((l) => l.startsWith("# "));
  if (!titleLine) throw new Error(`Missing # title in ${id}.md`);
  const title = titleLine.slice(2).trim();
  const titleIdx = lines.indexOf(titleLine);
  const body = lines.slice(titleIdx + 1).join("\n").trim();
  return { id, title, body };
});

const serialized = pages
  .map(
    (p) =>
      `  {\n    id: ${JSON.stringify(p.id)},\n    title: ${JSON.stringify(p.title)},\n    body: ${JSON.stringify(p.body)},\n  }`,
  )
  .join(",\n");

const contents = `/** Auto-generated by scripts/sync-guide-pages.mjs — do not edit by hand. */\nexport type GuidePage = { id: string; title: string; body: string };\n\nexport const guidePages: GuidePage[] = [\n${serialized}\n];\n`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, contents, "utf8");
console.log(`Wrote ${pages.length} pages → ${path.relative(root, outFile)}`);
```

- [ ] **Step 4: Wire package.json + run sync**

Add script: `"wiki:sync-help": "node scripts/sync-guide-pages.mjs"`

```bash
npm run wiki:sync-help
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npm test -- src/content/guidePages.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add scripts/sync-guide-pages.mjs src/content/guidePages.ts src/content/guidePages.test.ts package.json
git commit -m "feat: sync wiki help pages into guidePages bundle"
```

---

### Task 5: In-game Guida screen

**Files:**
- Create: `src/screens/GuideScreen.tsx`
- Modify: `src/store/gameStore.ts` — add `"guide"` to `Screen`
- Modify: `src/App.tsx` — render `GuideScreen`
- Modify: `src/screens/MenuScreen.tsx` — nav item Guida
- Optional CSS: reuse `MenuScreen.module.css` only; if layout needs a list+body row, add minimal classes to that module (`.guideLayout`, `.guideNav`, `.guideBody`) — keep visual language identical

**Interfaces:**
- Consumes: `guidePages` from `src/content/guidePages.ts`
- Produces: `screen === "guide"` reachable from menu

- [ ] **Step 1: Add `"guide"` to `Screen` union** in `gameStore.ts`

```ts
  | "tutorial"
  | "guide"
  | "gameover"
```

- [ ] **Step 2: Implement `GuideScreen.tsx`**

```tsx
import { useState } from "react";
import { guidePages } from "../content/guidePages";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

const renderBody = (body: string) =>
  body.split(/\n\n+/).map((block, i) => {
    const line = block.trim();
    if (line.startsWith("## ")) {
      return (
        <h3 key={i} className={styles.tutStep}>
          {line.slice(3)}
        </h3>
      );
    }
    return (
      <p key={i} className={styles.subtitle}>
        {line.replace(/^#+\s*/, "")}
      </p>
    );
  });

export const GuideScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const [idx, setIdx] = useState(0);
  const page = guidePages[idx] ?? guidePages[0];

  if (!page) {
    return (
      <div className={styles.menu}>
        <h2 className={styles.title}>Guida</h2>
        <p className={styles.subtitle}>Nessun capitolo. Esegui npm run wiki:sync-help.</p>
        <button type="button" className={styles.secondary} onClick={() => setScreen("menu")}>
          Torna al menu
        </button>
      </div>
    );
  }

  return (
    <div className={styles.menu}>
      <h2 className={styles.title}>Guida</h2>
      <p className={styles.subtitle}>Riferimento di gioco. Il Tutorial resta l&apos;onboarding breve.</p>

      <div className={styles.guideLayout}>
        <nav className={styles.guideNav} aria-label="Capitoli">
          {guidePages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={i === idx ? styles.guideNavOn : styles.guideNavBtn}
              onClick={() => setIdx(i)}
            >
              {p.title}
            </button>
          ))}
        </nav>
        <article className={styles.tutCard}>
          <h3 className={styles.tutStep}>{page.title}</h3>
          {renderBody(page.body)}
        </article>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => setScreen("menu")}>
          Torna al menu
        </button>
      </div>
    </div>
  );
};
```

Add to `MenuScreen.module.css` (near tutorial styles):

```css
.guideLayout {
  display: grid;
  gap: 1rem;
  width: min(52rem, 100%);
}
@media (min-width: 720px) {
  .guideLayout {
    grid-template-columns: 14rem 1fr;
    align-items: start;
  }
}
.guideNav {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.guideNavBtn,
.guideNavOn {
  text-align: left;
  border: 1px solid transparent;
  background: transparent;
  padding: 0.4rem 0.55rem;
  cursor: pointer;
  font: inherit;
  color: inherit;
}
.guideNavOn {
  border-color: currentColor;
  font-weight: 600;
}
```

- [ ] **Step 3: Wire `App.tsx`**

```tsx
import { GuideScreen } from "./screens/GuideScreen";
// ...
{screen === "guide" && <GuideScreen />}
```

Put after tutorial line. Include `"guide"` in `bareShell` if you want no header chrome like menu — **match tutorial**: tutorial is NOT in bareShell today, so Guida keeps the header too (do not add to bareShell).

- [ ] **Step 4: Menu nav**

After Tutorial `NavItem`, add:

```tsx
<NavItem icon="book" label="Guida" onClick={() => setScreen("guide")} />
```

(Reuse `book` icon; acceptable per YAGNI — no new glyph required.)

- [ ] **Step 5: Manual smoke**

```bash
npm run lint
npm test
```

Open menu → Guida → switch chapters → Torna al menu.

- [ ] **Step 6: Commit**

```bash
git add src/screens/GuideScreen.tsx src/store/gameStore.ts src/App.tsx src/screens/MenuScreen.tsx src/screens/MenuScreen.module.css
git commit -m "feat: add in-game Guida screen from wiki help"
```

---

### Task 6: Graphify refresh

**Files:**
- Create/update: `graphify-out/**` (generated)
- Modify: `.gitignore` if viz blobs are huge
- Modify: `docs/wiki/INDEX.md` / `docs/wiki/deploy.md` if regenerate commands need tightening after first run

**Interfaces:**
- Produces: usable `GRAPH_REPORT.md`; prefer also `graphify-out/wiki/` from `--wiki`
- Commit policy after size check:
  - Always commit: `GRAPH_REPORT.md`, `graphify-out/wiki/**` if small, and `graph.json` only if &lt; ~5 MB
  - Gitignore: `graphify-out/*.html`, `graphify-out/*.svg`, large binaries, `.graphify_python`

- [ ] **Step 1: Ensure graphify installed (PowerShell)**

Follow graphify skill Step 1 (detect/install `graphifyy` via uv or pip). Save interpreter to `graphify-out/.graphify_python`.

- [ ] **Step 2: Full pipeline + wiki**

From repo root (Windows):

```powershell
New-Item -ItemType Directory -Force -Path graphify-out | Out-Null
# Use detected python -m graphify or `graphify` CLI per skill
# Full extract on `.` then:
# graphify . --wiki
# Prefer --no-viz if HTML is huge and not needed in-repo
```

If the CLI requires two invocations, run extract then `--wiki` as documented by installed graphifyy `--help`.

- [ ] **Step 3: Size check + gitignore**

```powershell
Get-ChildItem -Recurse graphify-out | Sort-Object Length -Descending | Select-Object -First 20 FullName, @{N='MB';E={[math]::Round($_.Length/1MB,2)}}
```

Update `.gitignore`:

```gitignore
# graphify — keep report/wiki; drop heavy viz
graphify-out/.graphify_python
graphify-out/**/*.html
graphify-out/**/*.svg
graphify-out/**/graph.html
```

If `graph.json` &gt; 5 MB, add `graphify-out/graph.json` to gitignore and note in INDEX that agents regenerate locally.

- [ ] **Step 4: Commit selected outputs**

```bash
git add graphify-out .gitignore docs/wiki/INDEX.md docs/wiki/deploy.md
git commit -m "chore: refresh graphify graph and wiki outputs"
```

---

### Task 7: GitHub Wiki mirror script

**Files:**
- Create: `scripts/sync-github-wiki.mjs`
- Modify: `package.json` — `"wiki:sync-github": "node scripts/sync-github-wiki.mjs"`
- Modify: `docs/wiki/INDEX.md` — ensure mirror URL + sync command already present (Task 1)

**Interfaces:**
- Produces: script that clones/updates `https://github.com/Never-lab/liquidazi.wiki.git` into a temp dir (default `.wiki-mirror/`, gitignored), copies markdown from `docs/wiki/` with GitHub Wiki naming:
  - `INDEX.md` → `Home.md`
  - `architecture.md` → `architecture.md` (same)
  - `help/foo.md` → `help-foo.md` (flatten; GitHub Wiki has flat pages)
  - Write `_Sidebar.md` listing links
- Requires network + `gh` auth or git credentials
- Does **not** run in CI by default

- [ ] **Step 1: Gitignore mirror dir**

```gitignore
.wiki-mirror/
```

- [ ] **Step 2: Implement `scripts/sync-github-wiki.mjs`**

Behavior:

1. Resolve repo root.
2. Ensure `.wiki-mirror` exists; if no `.git`, `git clone https://github.com/Never-lab/liquidazi.wiki.git .wiki-mirror` (if clone fails because Wiki not enabled, print: enable Wiki in GitHub repo settings, create a starter Home page, re-run).
3. Copy files:
   - `docs/wiki/INDEX.md` → `.wiki-mirror/Home.md`
   - each `docs/wiki/*.md` except INDEX → same basename
   - each `docs/wiki/help/*.md` → `help-<id>.md` and rewrite relative links in copied Home if needed to `help-come-si-gioca` style
4. Write `_Sidebar.md` with bullet links to Home + agent pages + help pages.
5. `git -C .wiki-mirror add -A`, commit if dirty (`docs: sync from docs/wiki`), `git push`.
6. Exit non-zero on push failure.

Keep the script pragmatic: use `child_process.spawnSync` for git; use `fs` for copies. Replace in-repo relative links in Home from `(help/come-si-gioca.md)` to `(help-come-si-gioca)` when writing Home.md.

- [ ] **Step 3: package.json script**

`"wiki:sync-github": "node scripts/sync-github-wiki.mjs"`

- [ ] **Step 4: Run once (needs network + wiki enabled)**

```bash
npm run wiki:sync-github
```

If Wiki is disabled, enable it on GitHub (Settings → Features → Wikis), add empty Home, re-run. Confirm https://github.com/Never-lab/liquidazi/wiki shows Home.

- [ ] **Step 5: Commit script + gitignore (not `.wiki-mirror`)**

```bash
git add scripts/sync-github-wiki.mjs package.json .gitignore docs/wiki
git commit -m "chore: add GitHub Wiki sync from docs/wiki"
```

---

### Task 8: Verify + ROADMAP note + PR readiness

**Files:**
- Modify: `ROADMAP.md` — add Done row for wiki/Guida when complete
- Verify working tree

- [ ] **Step 1: Full verify**

```bash
npm run wiki:sync-help
npm run lint
npm test
npm run build
```

Expected: all green.

- [ ] **Step 2: ROADMAP Done table**

Add row:

```md
| Wiki + Guida in-game + graphify refresh | [plan](docs/superpowers/plans/2026-08-08-wiki-guida.md) | [spec](docs/superpowers/specs/2026-08-08-wiki-guida-design.md) |
```

- [ ] **Step 3: Commit**

```bash
git add ROADMAP.md
git commit -m "docs: mark wiki and Guida as shipped on roadmap"
```

- [ ] **Step 4: PR checklist (human/agent)**

- [ ] Guida opens from menu and shows help chapters
- [ ] `docs/wiki/INDEX.md` is agent start-here
- [ ] GitHub Wiki mirrored at least once
- [ ] graphify-out report present (or documented regenerate)
- [ ] CI green before merge

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| `docs/wiki/` curated | 1–3 |
| GitHub Wiki mirror | 7 |
| Graphify refresh + `--wiki` | 6 |
| In-game Guida from `help/` | 4–5 |
| `AGENTS.md` / docs README pointers | 1 |
| Tutorial unchanged | 5 (no Tutorial edits) |
| Sync help script | 4 |
| lint/test/build | 8 |

No TBD placeholders. Types (`GuidePage`, `guidePages`, `Screen` `"guide"`) consistent across Tasks 4–5.

/**
 * Minimal HTML for crawlable /wiki pages (AdSense publisher content).
 * Ad client/slot defaults — keep in sync with src/ui/adsense.ts.
 */
const ADS_CLIENT = "ca-pub-9163410629777799";
const ADS_SLOT = "4293531391";
export const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Escape then light markdown: **bold**, leave other text plain. */
export const inlineMd = (s) =>
  escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

/**
 * @param {string} body markdown-ish body (no leading # title)
 * @returns {string} HTML fragments
 */
export const renderWikiBody = (body) => {
  const blocks = String(body)
    .replace(/\r\n/g, "\n")
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  const out = [];
  for (const block of blocks) {
    if (block.startsWith("## ")) {
      const lines = block.split("\n");
      const heading = lines[0].slice(3).trim();
      const rest = lines.slice(1).join("\n").trim();
      out.push(`<h2>${inlineMd(heading)}</h2>`);
      if (rest) out.push(`<p>${inlineMd(rest).replace(/\n/g, "<br />")}</p>`);
      continue;
    }

    const lines = block.split("\n");
    if (lines.every((l) => /^[-*]\s+/.test(l) || l.trim() === "")) {
      const items = lines
        .filter((l) => l.trim())
        .map((l) => `<li>${inlineMd(l.replace(/^[-*]\s+/, ""))}</li>`)
        .join("");
      out.push(`<ul>${items}</ul>`);
      continue;
    }

    if (lines.every((l) => /^\d+\.\s+/.test(l) || l.trim() === "")) {
      const items = lines
        .filter((l) => l.trim())
        .map((l) => `<li>${inlineMd(l.replace(/^\d+\.\s+/, ""))}</li>`)
        .join("");
      out.push(`<ol>${items}</ol>`);
      continue;
    }

    out.push(`<p>${inlineMd(block).replace(/\n/g, "<br />")}</p>`);
  }
  return out.join("\n");
};

/**
 * @param {{ title: string, bodyHtml: string, navHtml: string, canonical: string, includeAd?: boolean }} opts
 */
export const wikiPageDocument = (opts) => {
  const { title, bodyHtml, navHtml, canonical, includeAd = true } = opts;
  const client =
    (process.env.VITE_ADSENSE_CLIENT || process.env.ADSENSE_CLIENT || ADS_CLIENT).trim() ||
    ADS_CLIENT;
  const slot =
    (process.env.VITE_ADSENSE_SLOT || process.env.ADSENSE_SLOT || ADS_SLOT).trim() || ADS_SLOT;
  const adBlock =
    includeAd && client.startsWith("ca-pub-") && /^\d+$/.test(slot)
      ? `
<aside class="ad" aria-label="Spazio advertiser">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}" crossorigin="anonymous"></script>
  <ins class="adsbygoogle"
       style="display:block"
       data-ad-client="${escapeHtml(client)}"
       data-ad-slot="${escapeHtml(slot)}"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>(window.adsbygoogle = window.adsbygoogle || []).push({});</script>
</aside>`
      : "";

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — Guida Floatdesk</title>
  <meta name="description" content="${escapeHtml(title)}: guida educativa Floatdesk (sim SRL italiana). Modello didattico, non consulenza fiscale." />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; line-height: 1.55; }
    body { margin: 0; padding: 1.25rem; max-width: 42rem; margin-inline: auto; }
    a { color: inherit; }
    nav { margin: 1rem 0 1.5rem; padding: 0.75rem 0; border-bottom: 1px solid color-mix(in srgb, currentColor 20%, transparent); }
    nav a { margin-right: 0.75rem; }
    .toc { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; margin: 0 0 1.5rem; padding: 0; list-style: none; }
    .ad { margin: 2rem 0 1rem; min-height: 90px; }
    footer { margin-top: 2.5rem; font-size: 0.9rem; opacity: 0.85; }
  </style>
</head>
<body>
  <header>
    <p><a href="/">Floatdesk</a> · <a href="/wiki">Guida</a></p>
    <h1>${escapeHtml(title)}</h1>
  </header>
  <nav aria-label="Capitoli">${navHtml}</nav>
  <article>
${bodyHtml}
  </article>
${adBlock}
  <footer>
    <p>Modello educativo semplificato — non consulenza fiscale.</p>
    <p><a href="/privacy">Privacy</a> · <a href="/termini">Termini</a> · <a href="/">Gioca</a></p>
  </footer>
</body>
</html>
`;
};

/**
 * @param {{ id: string, title: string, body: string }[]} pages
 * @param {string} currentId
 */
export const wikiNavHtml = (pages, currentId) => {
  const items = pages
    .map((p) => {
      const href = `/wiki/${p.id}`;
      const label = escapeHtml(p.title);
      if (p.id === currentId) {
        return `<li><strong aria-current="page">${label}</strong></li>`;
      }
      return `<li><a href="${href}">${label}</a></li>`;
    })
    .join("");
  return `<ul class="toc">${items}</ul>`;
};

/**
 * Index at /wiki
 * @param {{ id: string, title: string }[]} pages
 * @param {string} origin base origin or ""
 */
export const wikiIndexDocument = (pages, origin = "") => {
  const base = origin.replace(/\/$/, "");
  const list = pages
    .map(
      (p) =>
        `<li><a href="/wiki/${escapeHtml(p.id)}"><strong>${escapeHtml(p.title)}</strong></a></li>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Guida Floatdesk — wiki</title>
  <meta name="description" content="Guida e tip per Floatdesk: cassa, F24, personale e loop di gioco. Modello educativo SRL italiana." />
  <link rel="canonical" href="${escapeHtml(base ? `${base}/wiki` : "/wiki")}" />
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; line-height: 1.55; }
    body { margin: 0; padding: 1.25rem; max-width: 42rem; margin-inline: auto; }
    a { color: inherit; }
    ul { padding-left: 1.2rem; }
    footer { margin-top: 2.5rem; font-size: 0.9rem; opacity: 0.85; }
  </style>
</head>
<body>
  <header>
    <p><a href="/">Floatdesk</a></p>
    <h1>Guida Floatdesk</h1>
    <p>Riferimento di gioco e tip didattici. Il Tutorial in-app resta l’onboarding breve.</p>
  </header>
  <ul>
${list}
  </ul>
  <footer>
    <p>Modello educativo semplificato — non consulenza fiscale.</p>
    <p><a href="/privacy">Privacy</a> · <a href="/termini">Termini</a></p>
  </footer>
</body>
</html>
`;
};

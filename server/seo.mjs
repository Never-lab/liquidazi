/**
 * SEO helpers — robots.txt, sitemap.xml, ads.txt from env or defaults.
 */

/** Google AdSense certification authority id (standard for all publishers). */
export const GOOGLE_ADS_CERT_ID = "f08c47fec0942fa0";

/** Default publisher when no VITE_ADSENSE_CLIENT / ADSENSE_CLIENT is set. */
export const DEFAULT_ADSENSE_PUBLISHER = "pub-9163410629777799";

/**
 * @param {string | undefined} client ca-pub-* or pub-* from AdSense
 * @returns {string | null}
 */
export const normalizeAdsPublisher = (client) => {
  const raw = client?.trim();
  if (!raw) return null;
  const pub = raw.startsWith("ca-") ? raw.slice(3) : raw;
  return pub.startsWith("pub-") ? pub : null;
};

/**
 * @param {{ adsenseClient?: string | undefined }} [opts]
 * @returns {string}
 */
export const adsTxt = (opts = {}) => {
  const fromEnv = normalizeAdsPublisher(
    opts.adsenseClient ??
      process.env.VITE_ADSENSE_CLIENT ??
      process.env.ADSENSE_CLIENT,
  );
  const pub = fromEnv ?? DEFAULT_ADSENSE_PUBLISHER;
  return `google.com, ${pub}, DIRECT, ${GOOGLE_ADS_CERT_ID}\n`;
};

/**
 * @param {{ publicSiteUrl?: string | undefined, host?: string | undefined, forwardedProto?: string | undefined }} opts
 * @returns {string | null}
 */
export const siteOrigin = (opts = {}) => {
  const fromEnv = (opts.publicSiteUrl ?? process.env.PUBLIC_SITE_URL)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = opts.host?.split(",")[0]?.trim();
  if (!host) return null;
  const proto = (opts.forwardedProto ?? "https").split(",")[0].trim() || "https";
  return `${proto}://${host}`;
};

/**
 * @param {string | null} origin
 */
export const robotsTxt = (origin) => {
  const lines = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /ops",
    "Disallow: /ops.html",
    "",
  ];
  if (origin) lines.push(`Sitemap: ${origin}/sitemap.xml`, "");
  return lines.join("\n");
};

/**
 * SPA: homepage + legal + publisher wiki URLs.
 * @param {string | null} origin
 * @param {{ wikiIds?: string[] }} [opts]
 */
export const sitemapXml = (origin, opts = {}) => {
  const base = origin ? origin.replace(/\/$/, "") : "";
  const lastmod = new Date().toISOString().slice(0, 10);
  const wikiIds = opts.wikiIds ?? [];
  const urls = [
    "/",
    "/wiki",
    ...wikiIds.map((id) => `/wiki/${id}`),
    "/privacy",
    "/termini",
  ];
  const body = urls
    .map((path) => {
      const loc = base ? `${base}${path}` : path;
      const priority =
        path === "/" ? "1.0" : path.startsWith("/wiki") ? "0.8" : "0.4";
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
};

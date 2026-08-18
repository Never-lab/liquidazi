/**
 * SEO helpers — robots.txt + sitemap.xml from request host or PUBLIC_SITE_URL.
 */

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
 * SPA: homepage + legal URLs (client-rendered).
 * @param {string | null} origin
 */
export const sitemapXml = (origin) => {
  const base = origin ? origin.replace(/\/$/, "") : "";
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = ["/", "/privacy", "/termini"];
  const body = urls
    .map((path) => {
      const loc = base ? `${base}${path}` : path;
      const priority = path === "/" ? "1.0" : "0.4";
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

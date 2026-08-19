import { describe, expect, it } from "vitest";
import {
  adsTxt,
  DEFAULT_ADSENSE_PUBLISHER,
  GOOGLE_ADS_CERT_ID,
  normalizeAdsPublisher,
  robotsTxt,
  siteOrigin,
  sitemapXml,
} from "./seo.mjs";

describe("siteOrigin", () => {
  it("prefers PUBLIC_SITE_URL", () => {
    expect(
      siteOrigin({
        publicSiteUrl: "https://play.example/",
        host: "ignored.example",
      }),
    ).toBe("https://play.example");
  });

  it("builds from host + proto", () => {
    expect(
      siteOrigin({ host: "app.example", forwardedProto: "https" }),
    ).toBe("https://app.example");
  });

  it("returns null without env or host", () => {
    expect(siteOrigin({ publicSiteUrl: "", host: "" })).toBe(null);
  });
});

describe("adsTxt", () => {
  it("emits the standard Google AdSense line with default publisher", () => {
    expect(adsTxt()).toBe(
      `google.com, ${DEFAULT_ADSENSE_PUBLISHER}, DIRECT, ${GOOGLE_ADS_CERT_ID}\n`,
    );
  });

  it("strips ca- prefix from client id", () => {
    expect(adsTxt({ adsenseClient: "ca-pub-9163410629777799" })).toBe(
      `google.com, pub-9163410629777799, DIRECT, ${GOOGLE_ADS_CERT_ID}\n`,
    );
  });
});

describe("normalizeAdsPublisher", () => {
  it("accepts pub-* and ca-pub-*", () => {
    expect(normalizeAdsPublisher("ca-pub-111")).toBe("pub-111");
    expect(normalizeAdsPublisher("pub-111")).toBe("pub-111");
  });

  it("rejects invalid ids", () => {
    expect(normalizeAdsPublisher("")).toBe(null);
    expect(normalizeAdsPublisher("nope")).toBe(null);
  });
});

describe("robotsTxt / sitemapXml", () => {
  it("disallows ops paths", () => {
    expect(robotsTxt("https://a.example")).toContain("Disallow: /ops");
    expect(robotsTxt(null)).toContain("Disallow: /ops.html");
  });

  it("includes sitemap when origin known", () => {
    expect(robotsTxt("https://a.example")).toContain(
      "Sitemap: https://a.example/sitemap.xml",
    );
  });

  it("omits sitemap line without origin", () => {
    expect(robotsTxt(null)).not.toContain("Sitemap:");
  });

  it("emits homepage plus privacy and termini", () => {
    const xml = sitemapXml("https://a.example");
    expect(xml).toContain("<loc>https://a.example/</loc>");
    expect(xml).toContain("<loc>https://a.example/privacy</loc>");
    expect(xml).toContain("<loc>https://a.example/termini</loc>");
    expect(xml).toContain("urlset");
  });
});

import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  inlineMd,
  renderWikiBody,
  wikiIndexDocument,
  wikiNavHtml,
  wikiPageDocument,
} from "./wikiHtml.mjs";

describe("wikiHtml", () => {
  it("escapes HTML and applies bold", () => {
    expect(escapeHtml(`a<b>&"c`)).toBe("a&lt;b&gt;&amp;&quot;c");
    expect(inlineMd("la **cassa**")).toBe("la <strong>cassa</strong>");
  });

  it("renders headings, lists, and paragraphs", () => {
    const html = renderWikiBody(
      "## Titolo\n\nTesto **uno**.\n\n- **A** — x\n- B\n\n1. Primo\n2. Secondo",
    );
    expect(html).toContain("<h2>Titolo</h2>");
    expect(html).toContain("<strong>uno</strong>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<ol>");
  });

  it("builds article document with canonical and optional ad", () => {
    const html = wikiPageDocument({
      title: "FAQ",
      bodyHtml: "<p>Ciao</p>",
      navHtml: "<ul></ul>",
      canonical: "https://floatdesk.cc/wiki/faq",
      includeAd: true,
    });
    expect(html).toContain("<title>FAQ — Guida Floatdesk</title>");
    expect(html).toContain('href="https://floatdesk.cc/wiki/faq"');
    expect(html).toContain("adsbygoogle");
    expect(html).toContain("ca-pub-");
  });

  it("can omit ad block", () => {
    const html = wikiPageDocument({
      title: "FAQ",
      bodyHtml: "<p>Ciao</p>",
      navHtml: wikiNavHtml([{ id: "faq", title: "FAQ" }], "faq"),
      canonical: "/wiki/faq",
      includeAd: false,
    });
    expect(html).not.toContain("adsbygoogle");
    expect(html).toContain('aria-current="page"');
  });

  it("builds wiki index", () => {
    const html = wikiIndexDocument(
      [{ id: "faq", title: "FAQ" }],
      "https://floatdesk.cc",
    );
    expect(html).toContain('href="https://floatdesk.cc/wiki"');
    expect(html).toContain('href="/wiki/faq"');
  });
});

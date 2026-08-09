import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADSENSE_CLIENT,
  DEFAULT_ADSENSE_SLOT,
  adsenseConfig,
  adsenseFullWidth,
  ensureAdSenseScript,
} from "./adsense";

describe("adsenseConfig", () => {
  it("falls back to default AdSense client/slot when env empty", () => {
    expect(adsenseConfig({ VITE_ADSENSE_CLIENT: "", VITE_ADSENSE_SLOT: "" })).toEqual({
      client: DEFAULT_ADSENSE_CLIENT,
      slot: DEFAULT_ADSENSE_SLOT,
    });
  });

  it("allows env override", () => {
    expect(
      adsenseConfig({
        VITE_ADSENSE_CLIENT: "ca-pub-111",
        VITE_ADSENSE_SLOT: "999",
      }),
    ).toEqual({ client: "ca-pub-111", slot: "999" });
  });

  it("rejects invalid client or slot", () => {
    expect(
      adsenseConfig({
        VITE_ADSENSE_CLIENT: "pub-nope",
        VITE_ADSENSE_SLOT: "4293531391",
      }),
    ).toBe(null);
    expect(
      adsenseConfig({
        VITE_ADSENSE_CLIENT: "ca-pub-1",
        VITE_ADSENSE_SLOT: "abc",
      }),
    ).toBe(null);
  });
});

describe("ensureAdSenseScript", () => {
  it("does not stamp a custom data attribute on the Google script element", async () => {
    class FakeScriptElement {
      async = true;
      src = "";
      crossOrigin = "";
      attributes: Record<string, string> = {};
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      setAttribute(name: string, value: string) {
        this.attributes[name] = value;
      }

      getAttribute(name: string) {
        return this.attributes[name] ?? null;
      }
    }

    const injected: FakeScriptElement[] = [];
    const fakeDocument = {
      head: {
        appendChild: (node: FakeScriptElement) => injected.push(node),
      },
      createElement: () => new FakeScriptElement(),
      scripts: [] as FakeScriptElement[],
      querySelector: () => null,
    };

    Object.defineProperty(globalThis, "document", {
      value: fakeDocument,
      configurable: true,
    });

    const promise = ensureAdSenseScript(DEFAULT_ADSENSE_CLIENT);
    const inserted = injected[0];
    inserted.onload?.();

    await expect(promise).resolves.toBeUndefined();
    expect(inserted.getAttribute("data-liquidazi-adsense")).toBeNull();
    expect(inserted.src).toContain("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js");
  });
});

describe("adsenseFullWidth", () => {
  it("enables on landing and end banner only", () => {
    expect(adsenseFullWidth("landing-mid")).toBe(true);
    expect(adsenseFullWidth("end-banner")).toBe(true);
    expect(adsenseFullWidth("rail-left")).toBe(false);
    expect(adsenseFullWidth("rail-right")).toBe(false);
  });
});

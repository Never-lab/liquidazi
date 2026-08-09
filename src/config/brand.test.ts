import { describe, expect, it } from "vitest";
import { BRAND_DOMAIN, BRAND_NAME } from "./brand";

describe("brand", () => {
  it("locks public product name and domain", () => {
    expect(BRAND_NAME).toBe("Floatdesk");
    expect(BRAND_DOMAIN).toBe("floatdesk.app");
  });
});

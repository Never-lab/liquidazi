import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../sim/types";
import {
  classifyOffer,
  formatAcceptPreview,
  formatOfferTimingLine,
  previewContractTerms,
} from "./opportunityCopy";
import type { Opportunity } from "../sim/types";

const baseSale = (over: Partial<Opportunity> = {}): Opportunity => ({
  id: 1,
  kind: "sale",
  title: "Commessa · Rossi · Milano",
  net: 2100,
  expiresInMonths: 1,
  termMonths: 2,
  clientType: "private",
  marketLayer: "local",
  workforceRequired: 25,
  ...over,
});

describe("classifyOffer", () => {
  it("single for local sale without contractMonths", () => {
    expect(classifyOffer(baseSale())).toBe("single");
  });

  it("tender for municipal PA", () => {
    expect(
      classifyOffer(
        baseSale({
          title: "Appalto comunale · Comune di X",
          net: 30000,
          marketLayer: "municipal",
          clientType: "pa",
          termMonths: 12,
        }),
      ),
    ).toBe("tender");
  });

  it("contract when contractMonths >= 2", () => {
    expect(classifyOffer(baseSale({ contractMonths: 3, title: "Contratto · Rossi" }))).toBe(
      "contract",
    );
  });
});

describe("formatOfferTimingLine", () => {
  it("uses Incasso tra for single", () => {
    expect(formatOfferTimingLine(baseSale())).toMatch(/Incasso tra ~2 mesi/);
  });

  it("uses Durata for contract", () => {
    expect(formatOfferTimingLine(baseSale({ contractMonths: 3 }))).toMatch(
      /Durata 3 mesi · fattura ogni mese/,
    );
  });

  it("PA suffix for tender", () => {
    expect(
      formatOfferTimingLine(
        baseSale({ marketLayer: "municipal", clientType: "pa", termMonths: 12 }),
      ),
    ).toMatch(/PA, pagamenti lunghi/);
  });
});

describe("formatAcceptPreview", () => {
  it("single mentions one invoice and FL this month", () => {
    const s = createInitialGameState();
    expect(formatAcceptPreview(baseSale(), s)).toMatch(
      /Se accetti: 1 fattura · incasso tra ~2 mesi · −25 FL questo mese/,
    );
  });

  it("contract mentions monthly invoices and locked FL", () => {
    const s = createInitialGameState();
    const op = baseSale({ contractMonths: 3, net: 3000, workforceRequired: 30 });
    expect(formatAcceptPreview(op, s)).toMatch(/3 fatture da/);
    expect(formatAcceptPreview(op, s)).toMatch(/FL bloccate fino a chiusura/);
    expect(formatAcceptPreview(op, s)).toMatch(/max 2 contratti attivi/);
  });
});

describe("previewContractTerms", () => {
  it("matches acceptAsContract netPerMonth without warehouse bonus", () => {
    const s = createInitialGameState();
    s.supplyStock = [];
    s.supplyMonths = 0;
    const op = baseSale({ contractMonths: 3, net: 3000 });
    expect(previewContractTerms(s, op)?.netPerMonth).toBe(1000);
  });
});

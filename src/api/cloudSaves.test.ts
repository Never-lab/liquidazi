import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSaves, putSaves } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cloud saves client", () => {
  it("fetchSaves GETs /api/saves with bearer", async () => {
    const payload = {
      slots: [
        { label: "Slot 1", game: null, updatedAt: null },
        { label: "Slot 2", game: null, updatedAt: null },
        { label: "Slot 3", game: null, updatedAt: null },
      ],
      activeSlot: 1,
      preferredDifficulty: "easy",
      coachOn: false,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        expect(url).toBe("/api/saves");
        expect((opts?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
        return {
          ok: true,
          headers: { get: () => null },
          json: async () => payload,
        };
      }),
    );
    await expect(fetchSaves("tok")).resolves.toEqual(payload);
  });

  it("putSaves PUTs body", async () => {
    const body = {
      slots: [
        { label: "A", game: null, updatedAt: null },
        { label: "B", game: null, updatedAt: null },
        { label: "C", game: null, updatedAt: null },
      ],
      activeSlot: 0,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, opts?: RequestInit) => {
        expect(opts?.method).toBe("PUT");
        expect(JSON.parse(String(opts?.body))).toEqual(body);
        return { ok: true, headers: { get: () => null }, json: async () => body };
      }),
    );
    await expect(putSaves("tok", body)).resolves.toEqual(body);
  });
});
